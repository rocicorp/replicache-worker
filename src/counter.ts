import { StoreImpl as KVStore } from "./kv";
import { Store as DAGStore } from "./replicache/src/dag/store";
import { Map as ProllyMap } from "./replicache/src/prolly/map";
import { initHasher } from "./replicache/src/hash";
import { initChain, readCommit } from "./commit";
import { Chunk } from "./replicache/src/dag/chunk";

export class CounterTs {
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
      const commit = await (mainHash ? readCommit(read, mainHash) : initChain(tx));
      const map = await ProllyMap.load(commit.userDataHash, read);

      // Apply requested action.
      let url = new URL(request.url);
      let current = ((await map.get("value")) ?? 0 ) as number;
      switch (url.pathname) {
      case "/increment":
        current += 1;
        map.put("value", current);
        break;
      case "/decrement":
        current -= 1;
        map.put("value", current);
        break;
      case "/":
        break;
      default:
        return new Response("Not found", {status: 404});
      }

      if (map.pendingChangedKeys().length !== 0) {
        commit.userDataHash = await map.flush(tx);
        const chunk = Chunk.new(commit, [...new Set([commit.clientsHash, commit.historyHash, commit.userDataHash])]);
        await tx.putChunk(chunk);
        await tx.setHead("main", chunk.hash);
      }

      return new Response(current.toString());
    });
  }
}

interface Env {}
