---
id: reactions
title: Reactions
sidebar_label: Reactions
---

[TODO]

Reactions are listeners that respond to changes inside your stores' state. You register a reaction by calling `createReaction()` on your store, which has an API like so:

<!--DOCUSAURUS_CODE_TABS-->
<!--JavaScript-->
```jsx
StoreName.createReaction(watch, reaction): () => void
```

<!--TypeScript-->
```tsx
StoreName.createReaction(watch: (state: S) => T, reaction: TReactionFunction<S, T>): () => void
```

<!--END_DOCUSAURUS_CODE_TABS-->

Similar to using and selecting state with `useStoreState()` and `<InjectStoreState>`, the first argument is a "watch" function which returns a sub-selection of the store's state. This is the value we want to watch for changes.

The watched value is checked every time the store is updated. If the value has changed, the reaction function is run. This is done in a performant way - reactions are run before all updates are pushed to your React components.

A reaction function has an API like so:
