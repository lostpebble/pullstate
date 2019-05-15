---
id: inject-store-state
title: <InjectStoreState>
sidebar_label: <InjectStoreState>
---

The entirety of the code for `<InjectStoreState>` is as follows:

`S` = Store State (entire store's state from which you select)

`SS` = Sub State (which you are selecting to be returned in the child function):

```tsx
interface IPropsInjectStoreState<S extends any = any, SS extends any = any> {
  store: Store<S>;
  on?: (state: S) => SS;
  children: (output: SS) => React.ReactElement;
}

function InjectStoreState<S = any, SS = any>({
  store,
  on = s => s as any,
  children,
}: IPropsInjectStoreState<S, SS>): React.ReactElement {
  const state: SS = useStoreState(store, on);
  return children(state);
  // return useMemo(() => children(state), [state]);
}
```

## Props

As you can see from that, the component `<InjectStoreState>` takes 3 props:

* `store` - the store from which we are selecting the sub-state
* `on` (optional) - a function which selects the sub-state you want from the store's state
* `children` is simply the child function, as per this pattern
  * The function executes with a single argument, the sub-state which you have selected

## Example

```tsx
const GreetUser = () => {
  return (
    <div>
      <InjectStoreState store={UserStore} on={s => s.userName}>
        {userName => <span>Hi, {userName}!</span>}
      </InjectStoreState>
    </div>
  )
}
```