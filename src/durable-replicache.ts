import { StoreImpl as KVStore } from "./kv";
import { Store as DAGStore } from "./replicache/src/dag/store";
import { Map as ProllyMap } from "./replicache/src/prolly/map";
import { initHasher } from "./replicache/src/hash";
import { flushCommit, getLastMutationID, initChain, loadCommit, LoadedCommit, setLastMutationID } from "./commit";
//import { MutatorDefs } from "./replicache/src/replicache";
import { WriteTransaction } from "./replicache/src/transactions";
import { Read } from "./replicache/src/dag/read";
import { PullResponse } from "./replicache/src/puller";
import { deepThaw, JSONValue } from "./replicache/src/json";
import { PushRequest } from "./replicache/src/sync/push";
import { Write } from "./replicache/src/dag/write";
import { ScanResult } from "./replicache/src/scan-iterator";
//import { ScanOptions, KeyTypeForScanOptions } from "./replicache/src/scan-options";

const mutators = {
  "increment": async (tx: WriteTransaction, delta: number) => {
    const prev = ((await tx.get("counter")) ?? 0 ) as number;
    if (delta === 0) {
      return prev;
    }
    const next = prev + delta;
    await tx.put("counter", next);
  }
};

export class DurableReplicache {
  _store: DAGStore;

  constructor(state: DurableObjectState, env: Env) {
    this._store = new DAGStore(new KVStore(state));
    state.waitUntil(initHasher());
  }

  // Handle HTTP requests from clients.
  async fetch(request: Request) {
    return await this._store.withWrite(async (tx) => {
      const read = tx.read();
      let mainHash = await read.getHead("main");
      const commit = await (mainHash ? loadCommit(read, mainHash) : initChain(tx));

      // Apply requested action.
      let url = new URL(request.url);
      switch (url.pathname) {
        case "/replicache-pull":
          return await pull(commit, read);
        case "/replicache-push":
          return await push(commit, tx, request);
      }

      await flushCommit(tx, commit);
      return new Response("ok");
    });
  }
}

// TODO(aa): It would be nice to just use the WriteTransactionImpl from inside
// Replicache, but it's difficult to do so because of all the embed goop. Once
// that is cleaned up, can replace this with the real one.
class WriteTransactionImpl implements WriteTransaction {
  constructor(map: ProllyMap) {
    this._map = map;
  }

  private _map: ProllyMap;

  async put(key: string, value: JSONValue): Promise<void> {
    this._map.put(key, value);
  }
  async del(key: string): Promise<boolean> {
    const had = await this._map.has(key);
    if (had) {
      this._map.del(key);
    }
    return had;
  }
  async get(key: string): Promise<JSONValue | undefined> {
    const v = await this._map.get(key);
    if (v === undefined) {
      return v;
    }
    return deepThaw(v);
  }
  async has(key: string): Promise<boolean> {
    return await this._map.has(key);
  }
  async isEmpty(): Promise<boolean> {
    const {done} = (this._map.entries().next()) as {done: boolean};
    return done;
  }
  scan(): ScanResult<string> {
    throw new Error("not implemented");
  }
  scanAll(): Promise<[string, JSONValue][]> {
    throw new Error("not implemented");
  }
}

async function push(commit: LoadedCommit, write: Write, request: Request): Promise<Response> {
  const pushRequest = (await request.json()) as PushRequest; // TODO: validate
  let lastMutationID = await getLastMutationID(commit, pushRequest.clientID);

  const tx = new WriteTransactionImpl(commit.userData);

  for (let mutation of pushRequest.mutations) {
    const expectedMutationID = lastMutationID + 1;

    if (mutation.id < expectedMutationID) {
      console.log(`Mutation ${mutation.id} has already been processed - skipping`);
      continue;
    }
    if (mutation.id > expectedMutationID) {
      return new Response(`Mutation ${mutation.id} is from the future`, {status: 500});
    }

    const mutator = (mutators as any)[mutation.name];
    if (!mutator) {
      console.error(`Unknown mutator: ${mutation.name} - skipping`);
    }

    try {
      await mutator(tx, mutation.args);
    } catch (e) {
      console.error(`Error execututation mutator: ${JSON.stringify(mutator)}: ${e.message}`);
    }

    lastMutationID = expectedMutationID;
  }

  await setLastMutationID(commit, pushRequest.clientID, lastMutationID);

  return new Response("OK");
}

async function pull(commit: LoadedCommit, read: Read): Promise<Response> {
  const pullResonse: PullResponse = {
    cookie: null,
    lastMutationID: 0,
    patch: [
      { op: "clear" as const },
      ...[...commit.userData.entries()].map(([key, value]) => ({
        op: "put" as const,
        key,
        value: deepThaw(value),
      }))
    ]
  };
  return new Response(JSON.stringify(pullResonse), {
    headers: {
      "Content-type": "application/javascript",
    },
  });
}

interface Env {}

