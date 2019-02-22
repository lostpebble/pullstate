import { Store } from "../../../src/Store";

interface ITestUIStore {
  count: number;
  message: string;
}

export const TestUIStore = new Store<ITestUIStore>({
  count: 5,
  message: "what what!",
});