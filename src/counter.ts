import { Store, Read, Write, Value } from "./replicache/src/kv/store"

class DurableStore implements Store {
  private _state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this._state = state;
  }

  async withRead<R>(f: (read: Read) => R | Promise<R>): Promise<R> {
    // TODO: Durable Objects doesn't distinguish between read and write
    // transactions. Does the fact that it's doing optimistic concurrency
    // mean that there's no perf difference, or do we need to do something
    // clever so that reads don't get an exclusive lock.
    return await this.withWrite(f);
  }

  async withWrite<R>(f: (write: Write) => R | Promise<R>): Promise<R> {
    let r: R;
    await this._state.storage.transaction(async (tx) => {
      r = await f(new WriteImpl(tx))
    });
    return r!;
  }

  async close(): Promise<void> {
  }

  async read(): Promise<Read> {
    // can be implemented with resolvers, but not sure we need it.
    throw new Error("Method not implemented.");
  }

  write(): Promise<Write> {
    throw new Error("Method not implemented.");
  }
}

class WriteImpl implements Write {
  private _tx: DurableObjectTransaction;
  private _didCommit: boolean;

  constructor(tx: DurableObjectTransaction) {
    this._tx = tx;
    this._didCommit = false;
  }

  async has(key: string): Promise<boolean> {
    return (await this._tx.get(key)) !== undefined;
  }

  async get(key: string): Promise<Value | undefined> {
    return await this._tx.get(key);
  }

  async put(key: string, value: Value): Promise<void> {
    await this._tx.put(key, value);
  }

  async del(key: string): Promise<void> {
    await this._tx.delete(key);
  }

  async commit(): Promise<void> {
    this._didCommit = true;
  }

  release(): void {
    if (!this._didCommit) {
      this._tx.rollback();
    }
  }
}

export class CounterTs {
  _store: DurableStore;

  constructor(state: DurableObjectState, env: Env) {
    this._store = new DurableStore(state);
  }

  // Handle HTTP requests from clients.
  async fetch(request: Request) {
    return await this._store.withWrite(async (tx) => {
      // Apply requested action.
      let url = new URL(request.url);
      let current = ((await tx.get("value")) ?? 0 ) as number;
      switch (url.pathname) {
      case "/increment":
        current += 1;
        await tx.put("value", current);
        break;
      case "/decrement":
        current -= 1;
        await tx.put("value", current);
        break;
      case "/":
        break;
      default:
        return new Response("Not found", {status: 404});
      }
      return new Response(current.toString());
    });
  }
}

interface Env {}
