import React from "react";
import { Store } from "./Store";
import { TPath, useStoreStateOpt } from "./useStoreStateOpt";

export interface IPropsInjectStoreStateOpt<S = any, P extends TPath[] = TPath[]> {
  store: Store<S>;
  paths: P;
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
