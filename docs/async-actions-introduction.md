---
id: async-actions-introduction
title: Introduction to Async Actions
sidebar_label: Introduction
---

Jump straight into an example here:

[![Edit Pullstate Async](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/84x92qq2k2?fontsize=14)

More often than not, our stores do not exist in purely synchronous states. We often need to perform actions asynchronously, such as pulling data from an API.

* It would be nice to have an easy way to keep our view up to date with the state of these actions **without putting too much onus on our stores directly** which quickly floods them with variables such as `userLoading`, `updatingUserInfo`, `userLoadError` etc - which we then have to make sure we're handling for each unique situation - it just gets messy quickly.

* Having our views naturally listen for and initiate asynchronous state gets rid of a lot of boilerplate which we would usually need to write in `componentDidMount()` or the `useEffect()` hook.

* There are also times where we are **server-rendering** and we would like to resolve our app's asynchronous state before rendering to the user. And again, without having to run something manually (and deal with all the edge cases manually too) for example:

```jsx
try {
  const posts = await PostApi.getPostListForTag(tag);
  
  instance.stores.PostStore.update(s => {
    s.posts = posts;
  });
} catch (e) {
  instance.stores.PostStore.update(s => {
    s.posts = [];
    s.postError = e.message;
  });
}
```

As you can imagine, separating this out and running such code for every case of state that you want pre-fetched before rendering to the client will get very verbose very quickly.

Pullstate provides a much easier way to handle async scenarios through **Async Actions**!