### pullstate

> Ridiculously simple state stores with performant retrieval anywhere
in your React tree using the wonderful concept of React hooks!

* tiny at ~485B minified and gzipped! (excluding Immer and React)
* Built with Typescript, providing a great dev experience if you're using it too

_Inspired by a now seemingly abandoned library - [bey](https://github.com/jamiebuilds/bey), sharing
much of the same interface - but with a hooks implementation. Bey was in turn inspired by
[react-copy-write](https://github.com/aweary/react-copy-write)._

**Let's dive right in**

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

Then, in React, we can start using parts of that store using a simple hook `useStore()`:

```typescript jsx
import { UIStore } from "./stores/UIStore";
import { useStore, update } from "pullstate";

const App = () => {
  const theme = useStore(UIStore, s => s.theme);

  return (
    <ThemeProvider theme={theme}>
      <button
        onClick={() => {
          update(UIStore, s => {
            s.theme.mode = theme.mode === EThemeMode.DARK ? EThemeMode.LIGHT : EThemeMode.DARK;
          });
        }}
      >
        Switch it up!
      </button>
    </ThemeProvider>
  );
};
```

Notice, that we also made use of `update()`, which allows us to update our stores' state anywhere
we please - (literally anywhere in your JS code, not only inside React components) - over here we simply did it inside a click event to change the theme.

Also notice, the second argument to `useStore()`:

```typescript jsx
const theme = useStore(UIStore, s => s.theme);
```

This selects a sub-state within our store. This ensures that this specific "hook" into
our store will only update when that specific return value is actually
changed in our store. This enhances our app's performance by ignoring anything in the store
this component does not care about.

**E.g** If we had to update the value of `message` in the `UIStore`, nothing would happen here since we are only listening
for changes on `theme`.

If you want you can leave out the second argument altogether:
```typescript
const storeState = useStore(UIStore);
```

This will return the entire store's state - and listen to all changes on the store - so it is generally not recommended.

To listen to more parts of the state within a store simply pick out more values:

```typescript jsx
const { theme, message } = useStore(UIStore, s => ({ theme: s.theme, message: s.message }));
```

Lastly, lets look at how we update our stores:

```typescript jsx
update(UIStore, s => {
  s.theme.mode = theme.mode === EThemeMode.DARK ? EThemeMode.LIGHT : EThemeMode.DARK;
});
```

Using the power of [immer](https://github.com/mweststrate/immer), we update a store by passing
it to a function called `update()`. The second argument is the updater function, which is given
the current state of our store to mutate however we like! For more information on how this works,
go check out [immer](https://github.com/mweststrate/immer). Its great.

And that's pretty much it!