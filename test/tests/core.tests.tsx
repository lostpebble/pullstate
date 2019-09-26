import { createPullstateCore } from "../../src/index";
import { TestUIStore } from "./testStores/TestUIStore";

describe("createPullstateCore", () => {
  it("Should be able to be created without any stores", () => {
    expect(createPullstateCore()).toBeTruthy();
  });

  it("Should be able to be created with a store", () => {
    expect(createPullstateCore({ TestUIStore })).toBeTruthy();
  });
});
