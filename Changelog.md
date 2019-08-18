## 1.4.0

* Added the ability to listen for change patches on an entire store, using `Store.listenToPatches(patchListener)`.

* Fixed a bug where applying patches to stores didn't trigger the new optimized updates.
* Fixed bug with Reactions running twice

### 1.3.1

* Fixed Reactions to work with path change optimizations (see `1.2.0`). Previously only `update()` kept track of path changes - forgot to add path tracking to Reactions.

## 1.3.0

* Expanded on `getCached()`, `setCached()` and `updateCached()` on Async Actions - and made sure they can optionally notify any listeners on their cached values to re-render on changes.
* Added `clearAllUnwatchedCache()` on Async Actions for quick and easy garbage collection.
* Added `timeCached` as a passed argument to the `cacheBreakHook()`, allowing for easier cache invalidation against the time the value was last cached.

## 1.2.0

New experimental optimized updates (uses immer patches internally). To use, your state selections need to be made using paths - and make use of the new methods and components `useStoreStateOpt` and `<InjectStoreStateOpt>` respectively.

Instead of passing a function, you now pass an array of path selections. The state returned will be an array of values per each state selection path. E.g:

```ts
const [isDarkMode] = useStoreStateOpt(UIStore, [["isDarkMode"]])
```

The performance benefits stem from Pullstate not having to run equality checks on the results of your selected state and then re-render your component accordingly, but instead looks at the immer update patches directly for which paths changed in your state and re-renders the listeners on those paths.

## 1.1.0

Fixed issue with postActionHook not being called on the server for Async Actions.

Added the following methods on Async Actions:

* `setCached()`
* `updateCached()`

For a more finer-grained control of async action cache.

`updateCached()` functions exactly the same as `update()` on stores, except it only runs on a previously successfully returned cached value. If nothing is cached, nothing is run.

## 1.0.0-beta.7

Replaced `shallowEqual` from `fbjs` with the tiny package `fast-deep-equal` for object comparisons in various parts of the lib.

## 1.0.0-beta.6

Fixed the `postActionHook` to work correctly when hitting a cached value.

## 0.8.0.alpha-2

Added `IPullstateInstanceConsumable` as an export to help people who want to create code using the Pullstate stores' instance.

## 0.8.0.alpha-1

Some refactoring of the Async Actions and adding of hooks for much finer grained control:

`shortCicuitHook()`: Run checks to resolve the action with a response before it even sets out.

`breakCacheHook()`: When an action's state is being returned from the cache, this hook allows you to run checks on the current cache and your stores to decide whether this action should be run again (essentially flushing / breaking the cache).

`postActionHook()`: This hook allows you to run some things after the action has resolved, and most importantly allows code to run after each time we hit the cached result of this action as well. This is very useful for interface changes which need to change / update outside of the action code.

`postActionHook()` is run with a context variable which tells you in which context it was run, one of: CACHE, SHORT_CIRCUIT, DIRECT_RUN 

These hooks should hopefully allow even more boilerplate code to be eliminated while working in asynchronous state scenarios.

## 0.7.1

* Made the `isResolved()` function safe from causing infinite loops (Async Action resolves, but the state of the store still makes `isResolved()` return false which causes a re-trigger when re-rendering - most likely happens when not checking for error states in `isResolved()`) - instead posting an error message to the console informing about the loop which needs to be fixed.

## 0.7.0

**:warning: Replaced with async action hooks above in 0.8.0**

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
