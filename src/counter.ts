import { StoreImpl } from "./kv";

export class CounterTs {
  _store: StoreImpl;

  constructor(state: DurableObjectState, env: Env) {
    this._store = new StoreImpl(state);
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
