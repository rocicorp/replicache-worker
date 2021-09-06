import { Map as ProllyMap } from "./replicache/src/prolly/map";
import { Write } from "./replicache/src/dag/write"
import { deepThaw, JSONValue, ReadonlyJSONValue } from "./replicache/src/json"
import { Chunk } from "./replicache/src/dag/chunk";
import { Read } from "./replicache/src/dag/read";

export type LoadedCommit = {
  data: CommitData;
  userData: ProllyMap;
  clientData: ProllyMap;
}

export type Client = {
  lastMutationID: number;
}

type CommitData = {
  date: string;
  operation: Init | Mutation;  // maybe also pull if that can add data?
  userDataHash: string;
  clientsHash: string;
  historyHash: string;
}

type Mutation = {
  type: "mutation";
  clientID: string;
  name: string;
  args: JSONValue;
}

type Init = {
  type: "init";
}

export async function getLastMutationID(commit: LoadedCommit, clientID: string) {
  let val = commit.clientData.get(clientID);
  if (val === null || val === undefined) {
    val = { lastMutationID: 0 }
    commit.clientData.put(clientID, val);
    return 0;
  }
  val = val as ReadonlyJSONValue;
  const client = deepThaw(val) as Client;
  return client.lastMutationID;
}

export async function setLastMutationID(commit: LoadedCommit, clientID: string, lastMutationID: number) {
  const val = (await commit.clientData.get(clientID)) as Client;
  val.lastMutationID = lastMutationID;
  commit.clientData.put(clientID, val);
}

export async function flushCommit(write: Write, commit: LoadedCommit): Promise<void> {
  commit.data.userDataHash = await commit.userData.flush(write);
  commit.data.clientsHash = await commit.clientData.flush(write);
  const chunk = Chunk.new(commit.data, [...new Set([commit.data.userDataHash, commit.data.clientsHash, commit.data.historyHash])]);
  await write.putChunk(chunk);
  await write.setHead("main", chunk.hash);
}

export async function loadCommit(read: Read, hash: string): Promise<LoadedCommit> {
  const cd = await readCommit(read, hash);
  return {
    data: cd,
    clientData: await ProllyMap.load(cd.clientsHash, read),
    userData: await ProllyMap.load(cd.userDataHash, read),
  };
}

export async function readCommit(read: Read, hash: string): Promise<CommitData> {
  const chunk = await read.getChunk(hash);
  if (!chunk) {
    throw new Error(`chunk ${hash} not found`);
  }
  return chunk.data as CommitData;
}

export async function initChain(write: Write) {
  const map = ProllyMap.new();
  const emptyMapHash = await map.flush(write);
  const commit: CommitData = {
    date: new Date().toISOString(),
    operation: { type: "init" },
    userDataHash: emptyMapHash,
    clientsHash: emptyMapHash,
    historyHash: emptyMapHash,
  };
  await write.putChunk(Chunk.new(commit, [emptyMapHash]));
  const loaded: LoadedCommit = {
    data: commit,
    clientData: map,
    userData: ProllyMap.new(),
  }
  return loaded;
}
