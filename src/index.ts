import isOdd from 'is-odd';

// In order for the workers runtime to find the class that implements
// our Durable Object namespace, we must export it from the root module.
export { DurableReplicache } from './durable-replicache';

export default {
  async fetch(request: Request, env: Env) {
    try {
      return await handleRequest(request, env)
    } catch (e) {
      return new Response(e.message)
    }
  },
}

async function handleRequest(request: Request, env: Env) {
  let id = env.DurableReplicache.idFromName('A')
  let obj = env.DurableReplicache.get(id)
  let resp = await obj.fetch(request.url)
  let count = parseInt(await resp.text())
  let wasOdd = isOdd(count) ? 'is odd' : 'is even'

  return new Response(`${count} ${wasOdd}`)
}

interface Env {
  DurableReplicache: DurableObjectNamespace
}
