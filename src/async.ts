import { IPullstateAllStores, PullstateContext } from "./PullstateController";
import { useContext, useEffect, useState } from "react";
import { TPullstateUpdateListener } from "./Store";

export interface IPullstateAsyncRegister<R> {
  [key: string]: {
    error: boolean;
    resp: R;
    listeners: TPullstateUpdateListener[];
  };
}

export interface IPullstateAsyncCache {
  register: IPullstateAsyncRegister<any>;
  actions: {
    [key: string]: () => Promise<any>;
  };
}

type TPullstateAsyncAction<A = any, S extends IPullstateAllStores = IPullstateAllStores, R = any> = (args?: A, stores?: S) => Promise<R>;

type TAsyncActionWatch<A, R> = (args?: A) => [boolean, boolean, R];
type TAsyncActionRun<A, R> = (args?: A) => Promise<[boolean, R]>;
type TAsyncActionClearCache<A> = (args?: A) => void;

export interface IOCreateAsyncActionOutput<A = any, R = any> {
  watch: TAsyncActionWatch<A, R>;
  run: TAsyncActionRun<A, R>;
  clearCache: TAsyncActionClearCache<A>;
}

const clientOnlyCache: IPullstateAsyncCache = {
  register: {},
  actions: {},
};

let asyncCreationOrdinal = 0;

export function createAsyncAction<A, R, S extends IPullstateAllStores = IPullstateAllStores>(
  action: TPullstateAsyncAction<A, S, R>,
  defaultArgs: A = {} as A,
  stores?: S,
): IOCreateAsyncActionOutput {
  const ordinal = asyncCreationOrdinal++;
  console.log(`Creating async action with ordinal: ${ordinal} - action name: ${action.name}`);

  const watch: TAsyncActionWatch<A, R> = (args = defaultArgs) => {
    const key = `${ordinal}-${JSON.stringify(args)}`;
    const [response, setResponse] = useState<{ finished: boolean; error: boolean; resp: R }>({ finished: true, error: false, resp: null });

    let shouldUpdate = true;

    const pullstateContext = useContext(PullstateContext);
    const asyncCache: IPullstateAsyncCache = pullstateContext === null ? clientOnlyCache : pullstateContext._asyncCache;
    const useStores = pullstateContext === null ? stores : pullstateContext.stores;

    function onActionComplete() {

    }

    useEffect(() => {
        asyncCache.register[key].listeners.push(onActionComplete);

        return () => {
          asyncCache.register[key].listeners.filter(f => f !== onActionComplete);
          shouldUpdate = false;
        };
      }
    );

    if (asyncCache.register.hasOwnProperty(key)) {
      console.log(`Pullstate Async: [${key}] Already been run - do nothing`);
      return [
        true,
        asyncCache.register[key].error,
        asyncCache.register[key].resp as R,
      ];
    } else {
      console.log(`Pullstate Async: [${key}] NEW async action`);
      if (typeof window === "undefined") {
        // on the server
        asyncCache.actions[key] = () => action(args, useStores as S);
      } else {
        // on the client
        action(args, useStores as S)
          .then(resp => {
            if (shouldUpdate) {
              asyncCache.register[key] = { resp, error: false };
              setResponse({ finished: true, error: false, resp });
            }
          })
          .catch(() => {
            if (shouldUpdate) {
              asyncCache.register[key] = { resp: null, error: true };
              setResponse({ finished: false, error: true, resp: null });
            }
          });
      }
    }

    return [response.finished, response.error, response.resp];
  };
  const run: TAsyncActionRun<A, R> = async (args = defaultArgs) => {

  };
  const clearCache: TAsyncActionClearCache<A> = (args = {} as A) => {

  };

  return {
    watch,
    run,
    clearCache,
  };
}
