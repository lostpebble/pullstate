---
id: async-actions-other-options
title: Other Async Action Options
sidebar_label: Other Async Action Options
---

There are some other options we can pass in as the second value when creating Async Actions.

```tsx
import { createAsyncAction } from "pullstate";

const myAsyncAction = createAsyncAction(action, hooksAndOptions);
```

Besides hooks, we can also (optionally) pass in:

```
{
  subsetKey: (args: any) => string;
  forceContext: boolean;
}
```

## `subsetKey`

This is a function you can pass in, which intercepts the creation of this Async Action's "fingerprint" (or _key_).

Basically, it takes in the current arguments passed to the action and returns a fingerprint to use in the cache. This could potentially give a performance boost when you are passing in really large argument sets.

## `forceContext`

You can pass in `true` here in order to force this action to use Pullstate's context to grab its caching and execution state. This is useful if you have defined your Async Action outside of your current project, and without `PullstateCore` (see ["Creating an Async Action"](async-actions-creating.md) - under "Server-rendered app"). It basically makes an action which might seem "client-only" in its creation, force itself to act like a SSR action, using whatever Pullstate context is available.
