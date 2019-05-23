---
id: async-server-rendering
title: Resolving async state while server-rendering
sidebar_label: Resolve async state on the server
---

## Universal fetching

Any action that is making use of `useBeckon()` ([discussed in detail here](async-action-use.md)) in the current render tree can have its state resolved on the server before rendering to the client. This allows us to generate dynamic pages on the fly!

As per our example in ["Creating an Async Action"](async-actions-creating.md)

```tsx
// Create the action
const searchPicturesForTag = PullstateCore.createAsyncAction(async ({ tag }) => {
  const result = await PictureApi.searchWithTag(tag);

  if (result.success) {
    return successResult(result.pictures);
  }

  return errorResult([], `Couldn't get pictures: ${result.errorMessage}`);
});

// Use the action state in our components
export const PictureExample = (props: { tag: string }) => {
  const [finished, result] = searchPicturesForTag.useBeckon({ tag: props.tag });

  if (!finished) {
    return <div>Loading Pictures for tag "{props.tag}"</div>;
  }

  if (result.error) {
    return <div>{result.message}</div>;
  }

  // Inside the Gallery component we will pull our state
  // from our stores directly instead of passing it as a prop
  return <Gallery />;
};
```

So looking directly at `beckon()`:

```tsx
const [finished, result] = searchPicturesForTag.useBeckon({ tag: props.tag });
```

Using server-side async resolving, when our app hydrates for the first time on the client - `finished` will be `true` and `result` will already be resolved.

**But very importantly:** The asynchronous action code needs to be able to resolve on both the server and client - so make sure that your data-fetching functions are "isomorphic" or "universal" in nature. Examples of such functionality are the [Apollo Client](https://www.apollographql.com/docs/react/api/apollo-client.html) or [Wildcard API](https://github.com/brillout/wildcard-api).

In our example here, this API code would have to be "universally" resolvable:

```tsx
const result = await PictureApi.searchWithTag(tag);
```

## Excluding async state from resolving on the server

If you wish to have the regular behaviour of `useBeckon()` (that it instigates the async action when hit) but you don't actually want the server to resolve this asynchronous state (you're happy for it to load on the client-side only). You can pass in an option to `useBeckon()`:

```tsx
const [finished, result, updating] = GetUserAction.useBeckon({ userId }, { ssr: false });
```

Passing in `ssr: false` will cause this action to be ignored in the server asynchronous state resolve cycle.

## Resolving async state on the server

Pullstate provides two ways to resolve your async state on the server - re-rendering until all state is resolved, and resolving state by running the actions directly off your initiated Pullstate "Core" before rendering.

### Re-render until resolved

Until there is a better way to crawl through your react tree, the current easiest way to resolve async state on the server-side while rendering your React app is to simply render it multiple times. This allows Pullstate to register which async actions are required to resolve before we do our final render for the client.

Using the `instance` which we create from our `PullstateCore` object (see [Server Rendering Example](quick-example-server-rendered.md#gather-stores-under-a-core-collection)) of all our stores:

```tsx
  const instance = PullstateCore.instantiate({ ssr: true });
  
  // (1)
  const app = (
    <PullstateProvider instance={instance}>
      <App />
    </PullstateProvider>
  )

  let reactHtml = ReactDOMServer.renderToString(app);

  // (2)
  while (instance.hasAsyncStateToResolve()) {
    await instance.resolveAsyncState();
    reactHtml = ReactDOMServer.renderToString(app);
  }

  // (3)
  const snapshot = instance.getPullstateSnapshot();

  const body = `
  <script>window.__PULLSTATE__ = '${JSON.stringify(snapshot)}'</script>
  ${reactHtml}`;
```

As marked with numbers in the code:

1. Place your app into a variable for ease of use. After which, we do our initial rendering as usual - this will register the initial async actions which need to be resolved onto our Pullstate `instance`.

2. We enter into a `while()` loop using `instance.hasAsyncStateToResolve()`, which will return `true` unless there is no async state in our React tree to resolve. Inside this loop we immediately resolve all async state with `instance.resolveAsyncState()` before rendering again. This renders our React tree until all state is deeply resolved.

3. Once there is no more async state to resolve, we can pull out the snapshot of our Pullstate instance - and we stuff that into our HTML to be hydrated on the client.

### Resolve Async Actions outside of render

If you really wish to avoid the re-rendering, Async Actions are runnable on your Pullstate `instance` directly as well. This will "pre-cache" these action responses and hence not require a re-render (`instance.hasAsyncStateToResolve()` will return false).

We make use of the following API on our Pullstate instance:

```tsx
await pullstateInstance.runAsyncAction(CreatedAsyncAction, args);
```

This example makes use of `koa` and `koa-router`, we inject our instance onto our request's `ctx.state` early on in the request so we can use it along the way until finally rendering our app.

Put the Pullstate instance into the current context:

```tsx
ServerReactRouter.get("/*", async (ctx, next) => {
  ctx.state.pullstateInstance = PullstateCore.instantiate({ ssr: true });
  await next();
});
```

Create the routes, which run the various required actions:

```tsx
ServerReactRouter.get("/list-cron-jobs", async (ctx, next) => {
  await ctx.state.pullstateInstance.runAsyncAction(CronJobAsyncActions.getCronJobs, { limit: 30 });
  await next();
});

ServerReactRouter.get("/cron-job-detail/:cronJobId", async (ctx, next) => {
  const { cronJobId } = ctx.params;
  await ctx.state.pullstateInstance.runAsyncAction(CronJobAsyncActions.loadCronJob, { id: cronJobId });
  await next();
});

ServerReactRouter.get("/edit-cron-job/:cronJobId", async (ctx, next) => {
  const { cronJobId } = ctx.params;
  await ctx.state.pullstateInstance.runAsyncAction(CronJobAsyncActions.loadCronJob, { id: cronJobId });
  await next();
});
```

And render the app:

```tsx
ServerReactRouter.get("*", async (ctx) => {
  const { pullstateInstance } = ctx.state;

  // render React app with pullstate instance
  <PullstateProvider instance={pullstateInstance}>
     <App />
  </PullstateProvider>
```

> Even though you are resolving actions outside of the render cycle, **you still need to use** `<PullstateProvider>` as its the only way to provide your pre-run action's state to your app during rendering. If you didn't put that instance into the provider, `useBeckon()` can't see the result and will have queued up another run the regular way (multiple renders required).

The Async Actions you use on the server and the ones you use on the client are exactly the same - so they are really nice for server-rendered SPAs. Everything just runs and caches as needed.

You could even pre-cache a few pages on the server at once if you like (depending on how big you want the initial page payload to be), and have instant page changes on the client (and Async Actions has custom [cache busting built in](async-cache-clearing.md) to invalidate async state which is too stale - such as the user taking too long to change the page).