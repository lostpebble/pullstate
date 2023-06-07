import { globalClientState } from "./globalClientState";

interface IBatchState {
  uiBatchFunction: ((updates: () => void) => void);
}

const batchState: Partial<IBatchState> = {};

export function setupBatch({ uiBatchFunction }: IBatchState) {
  batchState.uiBatchFunction = uiBatchFunction;
}

export function batch(runUpdates: () => void) {
  if (globalClientState.batching) {
    throw new Error("Pullstate: Can't enact two batch() update functions at the same time-\n" +
      "make sure you are not running a batch() inside of a batch() by mistake.");
  }

  globalClientState.batching = true;

  try {
    runUpdates();
  } finally {
    if (batchState.uiBatchFunction) {
      batchState.uiBatchFunction(() => {
        Object.values(globalClientState.flushStores).forEach(store => store.flushBatch(true));
      });
    } else {
      Object.values(globalClientState.flushStores).forEach(store => store.flushBatch(true));
    }
    globalClientState.flushStores = {};
    globalClientState.batching = false;
  }
}
