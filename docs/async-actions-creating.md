---
id: async-actions-creating
title: Creating an Async Action
sidebar_label: Creating an Async Action
---

**Note the tabs in these examples. If you are server-rendering, switch to the "Server-rendered app" tab.**

Create an Async Action like so:

<!--DOCUSAURUS_CODE_TABS-->
<!--Client-side only app-->

```tsx
import { createAsyncAction } from "pullstate";

const myAsyncAction = createAsyncAction(action, hooksAndOptions);
```

<!--Server-rendered app-->

```tsx
import { PullstateCore } from "./PullstateCore";

const myAsyncAction = PullstateCore.createAsyncAction(action, hooksAndOptions);
```

Server-rendered apps need to make use of your "core" Pullstate object to create Async Actions which can pre-fetch on the server.

> Some of these examples will be making use of **client-side** only code to keep things simple and rather focus on the differences between TypeScript and JavaScript interactions. The server-rendering considerations to convert such code is explained in other examples, in the relevant tabs.

<!--END_DOCUSAURUS_CODE_TABS-->

We pass in two arguments. First, our actual `action`, and secondly, any [`hooks`](async-hooks-overview.md) we would like to set on this action to extend its functionality.

## The action itself

The argument we pass in for `action` is pretty much just a standard `async` / `Promise`-returning function, but there are some extra considerations we need to keep in mind.

To illustrate these considerations, lets use an example Async Action (fetching pictures related to a tag from an API) and its usage:

<!--DOCUSAURUS_CODE_TABS-->
<!--JavaScript-->

```tsx
import { createAsyncAction, errorResult, successResult } from "pullstate";

const searchPicturesForTag = createAsyncAction(async ({ tag }) => {
  const result = await PictureApi.searchWithTag(tag);

  if (result.success) {
    return successResult(result.pictures);
  }

  return errorResult([], `Couldn't get pictures: ${result.errorMessage}`);
});

export const PictureExample = props => {
  const [finished, result] = searchPicturesForTag.useBeckon({ tag: props.tag });

  if (!finished) {
    return <div>Loading Pictures for tag "{props.tag}"</div>;
  }

  if (result.error) {
    return <div>{result.message}</div>;
  }

  return <Gallery pictures={result.payload.pictures} />;
};
```

<!--TypeScript-->

```tsx
import { createAsyncAction, errorResult, successResult } from "pullstate";

interface IOSearchPicturesForTagInput {
  tag: string;
}

interface IOSearchPicturesForTagOutput {
  pictures: Picture[];
}

const searchPicturesForTag = createAsyncAction<IOSearchPicturesForTagInput, IOSearchPicturesForTagOutput>(
  async ({ tag }) => {
    const result = await PictureApi.searchWithTag(tag);

    if (result.success) {
      return successResult({ pictures: result.pictures });
    }

    return errorResult([], `Couldn't get pictures: ${result.errorMessage}`);
  }
);

