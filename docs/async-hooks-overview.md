---
id: async-hooks-overview
title: Async hooks overview
sidebar_label: Hooks overview
---

The second argument while creating Async Actions allows us to pass hooks for the action:

```tsx
const searchPicturesForTag = createAsyncAction(async ({ tag }) => {
  // action code
}, hooksGoHere);
```

Notice `hooksGoHere` above.

This object has three hook types which we can set for this action, as follows:

```tsx
{
  postActionHook,
  shortCircuitHook,
  cacheBreakHook
}
```

## Quick overview of each

### `postActionHook({ args, result, stores, context })`

Post action hook is for consistently running state updates after an action completes for the first time or hits a cached value.

Read more on the [post action hook](async-post-action-hook.md).

### `shortCircuitHook()`

The short circuit hook is for checking the current state of your app and manually deciding that an action does not actually need to be run, and returning a replacement resolved value yourself.

Read more on the [short circuit hook](async-short-circuit-hook.md).

### `cacheBreakHook()`

This hook is run only when an action has already resolve at least once. It takes the currently cached value and decides whether we should "break" the cache and run the action again instead of returning it.