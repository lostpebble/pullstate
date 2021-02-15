import { Store } from "./Store";

export const globalClientState: {
  storeOrdinal: number,
  batching: boolean;
  flushStores: {
    [storeName: number]: Store;
  };
} = {
  storeOrdinal: 0,
  batching: false,
  flushStores: {}
};
