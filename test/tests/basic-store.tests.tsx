import { createBatchAction, Store } from "../../src";

interface ITestStore {
  eggs: string[];
  touched: boolean;
}

function getNewStore(): Store<ITestStore> {
  return new Store<ITestStore>({
    eggs: ["green"],
    touched: false,
  });
}

describe("Store operations", () => {
  it("should be able to subscribe to changes", () => {
    const store = getNewStore();

    const mockSubscribe = jest.fn();

    store.subscribe(s => s.touched, mockSubscribe);

    store.update(s => {
      s.touched = true;
    });

    store.update(s => {
      s.touched = false;
    });

    expect(mockSubscribe.mock.calls.length).toBe(2);
    expect(mockSubscribe.mock.calls[0][0]).toBe(true);
  });

  it("Should be able to create batched actions", () => {
    const ItemStore = getNewStore();

    /*const removeItem = createAction((update, args: { id: number }) => {
      update.ItemStore((s, o) => {
        s.eggs.filter(egg => egg);
      })
    }, {
      ItemStore
    });*/

    // removeItem({ id: 123 });

    const removeItem = createBatchAction(({ id }: { id: number }) => {

    });

    removeItem({ id: 321 });
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
