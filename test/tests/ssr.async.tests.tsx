import { createAsyncAction, createPullstateCore, successResult } from "../../src";

const beautifyHtml = require("js-beautify").html;

/*const HydrateNewUserAction = PullstateCore.createAsyncAction(async (_, { UserStore }) => {
  const newUser = await getUser();
  UserStore.update(s => {
    s.user = newUser;
  });
  return successResult();
});

const GetUserAction = PullstateCore.createAsyncAction(async ({ userId }, { UserStore }) => {
  const user = await UserApi.getUser(userId);
  UserStore.update(s => {
    s.user = user;
  });
  return successResult();
});*/

describe("Server-side rendering Async Tests", () => {
  it("has no test yet", () => {
    expect(true).toEqual(true);
  });
});

describe("It Should be able to hydrate async state previously resolved, on first render", () => {

});
