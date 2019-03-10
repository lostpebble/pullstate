### 0.7.1

* Made the `isResolved()` function safe from causing infinite loops (Async Action resolves, but the state of the store still makes `isResolved()` return false which causes a re-trigger when re-rendering - most likely happens when not checking for error states in `isResolved()`) - instead posting an error message to the console informing about the loop which needs to be fixed.

## 0.7.0

Added the options of setting an `isResolve()` synchronous checking function on Async Actions. This allows for early escape hatching (we don't need to run this async action based on the current state) and cache busting (even though we ran this Async Action before and we have a cached result, the current state indicates we need to run it again).

You can set it like so:

```typescript jsx
const loadEntity = PullstateCore.createAsyncAction<{ id: string }>(
  async ({ id }, { EntityStore }) => {
    const resp = await endpoints.getEntity({ id });

    if (resp.positive) {
      EntityStore.update(s => {
        s.viewingEntity = resp.payload;
      });
      return successResult();
    }

    return errorResult(resp.endTags, resp.endMessage);
  },
  
  // This second argument is the isResolved() function
  
  ({ id }, { EntityStore }) => {
    const { viewingEntity } = EntityStore.getRawState();

    if (viewingEntity !== null && viewingEntity.id === id) {
      return successResult();
    }

    return false;
  }
);
```

It has the same form as the regular Async Action function, injecting the arguments and the stores - but needs to return a synchronous result of either `false` or the expected end result (as if this function would have run asynchronously).

## 0.6.0

* Added "reactions" to store state. Usable like so:

```typescript jsx
UIStore.createReaction((s) => s.valueToListenForChanges, (draft, original, watched) => {
  // do something here when s.valueToListenForChanges changes
  
  // alter draft as usual - like regular update()
  
  // watched = the value returned from the first function (the selector for what to watch)
})
```
