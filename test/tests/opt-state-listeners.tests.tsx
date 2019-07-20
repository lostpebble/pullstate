import { Store, useStoreStateOpt } from "../../src";
import { ITestUIStore } from "./testStores/TestUIStore";

const ListenerParent = ({ store }: { store: Store<ITestUIStore> }) => {
  const [internal] = useStoreStateOpt(store, [["internal"], ["internal", ""]]);
}

describe("Optimized state listeners", () => {
  it("Should be able to pull basic state", () => {
    // expect()
  });
});
