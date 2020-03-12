---
id: use-store-state-hook
title: useStoreState (hook)
sidebar_label: useStoreState (hook)
---

> **NB** This code can all be used in a slightly different (and perhaps more readable) way, with `YourStore.useState()`. It functions exactly the same as the methods below, except without the first `store` parameter (since we are already calling it on the store itself).

The `useStoreState()` hook to be used in your functional components has the following API interface:

<!--DOCUSAURUS_CODE_TABS-->
<!--JavaScript-->
```jsx
function useStoreState(store);
function useStoreState(store, getSubState);
function useStoreState(store, getSubState, dependencies);
```

<!--TypeScript-->
```tsx
function useStoreState<S = any>(store: Store<S>): S;
function useStoreState<S = any, SS = any>(store: Store<S>, getSubState: (state: S) => SS): SS;
function useStoreState<S = any, SS = any>(store: Store<S>, getSubState: (state: S) => SS, deps?: ReadonlyArray<any>): SS;
```

* `S` here is an interface that represents your entire store's state
* `SS` is an interface which represents a selected sub-state from your store

<!--END_DOCUSAURUS_CODE_TABS-->

Let's go through each way of using it:

## Use a store's entire state

Example:

```tsx
const allUIState = useStoreState(UIStore);

return (allUIState.isDarkMode ? <DarkApp/> : <LightApp/>);
```

* A Pullstate store is passed in as the first argument
* We do not provide any `getSubState()` selection method as the second argument
* The entire store's state is returned
* This way of using `useStoreState()` is not recommended generally, as smaller selections result in less re-rendering
* **Our component will be re-rendered every time _any value_ changes in `UIStore`**

The above (excluding store argument) applies to this method too:

```tsx
const allUIState = UIStore.useState();
```

## Use a sub-state of a store

Example:

```tsx
const isDarkMode = useStoreState(UIStore, s => s.isDarkMode);

return (isDarkMode ? <DarkApp/> : <LightApp/>);
```

* The recommended way of using `useStoreState()`, as smaller selections result in less re-rendering
* A Pullstate store is passed in as the first argument
* We provide a `getSubState()` selection method as the second argument
  * Here selecting `isDarkMode` inside our UIStore's state
* **Our component will be re-rendered only if the value of `isDarkMode` has changed in our store**

The above (excluding store argument) applies to this method too:

```tsx
const isDarkMode = UIStore.useState(s => s.isDarkMode);
```

### Return multiple values in sub-state

```tsx
const { isDarkMode, isMobile } = useStoreState(UIStore, s => ({
  isDarkMode: s.isDarkMode,
  isMobile: s.isMobile
}));

// OR

const { isDarkMode, isMobile } = UIStore.useState(s => ({
  isDarkMode: s.isDarkMode,
  isMobile: s.isMobile
}));
```

## Use a sub-state of a store, dynamically

If you ever need to grab the sub-state of the store, using some kind of dynamic value inside your `getSubState()` selector function - then you need to provide the 3rd option to `useStoreState()` - an array of dependencies.

This acts pretty much exactly the same as the `useEffect()` React hook, in that it will reassess our selection if the dependency array ever changes.

You can make use of it like so:

```tsx
const MyComponent = ({ type }) => {
  const data = useStoreState(MyStore, (s) => s[type], [type]);

  // OR

  const data = MyStore.useState((s) => s[type], [type]);

  // do stuff with data
}
```

Now whenever the value of `type` changes, Pullstate will reassess our selection and we will pull the new value from our store correctly.
