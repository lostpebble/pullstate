import React from "react";
import {
  IAsyncActionBeckonOptions,
  IAsyncActionWatchOptions,
  IOCreateAsyncActionOutput,
  TPullstateAsyncBeckonResponse,
  TPullstateAsyncWatchResponse,
} from "./async";

export enum EAsyncActionInjectType {
  WATCH = "WATCH",
  BECKON = "BECKON",
}

interface IPropsInjectAsyncActionBase<A, R, T extends string> {
  action: IOCreateAsyncActionOutput<A, R, T>;
  args?: A;
}

export interface IPropsInjectAsyncActionBeckon<A = any, R = any, T extends string = string>
  extends IPropsInjectAsyncActionBase<A, R, T> {
  type: EAsyncActionInjectType.BECKON;
  options?: IAsyncActionBeckonOptions;
  children: (response: TPullstateAsyncBeckonResponse<R, T>) => React.ReactElement;
}

export interface IPropsInjectAsyncActionWatch<A = any, R = any, T extends string = string>
  extends IPropsInjectAsyncActionBase<A, R, T> {
  type: EAsyncActionInjectType.WATCH;
  children: (response: TPullstateAsyncWatchResponse<R, T>) => React.ReactElement;
  options?: IAsyncActionWatchOptions;
}

export function InjectAsyncAction (props: IPropsInjectAsyncActionBeckon | IPropsInjectAsyncActionWatch): React.ReactElement {
  if (props.type === EAsyncActionInjectType.BECKON) {
    const response = props.action.useBeckon(props.args, props.options);
    return props.children(response);
  }

  const response = props.action.useWatch(props.args, props.options);
  return props.children(response);
}
