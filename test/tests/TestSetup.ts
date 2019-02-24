import { waitSeconds } from "./TestUtils";
import { createPullstate, Store } from "../../src";

const names = ["Paul", "Dave", "Michel"];
const userNames = ["lostpebble", "davej", "mweststrate"];
let currentUser = 0;

export interface IUser {
  name: string;
  userName: string;
}

export async function getUser(userId = -1): Promise<IUser> {
  currentUser = userId >= 0 ? userId : (currentUser + 1) % 3;

  await waitSeconds(1);

  return {
    name: names[currentUser],
    userName: userNames[currentUser],
  };
}

export const UserApi = {
  getUser,
}

export interface IUserStore {
  user: null | IUser;
  currentUserId: number;
}

export const UserStore = new Store<IUserStore>({
  user: null,
  currentUserId: 0,
});

export const PullstateCore = createPullstate({
  UserStore,
});
