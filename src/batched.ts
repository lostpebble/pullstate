/*
import { clientStores, IPullstateAllStores } from "./PullstateCore";
// import { Store, TUpdateFunction } from "./Store";

/!*type TMultiStoreUpdateMap<S extends IPullstateAllStores> = { [K in keyof S]: (updater: TUpdateFunction<S[K] extends Store<infer T> ? T : any>) => void }

export function createAction<A extends any, S extends IPullstateAllStores = IPullstateAllStores>(
  batchUpdater: (
    update: TMultiStoreUpdateMap<S>,
    args: A
  ) => void,
  stores: S = clientStores.stores as S
): (args: A) => void {
  const update: TMultiStoreUpdateMap<S> = {} as TMultiStoreUpdateMap<S>;
  const updatedStores = new Set<string>();

  for (const store of Object.keys(stores)) {
    update[store as keyof S] = (updater) => {
      updatedStores.add(store);
      stores[store].batch(updater);
    };
  }

  return (args: A, updateMap = update, updatedSet = updatedStores) => {
    updatedSet.clear();
    batchUpdater(updateMap, args);
    for (const store of updatedSet) {
      stores[store].flushBatch();
    }
  }
}*!/

export function createBatchAction<A extends any>(batchedUpdates: (args: A) => void): (args: A) => void {
  return (args: A, stores: IPullstateAllStores = clientStores.stores) => {
    batchedUpdates(args);
    for (const store in Object.keys(stores)) {
      stores[store].flushBatch();
    }
  }
}
*/
