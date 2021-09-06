import { Map as ProllyMap } from "./replicache/src/prolly/map";
import { Write } from "./replicache/src/dag/write"
import { JSONValue } from "./replicache/src/json"
import { Chunk } from "./replicache/src/dag/chunk";
import { Read } from "./replicache/src/dag/read";

export type Commit = {
  date: string;
  operation: Init | Mutation;  // maybe also pull if that can add data?
  userDataHash: string;
  clientsHash: string;
  historyHash: string;
}

export type Mutation = {
  type: "mutation";
  clientID: string;
  name: string;
  args: JSONValue;
}

export type Init = {
  type: "init";
}

export async function readCommit(read: Read, hash: string): Promise<Commit> {
  const chunk = await read.getChunk(hash);
  if (!chunk) {
    throw new Error(`chunk ${hash} not found`);
  }
  return chunk.data as Commit;
}

export async function initChain(write: Write) {
  const map = ProllyMap.new();
  const emptyMapHash = await map.flush(write);
  const commit: Commit = {
    date: new Date().toISOString(),
    operation: { type: "init" },
    userDataHash: emptyMapHash,
    clientsHash: emptyMapHash,
    historyHash: emptyMapHash,
  };
  await write.putChunk(Chunk.new(commit, [emptyMapHash]));
  return commit;
}
