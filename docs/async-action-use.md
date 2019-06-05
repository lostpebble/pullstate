---
id: async-action-use
title: Ways to make use of Async Actions
sidebar_label: Use Async Actions
---

*For the sake of being complete in our examples, all possible return states are shown - in real application usage, you might only use a subset of these values.*

## Watch an Async Action (React hook)

```tsx
const [started, finished, result, updating] = GetUserAction.useWatch({ userId });
```

* This **React hook** "watches" the action. By watching we mean that we are not initiating this action, but only listening for when this action actually starts through some other means (tracked with `started` here), and then all its states after.
* Possible action states (if `true`):
  * `started` : This action has begun its execution.
  * `finished`: This action has finished
  * `updating`: This is a special action state which can be instigated through `run()`, which we will see further down.
* `result` is the structured result object you return from your action ([see more in action creation](async-actions-creating.md#what-to-return-from-an-action)).

## Beckon an Async Action (React hook)

```tsx
const [finished, result, updating] = GetUserAction.useBeckon({ userId });
```

* Exactly the same as `useWatch()` above, except this time we instigate this action when this hook is first called.

* Same action states, except for `started` since we are starting this action by default

`beckon()` also takes an options object as the second argument.

If you are server rendering and you would _not_ like a certain Async Action to be instigated on the server (i.e. you are fine with the action resolving itself client-side only), you can pass as an option to beckon `{ ssr: false }`.

## Run an Async Action directly

```tsx
const result = await GetUserAction.run({ userId });
```

* Run's the async action directly, just like a regular promise. Any actions that are currently being watched by means of `useWatch()`  will have `started = true` at this moment.

The return value of `run()` is the action's result object. Generally it is unimportant, and `run()` is mostly used for initiating watched actions, or initiating updates.

`run()` also takes an optional options object:

```jsx
const result = await GetUserAction.run({ userId }, options);
```

The structure of the options:

```jsx
{
  treatAsUpdate: boolean,       // default = false
  respectCache: boolean,        // default = false
  ignoreShortCircuit: boolean,  // default = false
}
```

#### `treatAsUpdate`

As seen in the hooks for `useWatch()` and `useBeckon()`, there is an extra return value called `updating` which will be set to `true` if these conditions are met:

* The action is `run()` with `treatAsUpdate: true` passed as an option.

* The action has previously completed

If these conditions are met, then `finished` shall remain `true`, and the current cached result unchanged, and `updating` will now be `true` as well. This allows the edge case of updating your UI to show that updates to the already loaded data are incoming.

#### `respectCache`

By default, when you directly `run()` an action, we ignore the cached values and initiate an entire new action run from the beginning. You can think of a `run()` as if we're running our action like we would a regular promise.

But there are times when you do actually want to hit the cache on a direct run, specifically when you are making use of a [post-action hook](async-post-action-hook.md) - where you just want your run of the action to trigger the relevant UI updates that are associated with this action's result, for example.

#### `ignoreShortCircuit`

If set to `true`, will not run the [short circuit hook](async-short-circuit-hook.md) for this run of the action.

## `InjectAsyncAction` component

You could also inject Async Action state directly into your React app without a hook.

This is particularly useful for things like watching the state of an image loading. If we take this Async Action as an example:

```tsx
async function loadImageFully(src: string) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = src;
  });
}

export const AsyncActionImageLoad = createAsyncAction<{ src: string }>(async ({ src }) => {
  await loadImageFully(src);
  return successResult();
});
```

We can inject the async state of loading an image directly into our App using `<InjectAsyncAction>`:

```tsx
<InjectAsyncAction
  type={EAsyncActionInjectType.BECKON}
  action={AsyncActionImageLoad}
  args={{ src: p.thumbnailImageUrl }}>
  {([finished]) => {
    return <div
      style={{
        opacity: finished ? 1 : 0,
        transition: "opacity 0.25s ease-in-out",
        minHeight: "5em",
        background: `url(${p.thumbnailImageUrl}) no-repeat center center`,
        backgroundSize: "cover",
      }}>
    </div>
  }}
</InjectAsyncAction>
```

We've very quickly made our App have images which will fade in once completely loaded! (You'd probably want to turn this into a component of its own and simply use the hooks - but as an example its fine for now)

You can make use of the exported `EAsyncActionInjectType` which provides you with `BECKON` or `WATCH` constant variables - or you can provide them as a strings directly `"beckon"` or `"watch"`.

## Clear an Async Action's cache

```tsx
GetUserAction.clearCache({ userId });
```

Clears all known state about this action (specific to the passed arguments).

* Any action that is still busy resolving will have its results ignored.

* Any watched actions ( `useWatch()` ) will return to their neutral state (i.e. `started = false`)

* Any beckoned actions (`useBeckon()`) will have their actions re-instigated anew.

## Clear the Async Action cache for *all* argument combinations

```tsx
GetUserAction.clearAllCache();
```

This is the same as `clearCache()`, except it will clear the cache for every single argument combination (the "fingerprints" we spoke of before) that this action has seen.