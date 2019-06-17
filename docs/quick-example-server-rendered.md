---
id: quick-example-server-rendered
title: Quick example (server rendering)
sidebar_label: Quick example (server rendering)
---
<!--
> _**Note**: Typescript is used in all examples to show off how one can integrate their interfaces for a nicer experience. Simply remove all references to `interface` and generics (e.g. `<IUIStore>`) to get pure JavaScript._
-->

## Create a state store

Let's dive right in and define and export our first **state store**, by passing an initial state to `new Store()`:

<!--DOCUSAURUS_CODE_TABS-->
<!--JavaScript-->
```jsx
import { Store } from "pullstate";

export const UIStore = new Store({
  isDarkMode: true,
});
```

<!--TypeScript-->
```tsx
import { Store } from "pullstate";

interface IUIStore {
  isDarkMode: boolean;
}

export const UIStore = new Store<IUIStore>({
  isDarkMode: true,
});
```

<!--END_DOCUSAURUS_CODE_TABS-->

## Gather stores under a core collection

Server-rendering requires that we create a central place to reference all our stores, and we do this using `createPullstateCore()`:

```tsx
import { UIStore } from "./stores/UIStore";
import { createPullstateCore } from "pullstate";

export const PullstateCore = createPullstateCore({
  UIStore
});
```

In this example we only have a single store, but a regular app should have at least a few.

## Read our store's state

Then, in React, we can start using the state of that store using a simple hook `useStoreState()`.

For server-rendering we also need to make use of `useStores()` on`PullstateCore`, which we defined above.

> If we were creating a client-only app, we would simply import `UIStore` directly and use it, but for server-rendering we need to get `UIStore` by calling `useStores()`, which uses React's context to get our unique stores for this render / server request

```tsx
import * as React from "react";
import { useStoreState } from "pullstate";
import { PullstateCore } from "./PullstateCore";

export const App = () => {
  const { UIStore } = PullstateCore.useStores();
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

If you are not using TypeScript, or want to forgo nice types, you could also pull in your store's using `useStores()` imported directly from `pullstate`:

```tsx
import { useStoreState, useStores } from "pullstate";

  // in app
  const { UIStore } = useStores();
  const isDarkMode = useStoreState(UIStore, s => s.isDarkMode);
```

---

## Add interaction (update state)

Great, so we are able to pull our state from `UIStore` into our App. Now lets add some basic interaction with a `<button>`:

```tsx
  const { UIStore } = PullstateCore.useStores();
  const isDarkMode = useStoreState(UIStore, s => s.isDarkMode);

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

<!--DOCUSAURUS_CODE_TABS-->
<!--JavaScript-->
```tsx
function toggleMode(s) {
  s.isDarkMode = !s.isDarkMode;
}

// ...in our <button> code
<button onClick={() => UIStore.update(toggleMode)}>Toggle Dark Mode</button>
```

<!--TypeScript-->
```tsx
function toggleMode(s: IUIStore) {
  s.isDarkMode = !s.isDarkMode;
}

// ...in our <button> code
<button onClick={() => UIStore.update(toggleMode)}>Toggle Dark Mode</button>
```

<!--END_DOCUSAURUS_CODE_TABS-->

Basically, to update our app's state all we need to do is create a function (inline arrow function or regular) which takes the current store's state and mutates it to whatever we'd like the next state to be.

## Server-rendering our app

When server rendering we need to wrap our app with `<PullstateProvider>` which is a context provider that passes down fresh stores to be used on each new client request. We get these fresh stores from our `PullstateCore` above, by calling `instantiate({ ssr: true })` on it:

```tsx
import { PullstateCore } from "./state/PullstateCore";
import ReactDOMServer from "react-dom/server";
import { PullstateProvider } from "pullstate";

// A server request
async function someRequest(req) {
  const instance = PullstateCore.instantiate({ ssr: true });

  const preferences = await UserApi.getUserPreferences(id);

  instance.stores.UIStore.update(s => {
    s.isDarkMode = preferences.isDarkMode;
  });

  const reactHtml = ReactDOMServer.renderToString(
    <PullstateProvider instance={instance}>
      <App />
    </PullstateProvider>
  );

  const body = `
<script>window.__PULLSTATE__ = '${JSON.stringify(instance.getPullstateSnapshot()).replace(/\\/g, `\\\\`).replace(/"/g, `\\"`)}'</script>
${reactHtml}`;

  // do something with the generated html and send response
}
```

* Manipulate your state directly during your server's request by using the `stores` property of the instantiated object

* Notice that we pass our Pullstate core instance into `<PullstateProvider>` as `instance`

* Lastly, we need to return this state to the client somehow. We call `getPullstateSnapshot()` on the instance, stringify it, escape a couple characters, and set it on `window.__PULLSTATE__`, to be parsed and hydrated on the client.

### Quick note

This kind of code (pulling asynchronous state into your stores on the server and client):

```tsx
const preferences = await UserApi.getUserPreferences(id);

instance.stores.UIStore.update(s => {
  s.isDarkMode = preferences.isDarkMode;
});
```

Can be conceptually made much easier using Pullstate's [Async Actions](async-actions-introduction.md)!

## Client-side state hydration

```tsx
const hydrateSnapshot = JSON.parse(window.__PULLSTATE__);

const instance = PullstateCore.instantiate({ ssr: false, hydrateSnapshot });

ReactDOM.render(
  <PullstateProvider instance={instance}>
    <App />
  </PullstateProvider>,
  document.getElementById("react-mount")
);
```

We create a new instance on the client using the same method as on the server, except this time we can pass the `hydrateSnapshot` and `ssr: false`, which will instantiate our new stores with the state where our server left off.

## Client-side only updates

Something interesting to notice at this point, which can also apply with server-rendered apps, is that (for client-side only updates) we could just import `UIStore` directly and run `update()` on it:

```tsx
import { UIStore } from "./UIStore";

// ...in our <button> code
<button onClick={() => UIStore.update(toggleMode)}>Toggle Dark Mode</button>
```
And our components would be updated accordingly. We have freed our app's state from the confines of the component! This is one of the main advantages of Pullstate - allowing us to separate our state concerns from being locked in at the component level and manage things easily at a more global level from which our components listen and react (through our `useStoreState()` hooks).

We still need to make use of the `PullstateCore.useStores()` hook and `<PullstateProvider>` in order to pick up and render server-side updates and state, but once we have hydrated that state into our stores on the client side, we can interact with Pullstate stores just as we would if it were a client-only app - **but we must be sure that these actions are 100% client-side only**.
