import React from "react";
import { Store } from "./Store";
import { useStoreStateOpt } from "./useStoreStateOpt";
import { DeepKeyOfArray, TAllPathsParameter } from "./useStoreStateOpt-types";

export interface IPropsInjectStoreStateOpt<S = any, P extends TAllPathsParameter<S> = TAllPathsParameter<S>> {
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
