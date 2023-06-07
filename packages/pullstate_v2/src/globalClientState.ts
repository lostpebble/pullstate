import type { Store } from "./Store";

export const globalClientState: {
  storeOrdinal: number;
  batching: boolean;
  flushStores: {
    [storeName: number]: Store<any>;
  };
} = {
  storeOrdinal: 0,
  batching: false,
  flushStores: {},
};
