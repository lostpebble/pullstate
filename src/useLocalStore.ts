import { Store } from "./Store";
import { useRef } from "react";
import isEqual from "fast-deep-equal/es6";

/**
 * Create a local component-bound Pullstate Store, along with all the functionality that brings.
 *
 * @param initialState  As in creating a regular Store, its initial state. Or, for
 * optimization purposes, a function which calculates and returns the
 * initial state (will only be run once per initialization or dependency change).
 *
 * @param deps  If any of these dependencies change, a new Store will be created
 * and returned (with whatever initial state is being passed in at this time too)
 *
 * @returns A local component-bound Store
 */
function useLocalStore<S extends object>(initialState: (() => S) | S, deps?: ReadonlyArray<any>): Store<S> {
  const storeRef = useRef<Store<S>>();

  if (storeRef.current == null) {
    storeRef.current = new Store(typeof initialState === "function" ? (initialState as any)() : initialState);
  }

  if (deps !== undefined) {
    const prevDeps = useRef<ReadonlyArray<any>>(deps);
    if (!isEqual(deps, prevDeps)) {
      storeRef.current = new Store(typeof initialState === "function" ? (initialState as any)() : initialState);
    }
  }

  return storeRef.current;
}

export { useLocalStore };
