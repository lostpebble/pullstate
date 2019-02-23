import { Store } from "../../src/index";
import { useStoreState } from "../../src/useStoreState";
import { waitSeconds } from "./TestUtils";
import React, { useState } from "react";
import { createAsyncAction } from "../../src/async";
import { render } from "react-testing-library";
import ReactDOMServer from "react-dom/server";
const beautifyHtml = require("js-beautify").html;

const names = ["Paul", "Dave", "Michel"];
const userNames = ["lostpebble", "davej", "mweststrate"];
let currentUser = 0;

interface IUser {
  name: string;
  userName: string;
}

async function getNewUser(userId = -1): Promise<IUser> {
  currentUser = userId >= 0 ? userId : (currentUser + 1) % 3;

  await waitSeconds(1);

  return {
    name: names[currentUser],
    userName: userNames[currentUser],
  };
}

interface IUserStore {
  user: null | IUser;
}

const UserStore = new Store<IUserStore>({
  user: null,
});

const HydrateNewUserAction = createAsyncAction(async () => {
  const newUser = await getNewUser();
  UserStore.update(s => {
    s.user = newUser;
  });
  return true;
});

const GetUserAction = createAsyncAction(async ({ userId }) => {
  return await getNewUser(userId);
}, { userId: 0 });

const UninitatedUserAction = () => {
  const [userId, setUserId] = useState(0);
  const [started, finished, user] = GetUserAction.watch({ userId });

  return (
    <div>
      <span>{started ? finished ? `Got new user` : `Getting new user` : `Haven't initiated getting new user`}</span>
      {user !== null && (
        <div id="user-box">
          <h2>Hello, {user.name}</h2>
          <h3>aka: {user.userName}</h3>
        </div>
      )}
      {!started && <button id="uninitiated-get-user-button" onClick={() => GetUserAction.run({ userId })}>Initiate Get User for ID: {userId}</button>}
    </div>
  )
}

const InitiatedNextUser = () => {
  const user = useStoreState(UserStore, s => s.user);
  const [finished] = HydrateNewUserAction.beckon();

  return (
    <div>
      <span>{finished ? `User loaded` : `Loading user`}</span>
      {user !== null && (
        <div id="user-box">
          <h2>Hello, {user.name}</h2>
          <h3>aka: {user.userName}</h3>
        </div>
      )}
      <button disabled={(!finished)} id="initiated-get-user-button" onClick={() => HydrateNewUserAction.run({})}>
        Get next user
      </button>
    </div>
  )
}

const App = () => {
  return (
    <div>
      <h1>Async Test</h1>
      <InitiatedNextUser/>
      <UninitatedUserAction/>
    </div>
  );
};

describe("Async rendering", () => {
  it("renders our initial state", () => {
    const reactHtml = ReactDOMServer.renderToString(<App/>);
    expect(beautifyHtml(reactHtml)).toMatchSnapshot();
  });
});
