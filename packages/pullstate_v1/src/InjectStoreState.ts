import React from "react";
import { Store } from "./Store";
import { useStoreState } from "./useStoreState";

export interface IPropsInjectStoreState<S extends object = any, SS extends any = any> {
  store: Store<S>;
  on?: (state: S) => SS;
  children: (output: SS) => React.ReactElement;
}

export function InjectStoreState<S extends object = any, SS = any>({
  store,
  on = s => s as any,
  children,
}: IPropsInjectStoreState<S, SS>): React.ReactElement {
  const state: SS = useStoreState(store, on);
  return children(state);
}
