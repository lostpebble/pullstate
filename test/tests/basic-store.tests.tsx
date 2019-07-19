import { Store } from "../../src";

interface ITestStore {
  eggs: string[];
  touched: boolean;
}

function getNewStore(): Store<ITestStore> {
  return new Store({
    eggs: ["green"],
    touched: false,
  });
}

describe("Store operations", () => {
  it("should be able to subscribe to changes", () => {
    const store = getNewStore();

    store.subscribe(s => s.touched, (watched) => {
      expect(watched).toEqual(true);
    });

    store.update(s => {
      s.touched = true;
    });
  });

  it("Should give the previous value when subscription gets a new value", () => {
    const store = getNewStore();

    store.subscribe(s => s.touched, (watched, all, prevWatched) => {
      expect(watched).toEqual(true);
      expect(prevWatched).toEqual(false);
    });

    store.update(s => {
      s.touched = true;
    });
  });
});
