import { Store, useStoreStateOpt } from "../../src";
import { ITestUIStore } from "./testStores/TestUIStore";
// import {} from ""

const ListenerParent = ({ store }: { store: Store<ITestUIStore> }) => {
  const [count, internal] = useStoreStateOpt(store, [["count"], ["internal"]]);
}

describe("Optimized state listeners", () => {
  it("Should be able to pull basic state", () => {
    // expect()
  });
});
