---
id: anatomy-of-an-async-action
title: Anatomy of an Async Action
sidebar_label: Anatomy of an Async Action
---

## Creating an action

Create an Async Action like so:

<!--DOCUSAURUS_CODE_TABS-->
<!--Client-side only app-->
```tsx
import { createAsyncAction } from "pullstate";

const myAsyncAction = createAsyncAction(action, hooks);
```

<!--Server-rendered app-->
```tsx
import { PullstateCore } from "./PullstateCore";

const myAsyncAction = PullstateCore.createAsyncAction(action, hooks);
```

Server-rendered apps need to make use of your "core" Pullstate object to create Async Actions which can pre-fetch on the server.

> For the rest of these examples we will be making use of the **client-side** only code to keep things simple and rather focus on the differences between TypeScript and JavaScript interactions

<!--END_DOCUSAURUS_CODE_TABS-->

We pass in two arguments. First, our actual `action`, and secondly, any `hooks` ([next section](action-hooks.md)) we would like to set on this action to extend its functionality.

## The action itself

The argument we pass in for `action` is pretty much just a standard `async` / `Promise`-returning function, but there are some extra considerations we need to keep in mind.

To illustrate these considerations, lets use an example Async Action and its usage:

```tsx
const searchPicturesForTag = createAsyncAction(async ({ tag }) => {
  const result = PictureApi.searchWithTag(tag);
  
  if (result.success) {
    return successResult(result.pictures);
  }
  
  return errorResult([], `Couldn't get pictures: ${result.errorMessage}`);
});

export const PictureExample = (props) => {
  const [finished, result] = searchPicturesForTag.useBeckon({ tag: props.tag });

  return !finished ? (
    <div>Loading Pictures for tag "{props.tag}"</div>
  ) : (
    <Gallery pictures={result.payload} />
  );
};
```

### The cachable "fingerprint"

The first important concept to understand has to do with caching. For the **same arguments**, we do not want to be running these actions over and over again each time we meet them in our component code - what we really only want is the final result of these actions. So we need to be able to cache the results and re-use them where possible. Don't worry, Pullstate provides easy ways to "break" this cache where needed as well.

Pullstate does this by internally creating a "fingerprint" from the arguments which are passed in to the action.

So, **Importantly:** Always have your actions defined with as many arguments which identify that single action as possible! (But no more than that - be as specific as possible while being as brief as possible).

There very well could be reasons to create async actions that have no arguments, and for this - there are ways you can cache bust these actions to cause them to run again - either through an Async Action hook, or directly.