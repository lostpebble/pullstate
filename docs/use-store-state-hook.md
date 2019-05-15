---
id: use-store-state-hook
title: useStoreState (hook)
sidebar_label: useStoreState (hook)
---

The `useStoreState()` hook to be used in your functional components has the following API interface:

<!--DOCUSAURUS_CODE_TABS-->
<!--JavaScript-->
```jsx
function useStoreState(store);
function useStoreState(store, getSubState);
```

<!--TypeScript-->
```tsx
function useStoreState<S = any>(store: Store<S>): S;
function useStoreState<S = any, SS = any>(store: Store<S>, getSubState: (state: S) => SS): SS;
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

### Return multiple values in sub-state

```tsx
const { isDarkMode, isMobile } = useStoreState(UIStore, s => ({
  isDarkMode: s.isDarkMode,
  isMobile: s.isMobile
}));
```
