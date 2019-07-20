import { Store } from "../../../src/Store";

export interface ITestUIStore {
  count: number;
  message: string;
  internal: {
    lekker: boolean;
    berries: string[];
  };
}

export const TestUIStore = new Store<ITestUIStore>({
  count: 5,
  message: "what what!",
  internal: {
    lekker: true,
    berries: ["blue", "red", "black"],
  }
});
