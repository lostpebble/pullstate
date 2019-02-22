### pullstate

> Ridiculously simple state stores with performant retrieval anywhere
in your React tree using the wonderful concept of React hooks!

* ~2.02KB minified and gzipped! (excluding Immer and React)
* Built with Typescript, providing a great dev experience if you're using it too
* Provides `<InjectStoreState>` component for those who don't like change 🐌
* Uses [immer](https://github.com/mweststrate/immer) for state updates - easily and safely mutate your state directly!

_Inspired by the now seemingly abandoned library - [bey](https://github.com/jamiebuilds/bey), sharing
a similar interface but with a hooks implementation (and server-side rendering). Bey was in turn inspired by
[react-copy-write](https://github.com/aweary/react-copy-write)._

Try out a quick example:

[![Edit Pullstate Client-only Example](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/myvj8zzypp)

## **Let's dive right in**

```
yarn add pullstate
```

After installing, lets define a store by passing an initial state to `new Store()`:

```javascript
import { Store } from "pullstate";

export const UIStore = new Store({
  theme: {
    mode: EThemeMode.DARK,
  },
  message: `What a lovely day`,
});
```

Then, in React, we can start using the state of that store using a simple hook `useStoreState()`:

```typescript jsx
import { UIStore } from "./stores/UIStore";
import { useStoreState } from "pullstate";

const App = () => {
  const theme = useStoreState(UIStore, s => s.theme);

  return (
    <div className={`app ${theme}`}>
      <button
        onClick={() => {
          UIStore.update(s => {
            s.theme.mode = theme.mode === EThemeMode.DARK ? EThemeMode.LIGHT : EThemeMode.DARK;
          });
        }}
      >
        Switch it up!
      </button>
    </div>
  );
};
```

Notice, that we also made use of `update()`, which allows us to update our stores' state anywhere
we please - (literally anywhere in your JS code, not only inside React components - __but if you are using Server Rendering, see below 👇__) - over here we simply did it inside a click event to change the theme.

Also notice, the second argument to `useStoreState()`:

```typescript jsx
const theme = useStoreState(UIStore, s => s.theme);
```

This selects a sub-state within our store. This ensures that this specific "hook" into
our store will only update when that specific return value is actually
changed in our store. This enhances our app's performance by ignoring any changes in the store
this component does not care about, preventing unnecessary renders.

**E.g** If we had to update the value of `message` in the `UIStore`, nothing would happen here since we are only listening
for changes on `theme`.

If you want you can leave out the second argument altogether:
```typescript
const storeState = useStoreState(UIStore);
```

This will return the entire store's state - and listen to all changes on the store - so it is generally not recommended.

To listen to more parts of the state within a store simply pick out more values:

```typescript jsx
const { theme, message } = useStoreState(UIStore, s => ({ theme: s.theme, message: s.message }));
```

Lastly, lets look at how we update our stores:

```typescript jsx
UIStore.update(s => {
  s.theme.mode = theme.mode === EThemeMode.DARK ? EThemeMode.LIGHT : EThemeMode.DARK;
});
```

Using the power of [immer](https://github.com/mweststrate/immer), we update a store by calling a function called `update()` on it. The argument is the updater function, which is given
the current state of our store to mutate however we like! For more information on how this works,
go check out [immer](https://github.com/mweststrate/immer). Its great.

And that's pretty much it!

As an added convenience (and for those who still enjoy using components directly for accessing these things),
you can also work with state using the `<InjectStoreState>` component, like so:

```typescript jsx
import { InjectStoreState } from "pullstate";

// ... somewhere in your JSX :
<InjectStoreState store={UIStore} on={s => s.message}>{message => <h2>{message}</h2>}</InjectStoreState>
```

## Server Rendering

The above will sort you out nicely if you are simply running a client-rendered app. But Server Rendering is a little more involved (although not much).

### Create a central place for all your stores using `createPullstate()`

```typescript jsx
import { UIStore } from "./UIStore";
import { UserStore } from "./UserStore";
import { createPullstate } from "pullstate";

export const Pullstate = createPullstate({
  UIStore,
  UserStore,
});
```

You pass in the stores you created before. This creates a centralized object from which Pullstate can instantiate your state before each render.

### Using your stores on the server

```typescript jsx
import { Pullstate } from "./stores/Pullstate";
import ReactDOMServer from "react-dom/server";
import { PullstateProvider } from "pullstate";

// A server request
async function someRequest(req) {
  const instance = Pullstate.instantiate();
  
  const user = await UserApi.getUser(id);
  
  instance.stores.UserStore.update(userStore => {
    userStore.userName = user.name;
  });
  
  const reactHtml = ReactDOMServer.renderToString(
    <PullstateProvider stores={instance.stores}>
      <App />
    </PullstateProvider>
  );
  
  
  const body = `
<script>window.__PULLSTATE__ = '${JSON.stringify(instance.getAllState())}'</script>
${reactHtml}`;
  
  // do something with the generated html and send response
}
```

* Instantiate fresh stores before each render using `instantiate()`
* Manipulate your state directly during your server's request by using the `stores` property of the instantiated object.
* Notice we called `update()` directly on the `UserStore` here - this is a convenience method (which is actually available on
all stores).
* We pass the stores into the rendering function. We use `<PullstateProvider>` to do so, providing `stores` prop from the instantiated object.
* Lastly, we need to return this state to the client somehow. Here we set it on `window.__PULLSTATE__`, to be parsed and hydrated on the client.

### Client state hydration

```typescript jsx
const hydrateState = JSON.parse(window.__PULLSTATE__ || "null");

const instance = Pullstate.instantiate({ hydrateState });

ReactDOM.render(
  <PullstateProvider stores={instance.stores}>
    <App />
  </PullstateProvider>,
  document.getElementById("react-mount")
);
```

* We create a new instance on the client using the same method as above, except this time we can pass
`hydrateState`, which will instantiate our new stores with the state where our server left off.

### Using our stores throughout our React app

So now that we have our stores properly injected into our react app through `<PullstateProvider>`, we need to actually
make use of them correctly. Because we are server rendering, we can't use the singleton-type stores we made
before - we need to target these injected store instances directly.

For that we need a new hook - `useStores()`.

This hook uses React's context to obtain the current render's stores, given to us by `<PullstateProvider>`.

Lets refactor the previous client-side-only example to work with Server Rendering:

```typescript jsx
import { useStoreState, useStores } from "pullstate";

const App = () => {
  const { UIStore, UserStore } = useStores();
  const theme = useStoreState(UIStore, s => s.theme);
  const userName = useStoreState(UserStore, s => s.userName)

  return (
    <div className={`app ${theme}`}>
      <button
        onClick={() => {
          UIStore.update(s => {
            s.theme.mode = theme.mode === EThemeMode.DARK ? EThemeMode.LIGHT : EThemeMode.DARK;
          });
        }}
      >
        Switch it up, {userName}!
      </button>
    </div>
  );
};
```

Basically, all you need to do is replace the import

```
import { UIStore } from "./stores/UIStore";
```

with the context hook:

```
const { UIStore } = useStores();
```

### Last note about Server Rendering

On the client side, when instantiating your stores, you can choose to instantiate using the "origin" stores
by passing the `reuseStores: true` like so:

```typescript jsx
const hydrateState = JSON.parse(window.__PULLSTATE__ || "null");

const instance = Pullstate.instantiate({ reuseStores: true, hydrateState })

ReactDOM.render(
  <PullstateProvider stores={instance.stores}>
    <App />
  </PullstateProvider>,
  document.getElementById("react-mount")
);
```

Basically, what this does is re-uses the exact stores that you originally created.

This allows us to directly update those original stores on the client and we will receive updates
as usual. Usually, calling `instantiate()` creates a fresh copy of your stores (which is required on the
server, because each client request needs to maintain its own state), but on the client code - its perfectly
fine to directly update your created stores because the state is contained to that client alone. But to do this,
you need to pass `reuseStores: true` as mentioned above.

For example, you could now do something like this:

```typescript jsx
import { UIStore, GraphStore } from "./stores"

async function refreshGraphData() {
  UIStore.update(s => { s.refreshing = true; });
  const newData = await GraphDataApi.getNewData();
  GraphStore.update(s => { s.data = newData; });
  UIStore.update(s => { s.refreshing = false; });
}
```

⚠ __Caution Though__ - While this option allows for much more ease of use for playing around with state on the client,
you must make sure that these state updates are _strictly_ client-side only updates - as they will not apply
on the server and you will get unexpected results. Think of these updates as updates that will run after the
page has already loaded completely for the user (UI responses, dynamic data loading, loading screen popups etc.).
