---
id: update-store
title: update()
sidebar_label: update()
---

You can update your store's state by calling `update()` directly on your store with an updater function passed in:

```tsx
MyStore.update(updater)
```

The updater function is simply a function which takes the store's current state and allows you to mutate it directly to create the next state. This is thanks to the power of [immer](https://github.com/immerjs/immer).

### patches callback

```tsx
MyStore.update(updater, patches)
```

An optional second argument to `update()` is a patch callback - this is a very useful API provided by `immer`, and since `update()` is pretty much just a wrapper around Immer's functionality, we provide a way for you to make use of it in your Pullstate updates too. Read more about patches in `immer` docs, [here](https://github.com/immerjs/immer#patches).

Patches allow fun things such as undo / redo functionality and state time travel!

## Example for update()

Add some basic interaction to your app with a `<button>`:

```tsx
  return (
    <div
      style={{
        background: isDarkMode ? "black" : "white",
        color: isDarkMode ? "white" : "black",
      }}>
      <h1>Hello Pullstate</h1>
      <button
        onClick={() =>
          UIStore.update(s => {
            s.isDarkMode = !isDarkMode;
          })
        }>
        Toggle Dark Mode
      </button>
    </div>
  );
```

Notice how we call `update()` on `UIStore` and pass the updater function in.

Another pattern, which helps to illustrate this further, would be to actually define the action of toggling dark mode to a function on its own:

```tsx
function toggleMode(s) {
  s.isDarkMode = !s.isDarkMode;
}

// ...in our <button> code
<button onClick={() => UIStore.update(toggleMode)}>Toggle Dark Mode</button>
```

Basically, to update our store's state all we need to do is create a function (inline arrow function or regular) which takes the current store's state and mutates it to whatever we'd like the next state to be.