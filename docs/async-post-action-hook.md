---
id: async-post-action-hook
title: Post action hook
sidebar_label: Post action hook
---

`postActionHook()` is a function which is run directly after your action has completed. **And most importantly**, this is also run after we hit an already resolved and cached value.

This is useful for updating our app's state (mostly concerning views, organising action results into specific store state that's in the current app's focus) in a consistent manner after actions, whether we hit the cache or directly ran them for the first time.

Be sure to check out the [async hooks flow diagram](async-hooks-overview.md#async-hooks-flow-diagram) to understand better where this hook fits in.

### Updating our regular state stores with Async Action data using `postActionHook`

`postActionHook` is most often used to synchronise the asynchronous state returned after our Async Actions into our stores.

Let's quickly look at our previously explored **naive** example from [Creating an Async Action](async-actions-creating.md):

> If you are not server-rendering you can ignore `PullstateCore` here and create your actions directly with `createAsyncAction()` - you would then also be importing and using your stores directly as opposed to the stores parameter passed inside the action function

**DO NOT DO THIS!**

```tsx
const searchPicturesForTag = PullstateCore.createAsyncAction(async ({ tag }, stores) => {
  const result = await PictureApi.searchWithTag(tag);

  if (result.success) {
    stores.GalleryStore.update(s => {
      s.pictures = result.pictures;
    });
    return successResult();
  }

  return errorResult([], `Couldn't get pictures: ${result.errorMessage}`);
});
```

Here we are updating our `GalleryStore` inside the action. The problem with this is that upon hitting a cached value, this action will not be run again ([unless cache broken](async-cache-clearing.md)) - and hence the `pictures` state inside the store will not be replaced with the new pictures.

In comes `postActionHook` to save the day:

```tsx
const searchPicturesForTag = PullstateCore.createAsyncAction(
  async ({ tag }) => {
    const result = await PictureApi.searchWithTag(tag);

    if (result.success) {
      return successResult(result);
    }

    return errorResult([], `Couldn't get pictures: ${result.errorMessage}`);
  },
  {
    postActionHook: ({ result, stores }) => {
      if (!result.error) {
        stores.GalleryStore.update(s => {
          s.pictures = result.payload.pictures;
        });
      }
    },
  }
);
```

> _`stores` here is a server-rendering only argument. For client-side only rendering, import and update your stores directly_

Notice how we removed the update logic from the action itself and moved it inside the post action hook. Now our state is guaranteed to be updated the same, no matter if we hit the cache or ran the action directly.

## API of `postActionHook`:

```tsx
postActionHook(inputs) { // Do things with inputs for this async action run };
```

`inputs` is the only argument passed to `postActionHook` and has a structure like so:

```tsx
{
  args, result, stores, context;
}
```

> As per all Async Action things, `stores` here is only available as an option if you are making use of `<PullstateProvider>` in your app (server-side rendering).

- `args` are the arguments for this run of the Async Action
- `result` is the result of the run
- `stores` is an object with all your state stores (**server rendering only**)
- `context` is the context of where this post action hook was run:

`context` helps us know how we came to be running this post action hook, and allows us to block certain scenarios (and prevent duplicate runs in some scenarios). It all depends on your app and how you make use of async actions.

`context` will be set to one of the following values:

- `BECKON_HIT_CACHE`
  - Ran after a [`beckon`](async-action-use.md#beckon-an-async-action-react-hook) hit a cached value on this action (triggered after a UI change where old arguments put into `beckon()` again)
- `WATCH_HIT_CACHE`
  - Ran after a [`watch`](async-action-use.md#watch-an-async-action-react-hook) hit a cached value on this action (triggered after a UI change where old arguments put into `watch()` again)
- `RUN_HIT_CACHE`
  - Ran after we called [`run`](async-action-use.md#run-an-async-action-directly) on this action with `respectCache: true`, and the cache was hit on this action
- `DIRECT_RUN`
  - Ran after we called [`run`](async-action-use.md#run-an-async-action-directly) on this action with `respectCache` not set to `true`
- `SHORT_CIRCUIT`
  - Ran after the `shortCircuit` hook finished the action pre-maturely
- `BECKON_RUN`
  - Ran after a [`beckon`](async-action-use.md#beckon-an-async-action-react-hook) instigated this action for the first time (or after cache break)
