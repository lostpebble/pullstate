---
id: quick-example
title: Quick example
sidebar_label: Quick example
---
<!--
> _**Note**: Typescript is used in all examples to show off how one can integrate their interfaces for a nicer experience. Simply remove all references to `interface` and generics (e.g. `<IUIStore>`) to get pure JavaScript._
-->

## Create a state store

Let's dive right in and define and export our first **state store**:

<!--DOCUSAURUS_CODE_TABS-->
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

<!--JavaScript-->
```jsx
import { Store } from "pullstate";

export const UIStore = new Store({
  isDarkMode: true,
});
```

<!--END_DOCUSAURUS_CODE_TABS-->

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

<!--DOCUSAURUS_CODE_TABS-->
<!--TypeScript-->
```tsx
function toggleMode(s: IUIStore) {
  s.isDarkMode = !s.isDarkMode;
}

// ...in our <button> code
<button onClick={() => UIStore.update(toggleMode)}>Toggle Dark Mode</button>
```

<!--JavaScript-->
```tsx
function toggleMode(s) {
  s.isDarkMode = !s.isDarkMode;
}

// ...in our <button> code
<button onClick={() => UIStore.update(toggleMode)}>Toggle Dark Mode</button>
```

<!--END_DOCUSAURUS_CODE_TABS-->

Basically, to update our app's state all we need to do is create a function (inline arrow function or regular) which takes the current store's state and mutates it to whatever we'd like the next state to be.

## Omnipresent state updating

Something interesting to notice at this point is that we are just importing `UIStore` directly and running `update()` on it:

```tsx
import { UIStore } from "./UIStore";

// ...in our <button> code
<button onClick={() => UIStore.update(toggleMode)}>Toggle Dark Mode</button>
```

And our components are being updated accordingly. We have freed our app's state from the confines of the component! This is one of the main advantages of Pullstate - allowing us to separate our state concerns from being locked in at the component level and manage things easily at a more global level from which our components listen and react (through our `useStoreState()` hooks).