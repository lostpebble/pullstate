import { Store, useStoreStateOpt } from "../../src";
import { ITestUIStore } from "./testStores/TestUIStore";

const ListenerParent = ({ store }: { store: Store<ITestUIStore> }) => {
  const [berries] = useStoreStateOpt(store, [["internal", "berries"]]);

  // const bool: boolean = berries;
}

describe("Optimized state listeners", () => {
  it("Should be able to pull basic state", () => {
    // expect()
  });
});
