---
id: redux-dev-tools
title: Redux Devtools
sidebar_label: Redux Devtools
---

Pullstate includes a simple way to plug into Redux's devtools, which are already well established and extensive.

Simply include the following somewhere after your Store definitions:

```ts
import { registerInDevtools, Store } from "pullstate";

// Store definition
const ExampleStore = new Store({
  //...
});

// Register as many or as few Stores as you would like to monitor in the devtools
registerInDevtools({
  ExampleStore,
});
```

After this, you should be able to open the Redux devtools tab and see each Store registered and showing changes.
