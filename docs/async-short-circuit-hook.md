---
id: async-short-circuit-hook
title: Short circuit hook
sidebar_label: Short circuit hook
---

The short circuit hook has the following API:

```tsx
shortCircuitHook({ args, stores }) => false | asyncActionResult
```

> As per all Async Action things, `stores` here is only available as an option if you are making use of `<PullstateProvider>` in your app (server-side rendering).

It should either return `false` or an Async Action result.

If you return an Async Action result, this will effectively "short-circuit" this action. The Promise for this action will not run, and the action will continue from the point directly after that: caching this result, running the [post-action hook](async-post-action-hook.md) and finishing.

Be sure to check out the [async hooks flow diagram](async-hooks-overview.md#async-hooks-flow-diagram) to understand better where this hook fits in.

## Example of short circuit

_Deciding not to run a search API when the current search term is less than 1 character - return an empty list straight away_

```tsx
shortCircuitHook: ({ args }) => {
  if (args.text.length <= 1) {
    return successResult({ posts: [] });
  }

  return false;
},
```

In this example, if we have a term that's zero or one character's in length - we short-circuit a `successResult()`, an empty list, instead of wasting our connection on a likely useless query. If the text is 2 or more characters, we continue with the action.