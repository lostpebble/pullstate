---
id: action-hooks
title: Action Hooks
sidebar_label: Action Hooks
---

The second argument while creating Async Actions allows us to pass hooks for the action:

```tsx
const searchPicturesForTag = createAsyncAction(async ({ tag }) => {
  // action code
}, hooksGoHere);
```

Notice `hooksGoHere` above.

This object has three hook types which we can set for this action. Let's go through them one by one and how we might use them in this specific example.

## postActionHook()

This is a function which is run directly after your action has completed. **And most importantly**, this is also run after we hit an already completely and cached value.

This is useful for updating our app's state in a consistent manner after actions, after cached hit or direct run.

Let's quickly look at our previously explored **naive** example:

**DO NOT DO THIS!**

```tsx
const searchPicturesForTag = PullstateCore.createAsyncAction(async ({ tag }, { GalleryStore }) => {
  const result = await PictureApi.searchWithTag(tag);

  if (result.success) {
    GalleryStore.update(s => {
      s.pictures = result.pictures;
    });
    return successResult();
  }

  return errorResult([], `Couldn't get pictures: ${result.errorMessage}`);
});
```

Here we are updating our `GalleryStore` inside the action. The problem with this is that upon hitting a cached value, this action will not be run again - and hence the state inside the store will not be updated with the new pictures.

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

And now our state is guaranteed to be updated the same, no matter if we hit the cache or ran the action directly.

### API of `postActionHook`:

```tsx
postActionHook(inputs);
```

`inputs` is the only argument passed to `postActionHook` and has a structure like so:

```tsx
{ args, result, stores, context }
```

* `args` are the arguments for this run of the Async Action
* `result` is the result of the run
* `stores` is an object with all your state stores (server rendering only)
* `context` is the context of where this post action hook was run:
    
`context` helps us know how we came to be running this post action hook, and allows us to block certain scenarios where we might be running it twice. It all depends on your app and how you make use of async actions.

`context` will be set to one of the following values:

* `WATCH_HIT_CACHE`
  * Ran after a [`watch`](watching-async-action.md) or [`beckon`](beckoning-async-action.md) hit a cached value on this action
* `RUN_HIT_CACHE`
  * Ran after we called [`run`](running-async-action.md) on this action with `respectCache: true`, and the cache was hit on this action
* `SHORT_CIRCUIT`
  * Ran after first time run, and the `shortCircuit` hook finished the action pre-maturely
* `DIRECT_RUN`
  * Ran after we called [`run`](running-async-action.md) on this action with `respectCache` not set to `true`
* `BECKON_RUN`
  * Ran after a [`beckon`](beckoning-async-action.md) instigated this action for the first time