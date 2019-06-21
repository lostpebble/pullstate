import { useStoreState } from "../../src/useStoreState";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { PullstateProvider, Store } from "../../src";
import { createTestBasics, IOGetUserInput, IUserStore } from "./TestSetup";
import { IOCreateAsyncActionOutput } from "../../src/async-types";

const beautifyHtml = require("js-beautify").html;

interface ITestProps {
  UserStore: Store<IUserStore>;
  ChangeToNewUserAsyncAction: IOCreateAsyncActionOutput<IOGetUserInput>;
}

const UninitiatedUserAction = ({ UserStore, ChangeToNewUserAsyncAction }: ITestProps) => {
  // const [userId, setUserId] = useState(0);
  const { user, userId } = useStoreState(UserStore, s => ({ user: s.user, userId: s.currentUserId }));
  const [started, finished, result, updating] = ChangeToNewUserAsyncAction.useWatch();

  return (
    <div>
      <span>
        {started ? (finished ? `Got new user` : `Getting new user`) : `Haven't initiated getting new user`}
      </span>
      {user !== null && (
        <div id="user-box">
          <h2>Hello, {user.name}</h2>
          <h3>aka: {user.userName}</h3>
        </div>
      )}
      {!started && (
        <button
          id="uninitiated-get-user-button"
          onClick={() => ChangeToNewUserAsyncAction.run({}, { treatAsUpdate: true })}>
          Initiate Get User for ID: {userId}
        </button>
      )}
    </div>
  );
};

const InitiatedNextUser = ({ UserStore, ChangeToNewUserAsyncAction }: ITestProps) => {
  const user = useStoreState(UserStore, s => s.user);
  const [finished] = ChangeToNewUserAsyncAction.useBeckon();

  return (
    <div>
      <span>{finished ? `User loaded` : `Loading user`}</span>
      {user !== null && (
        <div id="user-box">
          <h2>Hello, {user.name}</h2>
          <h3>aka: {user.userName}</h3>
        </div>
      )}
      <button
        disabled={!finished}
        id="initiated-get-user-button"
        onClick={() => ChangeToNewUserAsyncAction.run({})}>
        Get next user
      </button>
    </div>
  );
};

const App = (props: ITestProps) => {
  return (
    <div>
      <h1>Async Test</h1>
      <InitiatedNextUser {...props} />
      <UninitiatedUserAction {...props} />
    </div>
  );
};

describe("Async rendering", () => {
  it("renders our initial state without pre-resolved async", () => {
    const { ChangeToNewUserAsyncAction, UserStore } = createTestBasics();

    const reactHtml = ReactDOMServer.renderToString(<App {...{ ChangeToNewUserAsyncAction, UserStore }} />);
    expect(beautifyHtml(reactHtml)).toMatchSnapshot();
  });

  it("renders our initial state with some pre-resolved async state", async () => {
    const { ChangeToNewUserAsyncAction, UserStore, PullstateCore } = createTestBasics();

    const instance = PullstateCore.instantiate({ ssr: false });
    await instance.runAsyncAction(ChangeToNewUserAsyncAction);

    const reactHtml = ReactDOMServer.renderToString(
      <PullstateProvider instance={instance}>
        <App {...{ ChangeToNewUserAsyncAction, UserStore }} />
      </PullstateProvider>
    );
    expect(beautifyHtml(reactHtml)).toMatchSnapshot();
  });
});
