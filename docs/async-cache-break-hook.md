---
id: async-cache-break-hook
title: Cache break hook
sidebar_label: Cache break hook
---

The cache break hook has the following API:

```tsx
cacheBreakHook({ args, result, stores }) => true | false
```

> As per all Async Action things, `stores` here is only available as an option if you are making use of `<PullstateProvider>` in your app (server-side rendering).

It should return `true` or `false`.

This action will only run if a cached result is found for this action (i.e. this action has completed already in the past). If you return an `true`, this will "break" the currently cached value for this action. This action will now run again.

Be sure to check out the [async hooks flow diagram](async-hooks-overview.md#async-hooks-flow-diagram) to understand better where this hook fits in.

## Example of a cache break hook

_Deciding to not used the cached result from a search API when the search results are more than 30 seconds old_

```tsx
const THIRTY_SECONDS = 30 * 1000;

// The cache break hook in your action creator

cacheBreakHook: ({ result }) =>
      !result.error && result.payload.cacheTime + THIRTY_SECONDS < Date.now(),
```

In this example want to break the cached result if it is not an error, and the `cacheTime` is older than 30 seconds from `Date.now()`. You may ask where we are getting `cacheTime` from - well we simply set it ourselves in our action response:

```tsx
return successResult({ posts: postSnippets, cacheTime: Date.now() });
```

Pullstate gives you the ability to create customized caching techniques as you see fit. Here we simply set `cacheTime` on our result payload, and check that in our `cacheBreakHook`. Potentially, you might want to check other variables set in your stores perhaps - or even use one of the passed arguments to affect caching length.

Be sure to check out [the section on cache clearing](async-cache-clearing.md) for other ways to deal with cache invalidation.