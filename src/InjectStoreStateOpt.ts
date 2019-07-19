import React from "react";
import { Store } from "./Store";
import { useStoreStateOpt } from "./useStoreStateOpt";

export interface IPropsInjectStoreStateOpt<S extends any = any> {
  store: Store<S>;
  paths: (string|number)[][];
  children: (output: any[]) => React.ReactElement;
}

export function InjectStoreStateOpt<S = any>({
  store,
  paths,
  children,
}: IPropsInjectStoreStateOpt<S>): React.ReactElement {
  const state = useStoreStateOpt(store, paths);
  return children(state);
}
