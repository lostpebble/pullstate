import { Store } from "./Store";
import { useRef } from "react";
import { deepEqual } from "fast-equals";

function useLocalStore<S extends object>(initialState: (() => S) | S, deps?: ReadonlyArray<any>): Store<S> {
  const storeRef = useRef<Store<S>>();

  if (storeRef.current == null) {
    storeRef.current = new Store(initialState);
  }

  if (deps !== undefined) {
    const prevDeps = useRef<ReadonlyArray<any>>(deps);
    if (!deepEqual(deps, prevDeps)) {
      storeRef.current = new Store(initialState);
    }
  }

  return storeRef.current;
}

export { useLocalStore };
