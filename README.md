<p align="center">
  <img src="https://github.com/lostpebble/pullstate/raw/master/graphics/logo-newest.png" alt="Pullstate" />
</p>

### pullstate

> Ridiculously simple state stores with performant retrieval anywhere
> in your React tree using the wonderful concept of React hooks!

* ~7KB minified and gzipped! (excluding Immer and React)
* Built with Typescript, providing a great dev experience if you're using it too
* Uses [immer](https://github.com/mweststrate/immer) for state updates - easily and safely mutate your state directly!
* **NEW** - [Create async actions](https://lostpebble.github.io/pullstate/docs/async-actions-introduction) and use React hooks or `<Suspense/>` to have complete control over their UI states!

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

> This is taken directly from [the documentation site](https://lostpebble.github.io/pullstate/docs/quick-example), to give you a quick overview of Pullstate here on github. Be sure to check out the site to learn more.

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

Then, in React, we can start using the state of that store using a simple hook `useState()`:

```tsx
import * as React from "react";
import { UIStore } from "./UIStore";

export const App = () => {
  const isDarkMode = UIStore.useState(s => s.isDarkMode);

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

The argument to `useState()` over here (`s => s.isDarkMode`), is a selection function that ensures we select only the state that we actually need for this component. This is a big performance booster, as we only listen for changes (and if changed, re-render the component) on the exact returned values - in this case, simply the value of `isDarkMode`.

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
