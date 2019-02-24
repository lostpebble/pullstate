import { useStoreState } from "../../src/useStoreState";
import React, { useState } from "react";
import { createAsyncAction } from "../../src/async";
import ReactDOMServer from "react-dom/server";
import { getUser, UserApi, UserStore } from "./TestSetup";

const beautifyHtml = require("js-beautify").html;

const HydrateNewUserAction = createAsyncAction(async () => {
  const newUser = await getUser();
  UserStore.update(s => {
    s.user = newUser;
  });
  return true;
});

const GetUserAction = createAsyncAction<{ userId: number }>(async ({ userId }) => {
  const user = await UserApi.getUser(userId);
  UserStore.update(s => {
    s.user = user;
  });
  return true;
});

const UninitiatedUserAction = () => {
  // const [userId, setUserId] = useState(0);
  const { user, userId } = useStoreState(UserStore, s => ({ user: s.user, userId: s.currentUserId }));
  const [started, finished, result, updating] = GetUserAction.useWatch({ userId });

  return (
    <div>
      <span>{started ? finished ? `Got new user` : `Getting new user` : `Haven't initiated getting new user`}</span>
      {user !== null && (
        <div id="user-box">
          <h2>Hello, {user.name}</h2>
          <h3>aka: {user.userName}</h3>
        </div>
      )}
      {!started && <button id="uninitiated-get-user-button" onClick={() => GetUserAction.run({ userId }, { treatAsUpdate: true })}>Initiate Get User for ID: {userId}</button>}
    </div>
  )
}

const InitiatedNextUser = () => {
  const user = useStoreState(UserStore, s => s.user);
  const [finished] = HydrateNewUserAction.useBeckon();

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
      <UninitiatedUserAction/>
    </div>
  );
};

describe("Async rendering", () => {
  it("renders our initial state", () => {
    const reactHtml = ReactDOMServer.renderToString(<App/>);
    expect(beautifyHtml(reactHtml)).toMatchSnapshot();
  });
});
