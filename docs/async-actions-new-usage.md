---
id: async-action-new-use
title: (Latest) Ways to make use of Async Actions
sidebar_label: Use Async Actions (New)
---

There are two main hooks to make use of Async Actions inside your components.

## `MyAsyncAction.use()`

Use this method when you want to one of two things:

* Pass in some arguments and start the action execution immidiately, watching its state and result
* Pass in some arguments and watch the state of the action's execution whenever it is finally executed on those arguments

This method returns an object with the execution state and some convenience functions, that looks like this:

```ts
{
    // state
    isLoading: boolean;
    isFinished: boolean;
    isUpdating: boolean;
    isStarted: boolean;
    isSuccess: boolean;
    isFailure: boolean;
    error: boolean;
    endTags: string[];
    message: string;
    raw: InternalAsyncResponse;
    payload: any;
  
    // convenience functions
    execute: async (runOptions) => RunResponse;
    clearCached: () => void;
    updateCached: (updater, options) => void;
    setCached: (result, options) => void;
    setCachedPayload: (payload, options) => void;
    renderPayload: (payload) => React.ReactElement;
}
```

