import { createAsyncAction, createPullstate } from "../../src";
import { getNewUser, PullstateCore, UserApi } from "./TestSetup";

const beautifyHtml = require("js-beautify").html;

const HydrateNewUserAction = PullstateCore.createAsyncAction(async (_, { UserStore }) => {
  const newUser = await getNewUser();
  UserStore.update(s => {
    s.user = newUser;
  });
  return true;
});

const GetUserAction = PullstateCore.createAsyncAction(async ({ userId }, { UserStore }) => {
  const user = await UserApi.getNewUser(userId);
  UserStore.update(s => {
    s.user = user;
  });
  return true;
});