export const PictureExample = (props: { tag: string }) => {
  const [finished, result] = searchPicturesForTag.useBeckon({ tag: props.tag });

  if (!finished) {
    return <div>Loading Pictures for tag "{props.tag}"</div>;
  }

  if (result.error) {
    return <div>{result.message}</div>;
  }

  return <Gallery pictures={result.payload.pictures} />;
};
```

<!--END_DOCUSAURUS_CODE_TABS-->

### The cachable "fingerprint"

The first important concept to understand has to do with caching. For the **same arguments**, we do not want to be running these actions over and over again each time we hit them in our component code - what we really only want is the final result of these actions. So we need to be able to cache the results and re-use them where possible. Don't worry, Pullstate provides easy ways to ["break" this cache](async-cache-clearing.md) where needed as well.

Pullstate does this by internally creating a "fingerprint" from the arguments which are passed in to the action. In our example here, the fingerprint is created from:

```tsx
{ tag: props.tag; }
```

So, in the example, if on initial render we pass`{ tag: "dog" }` as props to our component, it will run the action for the first time with that fingerprint. Then, if we pass something new like `{ tag: "tree" }`, the action will run for that tag for the first time too. Both of these results are now cached per their arguments. If we pass `{ tag: "dog" }` again, the action will not run again but instead return our previously cached result.

**Importantly:** Always have your actions defined with as many arguments which identify that single action as possible! (But no more than that - be as specific as possible while being as brief as possible).

That said, there very well _could_ be reasons to create async actions that have no arguments and there are [ways you can cache bust](async-cache-clearing.md) actions to cause them to run again with the same "fingerprint".

### What to return from an action

Your action should return a result structured in a certain way. Pullstate provides convenience methods for this, depending on whether you want to return an error or a success - as can be seen in the example where we return `successResult()` or `errorResult()`.

This result structure is as follows:

```tsx
{
  error: boolean;
  message: string;
  tags: string[];
  payload: any;
}
```

### Convenience function for success

Will set `{ error: false }` on the result object e.g:

```tsx
//     successResult(payload = null, tags = [], message = "") <- default arguments
return successResult({ pictures: result.pictures });
```

### Convenience function for error

Will set `{ error: true }` on the result object e.g:

```tsx
//     errorResult(tags = [], message = "") <- default arguments
return errorResult(["NO_USER_FOUND"], "No user found in database by that name");
```

The `tags` property here is a way to easily react to more specific error states in your UI. The default error result, when you haven't caught the errors yourself, will return with a single tag: `["UNKNOWN_ERROR"]`. If you return an error with `errorResult()`, the tag `"RETURNED_ERROR"` will automatically be added to tags.

## Update our state stores with async actions

In our example we didn't actually touch our Pullstate stores, and that's just fine - there are many times where we just need to listen to asynchronous state without updating our stores (waiting for `Image.onload()` for example).

But the Pullstate Way™ is generally to maintain our state in our stores for better control over things.

A naive way to do this might be like so:

**This code, while functionally correct, will cause unexpected behaviour!**

<!--DOCUSAURUS_CODE_TABS-->
<!--Client-side only app-->

```tsx
import { createAsyncAction, errorResult, successResult } from "pullstate";
import { GalleryStore } from "./stores/GalleryStore";

const searchPicturesForTag = createAsyncAction(async ({ tag }) => {
  const result = await PictureApi.searchWithTag(tag);

  if (result.success) {
    GalleryStore.update(s => {
      s.pictures = result.pictures;
    });
    return successResult();
  }

  return errorResult([], `Couldn't get pictures: ${result.errorMessage}`);
});

export const PictureExample = (props: { tag: string }) => {
  const [finished, result] = searchPicturesForTag.useBeckon({ tag: props.tag });

  if (!finished) {
    return <div>Loading Pictures for tag "{props.tag}"</div>;
  }

  if (result.error) {
    return <div>{result.message}</div>;
  }

  // Inside the Gallery component we will pull our state
  // from our stores directly instead of passing it as a prop
  return <Gallery />;
};
```

<!--Server-rendered app-->

```tsx
import { PullstateCore } from "./PullstateCore";

const searchPicturesForTag = PullstateCore.createAsyncAction(
  async ({ tag }, { GalleryStore }) => {
    const result = await PictureApi.searchWithTag(tag);

    if (result.success) {
      GalleryStore.update(s => {
        s.pictures = result.pictures;
      });
      return successResult();
    }

    return errorResult([], `Couldn't get pictures: ${result.errorMessage}`);
  }
);
```

Something to notice here quick is that for server-rendered apps, we must make use of the second argument in our defined action which is the collection of stores being used on this render / server request.

```tsx
export const PictureExample = (props: { tag: string }) => {
  const [finished, result] = searchPicturesForTag.useBeckon({ tag: props.tag });

  if (!finished) {
    return <div>Loading Pictures for tag "{props.tag}"</div>;
  }

  if (result.error) {
    return <div>{result.message}</div>;
  }

  // Inside the Gallery component we will pull our state
  // from our stores directly instead of passing it as a prop
  return <Gallery />;
};
```

<!--END_DOCUSAURUS_CODE_TABS-->

So what exactly is the problem? At first glance it might not be very clear.

**The problem:** Because our actions are cached, when we return to a previously run action (with the same "fingerprint" of arguments) the action will not be run again, and our store will not be updated.

To find out how to work with these scenarios, check out [Async Hooks](async-hooks-overview.md) - and specifically for this scenario, we would make use of the [`postActionHook()`](async-post-action-hook.md).
