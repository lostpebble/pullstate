<p align="center">
  <img src="https://github.com/lostpebble/pullstate/raw/master/graphics/logo-newest.png" alt="Pullstate" />
</p>

### pullstate

> Ridiculously simple state stores with performant retrieval anywhere
> in your React tree using the wonderful concept of React hooks!

* ~4KB minified and gzipped! (excluding Immer and React)
* Built with Typescript, providing a great dev experience if you're using it too
* Provides `<InjectStoreState>` component
* Uses [immer](https://github.com/mweststrate/immer) for state updates - easily and safely mutate your state directly!
* **NEW** - [Create async actions](https://lostpebble.github.io/pullstate/docs/async-actions-introduction) and use React hooks to watch their state, or use `<InjectAsyncAction>`. Pullstate's version of React suspense!

_Originally inspired by the now seemingly abandoned library - [bey](https://github.com/jamiebuilds/bey). Although substantially
different now- with Server-side rendering and Async Actions built in! Bey was in turn inspired by
[react-copy-write](https://github.com/aweary/react-copy-write)._

Try out a quick example:

[![Edit Pullstate Client-only Example](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/myvj8zzypp)

### 🎉 **[New documentation site is live!](https://lostpebble.github.io/pullstate/)**

* [Installation](https://lostpebble.github.io/pullstate/docs/installation)
* [Quick example](https://lostpebble.github.io/pullstate/docs/quick-example)
* [Quick example - Server rendering](https://lostpebble.github.io/pullstate/docs/quick-example-server-rendered)
* [Async Actions](https://lostpebble.github.io/pullstate/docs/async-actions-introduction)
  * [Creation](https://lostpebble.github.io/pullstate/docs/async-actions-creating)
  * [Usage](https://lostpebble.github.io/pullstate/docs/async-action-use)
  * [Async action hooks](https://lostpebble.github.io/pullstate/docs/async-hooks-overview)

---

# **Let's dive right in**

This is taken directly from [the documentation site](https://lostpebble.github.io/pullstate/docs/quick-example), to give you a quick overview of Pullstate here on github. Be sure to check out the site to learn more.

To start off, install `pullstate`.

```bash
yarn add pullstate
```

## Create a store

Define the first **state store**, by passing an initial state to `new Store()`:

<!--JavaScript-->
```jsx
import { Store } from "pullstate";

export const UIStore = new Store({
  isDarkMode: true,
});
```

## Read our store's state

Then, in React, we can start using the state of that store using a simple hook `useStoreState()`:

```tsx
import * as React from "react";
import { useStoreState } from "pullstate";
import { UIStore } from "./UIStore";

export const App = () => {
  const isDarkMode = useStoreState(UIStore, s => s.isDarkMode);

  return (
    <div
      style={{
        background: isDarkMode ? "black" : "white",
        color: isDarkMode ? "white" : "black",
      }}>
      <h1>Hello Pullstate</h1>
    </div>
  );
};
```

The second argument to `useStoreState()` over here (`s => s.isDarkMode`), is a selection function that ensures we select only the state that we actually need for this component. This is a big performance booster, as we only listen for changes (and if changed, re-render the component) on the exact returned values - in this case, simply the value of `isDarkMode`.

---

## Add interaction (update state)

Great, so we are able to pull our state from `UIStore` into our App. Now lets add some basic interaction with a `<button>`:

```tsx
  return (
    <div
      style={{
        background: isDarkMode ? "black" : "white",
        color: isDarkMode ? "white" : "black",
      }}>
      <h1>Hello Pullstate</h1>
      <button
        onClick={() =>
          UIStore.update(s => {
            s.isDarkMode = !isDarkMode;
          })
        }>
        Toggle Dark Mode
      </button>
    </div>
  );
```

Notice how we call `update()` on `UIStore`, inside which we directly mutate the store's state. This is all thanks to the power of `immer`, which you can check out [here](https://github.com/immerjs/immer).

Another pattern, which helps to illustrate this further, would be to actually define the action of toggling dark mode to a function on its own:

<!--JavaScript-->
```tsx
function toggleMode(s) {
  s.isDarkMode = !s.isDarkMode;
}

// ...in our <button> code
<button onClick={() => UIStore.update(toggleMode)}>Toggle Dark Mode</button>
```

Basically, to update our app's state all we need to do is create a function (inline arrow function or regular) which takes the current store's state and mutates it to whatever we'd like the next state to be.

## Omnipresent state updating

Something interesting to notice at this point is that we are just importing `UIStore` directly and running `update()` on it:

```tsx
import { UIStore } from "./UIStore";

// ...in our <button> code
<button onClick={() => UIStore.update(toggleMode)}>Toggle Dark Mode</button>
```

And our components are being updated accordingly. We have freed our app's state from the confines of the component! This is one of the main advantages of Pullstate - allowing us to separate our state concerns from being locked in at the component level and manage things easily at a more global level from which our components listen and react (through our `useStoreState()` hooks).
<--
# Async Actions

Jump straight into an example here:

[![Edit Pullstate Async](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/84x92qq2k2?fontsize=14)

More often than not, our stores do not exist in purely synchronous states. We often need to perform actions asynchronously, such as pulling data from an API.

* It would be nice to have an easy way to keep our view up to date with the state of these actions **without putting too much onus on our stores directly** which quickly floods them with variables such as `userLoading`, `updatingUserInfo`, `userLoadError` etc - which we then have to make sure we're handling for each unique situation - it just gets messy quickly.

* Having our views naturally listen for and initiate asynchronous state gets rid of a lot of boilerplate which we would usually need to write in `componentDidMount()` or the `useEffect()` hook.

* There are also times where we are **server-rendering** and we would like to resolve our app's asynchronous state before rendering to the user. And again, without having to run something manually (and deal with all the edge cases manually too) like we saw in the server rendering section above:

```jsx
const user = await UserApi.getUser(id);

instance.stores.UserStore.update(userStore => {
  userStore.userName = user.name;
});
```

:point_up: And that's without dealing with errors and the like...

Pullstate provides a much easier way to do this through **Async Actions**.

## Create an Async Action

If you are creating a client-only app, you can create an async action like so:

```tsx
import { createAsyncAction } from "pullstate";
import { UserStore } from "./stores/UserStore";

const GetUserAction = createAsyncAction(async ({ userId }) => {
  const user = await UserApi.getUser(userId);
  UserStore.update(s => {
    s.user = user;
  });
  return successResult();
});
```

If you are using server rendering, create them like this (using your `PullstateCore` object with all your stores):

```tsx
const GetUserAction = PullstateCore.createAsyncAction(async ({ userId }, { UserStore }) => {
  const user = await UserApi.getUser(userId);
  UserStore.update(s => {
    s.user = user;
  });
  return successResult();
});
```

Let's look closer at the actual async function which is passed in to `createAsyncAction()`:

* The first argument to this function is important in that it not only represents the variables passed into your action for each asynchronous scenario, but these arguments create a **unique "fingerprint"** within this action whenever it is called which helps Pullstate keep track of the state of different executions of this action.

* In that sense, these actions should be somewhat "pure" per the arguments you pass in - in this case, we pass an object containing `userId` and we expect to return exactly that user from the API.

* :warning: Pulling `userId` from somewhere else, such as directly within your store, will cause different actions for different user ids to be seen as the same! (because their "fingerprints" are the same) This will cause caching issues - so **always have your actions defined with as many arguments which identify that single action as possible**! (But no more than that - be as specific as possible while being as brief as possible)

* The function should return a certain structured result. Pullstate provides convenience methods for this, depending on whether you want to return an error or a success.

```typescript jsx
// The structure of the "result" object returned by your hooks
{
  error: boolean;
  message: string;
  tags: string[];
  payload: any;
}
```

Convenience function for **success** (will set `{ error: false }` on the result object) e.g:

```typescript jsx
//     successResult(payload = null, tags = [], message = "")
return successResult(somePayload);
```

Convenience function for **error** (will set `{ error: true }` on the result object) e.g:

```typescript jsx
//     errorResult(tags = [], message = "")
return errorResult(["NO_USER_FOUND"], "No user found in database by that name");
```

* The `tags` property here is a way to easily react to more specific error states in your UI. The default error result, when you haven't caught the errors yourself, will return with a single tag: `["UNKNOWN_ERROR"]`. If you return an error with `errorResult()`, the tag `"RETURNED_ERROR"` will automatically be added to tags.

* **The Pullstate Way** :tm:, is keeping your state in your stores as much as possible - hence we don't actually return the new user object, but update our `UserStore` along the way in the action (this also means that during a single asynchronous action, we can actually have our app update and react multiple times).

Notice that the async function looks slightly different when using server-side rendering:

* Your Pullstate stores are passed into the function as the second argument - you must use these stores directly because any asynchrounous state that we need to resolve on the server before rendering needs to use the stores provided by `<PullstateProvider>`, which will be these.

## Using Async Actions

There are five ways to use Async Actions in your code:

*For the sake of being complete in our examples, all possible return states are shown - in real application usage, you might only use a subset of these values.*

### Watch an Async Action (React hook)

```tsx
const [started, finished, result, updating] = GetUserAction.useWatch({ userId });
```

* This **React hook** "watches" the action. By watching we mean that we are not initiating this action, but only listening for when this action actually starts through some other means (tracked with `started` here), and then all its states after.
* Possible action states (if `true`):
  * `started` : This action has begun its execution.
  * `finished`: This action has finished
  * `updating`: This is a special action state which can be instigated through `run()`, which we will see further down.
* `result` is the structured result object you return from your action (see above in action creation).

### Beckon an Async Action (React hook)

```tsx
const [finished, result, updating] = GetUserAction.useBeckon({ userId });
```

* Exactly the same as `useWatch()` above, except this time we instigate this action when this hook is first called.

* Same action states, except for `started` since we are starting this action by default

### Run an Async Action directly

```tsx
const result = await GetUserAction.run({ userId });
```

* Run's the async action directly, just like a regular promise. Any actions that are currently being watched by means of `useWatch()`  will have `started = true` at this moment.

There are options (currently only one) which you can pass into this function too:

```jsx
const result = await GetUserAction.run({ userId }, { treatAsUpdate: true });
```

As seen in the hooks for `useWatch()` and `useBeckon()`, there is an extra return value called `updating` which will be set to `true` under certain conditions:

* The action is `run()` with `treatAsUpdate: true` passed as an option.

* The action has previously completed

If these conditions are met, then `finished` shall remain `true`, but `updating` will now be `true` as well. This allows the edge case of updating your UI to show that updates to the already loaded data are incoming.

Generally, the return value is unimportant here, and `run()` is mostly used for initiating watched actions, or initiating updates.

### Clear an Async Action's cache

```tsx
GetUserAction.clearCache({ userId });
```

Clears all known state about this action (specific to the passed arguments).

* Any action that is still busy resolving will have its results ignored.

* Any watched actions ( `useWatch()` ) will return to their neutral state (i.e. `started = false`)

* Any beckoned actions (`useBeckon()`) will have their actions re-instigated anew.

### Clear the Async Action cache for *all* argument combinations

```tsx
GetUserAction.clearAllCache();
```

This is the same as `clearCache()`, except it will clear the cache for every single argument combination (the "fingerprints" we spoke of above) that this action has seen.

## Resolving state on the server

Any action that is making use of `useBeckon()` in the current render tree can have its state resolved on the server before rendering to the client. This allows us to generate dynamic pages on the fly!

#### **Important note** :grey_exclamation:

**The asynchronous action code needs to be able to resolve on both the server and client** - so make sure that your data-fetching functions are "isomorphic" or "universal" in nature. Examples of such functionality are the [Apollo Client](https://www.apollographql.com/docs/react/api/apollo-client.html) or [Wildcard API](https://github.com/brillout/wildcard-api).

Until there is a better way to crawl through your react tree, the current way to resolve async state on the server-side while rendering your React app is to simply render it multiple times. This allows Pullstate to register which async actions are required to resolve before we do our final render for the client.

Using the `instance` which we create from our `PullstateCore` object of all our stores:

```typescript jsx
  const instance = PullstateCore.instantiate({ ssr: true });
  
  // (1)
  const app = (
    <PullstateProvider instance={instance}>
      <App />
    </PullstateProvider>
  )

  let reactHtml = ReactDOMServer.renderToString(app);

  // (2)
  while (instance.hasAsyncStateToResolve()) {
    await instance.resolveAsyncState();
    reactHtml = ReactDOMServer.renderToString(app);
  }

  // (3)
  const snapshot = instance.getPullstateSnapshot();

  const body = `
  <script>window.__PULLSTATE__ = '${JSON.stringify(snapshot)}'</script>
  ${reactHtml}`;
```

As marked with numbers in the code:

1. Place your app into a variable for ease of use. After which, we do our initial rendering as usual - this will register the initial async actions which need to be resolved onto our Pullstate `instance`.

2. We enter into a `while()` loop using `instance.hasAsyncStateToResolve()`, which will return `true` unless there is no async state in our React tree to resolve. Inside this loop we immediately resolve all async state with `instance.resolveAsyncState()` before rendering again. This renders our React tree until all state is deeply resolved.

3. Once there is no more async state to resolve, we can pull out the snapshot of our Pullstate instance - and we stuff that into our HTML to be hydrated on the client.

### Selectively resolving async state on the server

If you wish to have the regular behaviour of `useBeckon()` but you don't actually want the server to resolve this asynchronous state (you're happy for it to load on the client-side only). You can pass in an option to `useBeckon()`:

```tsx
const [finished, result, updating] = GetUserAction.useBeckon({ userId }, { ssr: false });
```

Passing in `ssr: false` will cause this action to be ignored in the server asynchronous state resolve cycle.
-->