import { waitSeconds } from "./TestUtils";
import { createAsyncAction, createPullstateCore, Store, successResult } from "../../src";

const names = ["Paul", "Dave", "Michel"];
const userNames = ["lostpebble", "davej", "mweststrate"];

export interface IUser {
  name: string;
  userName: string;
}

export interface IUserStore {
  user: null | IUser;
  currentUserId: number;
}

export interface IOGetUserInput {
  userId?: number;
}

export function createTestBasics() {
  let currentUser = 0;

  const UserStore = new Store<IUserStore>({
    user: null,
    currentUserId: 0,
  });

  async function getNewUserObject({ userId = -1 }: IOGetUserInput): Promise<IUser> {
    currentUser = userId >= 0 ? userId : (currentUser + 1) % 3;

    await waitSeconds(1);

    return {
      name: names[currentUser],
      userName: userNames[currentUser],
    };
  }

  const ChangeToNewUserAsyncAction = createAsyncAction<IOGetUserInput, IUser>(async opt => {
    return successResult(await getNewUserObject(opt));
  }, {
    postActionHook: ({ result }) => {
      if (!result.error) {
        UserStore.update(s => {
          s.user = result.payload;
        });
      }
    }
  });

  const PullstateCore = createPullstateCore({
    UserStore,
  });

  return {
    UserStore,
    getNewUserObject,
    PullstateCore,
    ChangeToNewUserAsyncAction,
  };
}
