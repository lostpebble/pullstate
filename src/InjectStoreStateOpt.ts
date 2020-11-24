import React from "react";
import { Store } from "./Store";
import { useStoreStateOpt } from "./useStoreStateOpt";
import { DeepTypeOfArray, TAllPathsParameter } from "./useStoreStateOpt-types";

export interface IPropsInjectStoreStateOpt<
  S extends any = any,
  P extends TAllPathsParameter<S> = TAllPathsParameter<S>,
  O extends [
    DeepTypeOfArray<S, P[0]>,
    DeepTypeOfArray<S, P[1]>,
    DeepTypeOfArray<S, P[2]>,
    DeepTypeOfArray<S, P[3]>,
    DeepTypeOfArray<S, P[4]>,
    DeepTypeOfArray<S, P[5]>,
    DeepTypeOfArray<S, P[6]>,
    DeepTypeOfArray<S, P[7]>,
    DeepTypeOfArray<S, P[8]>,
    DeepTypeOfArray<S, P[9]>,
    DeepTypeOfArray<S, P[10]>
  ] = [
    DeepTypeOfArray<S, P[0]>,
    DeepTypeOfArray<S, P[1]>,
    DeepTypeOfArray<S, P[2]>,
    DeepTypeOfArray<S, P[3]>,
    DeepTypeOfArray<S, P[4]>,
    DeepTypeOfArray<S, P[5]>,
    DeepTypeOfArray<S, P[6]>,
    DeepTypeOfArray<S, P[7]>,
    DeepTypeOfArray<S, P[8]>,
    DeepTypeOfArray<S, P[9]>,
    DeepTypeOfArray<S, P[10]>
  ]
> {
  store: Store<S>;
  paths: P;
  children: (output: O) => React.ReactElement;
}

export function InjectStoreStateOpt<
  S extends any,
  P extends TAllPathsParameter<S>,
  O extends [
    DeepTypeOfArray<S, P[0]>,
    DeepTypeOfArray<S, P[1]>,
    DeepTypeOfArray<S, P[2]>,
    DeepTypeOfArray<S, P[3]>,
    DeepTypeOfArray<S, P[4]>,
    DeepTypeOfArray<S, P[5]>,
    DeepTypeOfArray<S, P[6]>,
    DeepTypeOfArray<S, P[7]>,
    DeepTypeOfArray<S, P[8]>,
    DeepTypeOfArray<S, P[9]>,
    DeepTypeOfArray<S, P[10]>
  ]
>({ store, paths, children }: IPropsInjectStoreStateOpt<S, P, O>): React.ReactElement {
  const state = useStoreStateOpt(store, paths) as O;
  return children(state);
}
