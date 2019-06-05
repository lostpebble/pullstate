---
id: async-cache-clearing
title: Async cache clearing
sidebar_label: Cache clearing
---

A big part of working with asynchronous data is being able to control the cache.

There's even a famous quote for it:

> _"There are only two hard things in Computer Science: cache invalidation and naming things."_
> 
> -**Phil Karlton**

To try and make at least one of those things a bit easier for you, Pullstate provides a few different ways of dealing with cache invalidation with your async actions.

## Direct cache invalidation

There are two "direct" ways to invalidate the cache for an action:

### [Clear the cache for specific arguments (fingerprint)](async-action-use.md#clear-an-async-action-s-cache)

```tsx
GetUserAction.clearCache({ userId });
```

### [Clear the cache completely for an action (all combinations of arguments)](async-action-use.md#clear-the-async-action-cache-for-all-argument-combinations)

```tsx
GetUserAction.clearAllCache();
```

## Conditional cache invalidation

There is also a way to check and clear the cache automatically, using something called a `cacheBreakHook` - which runs when an action is called which already has a cached result, and decides whether the current cached result is still worthy. Check out the [async hooks flow diagram](async-hooks-overview.md#async-hooks-flow-diagram) to better understand how this hook fits in.

### [Cache Break Hook](async-cache-break-hook.md)

```tsx
cacheBreakHook: ({ result, args }) => true | false
```