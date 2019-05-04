---
id: quick-example
title: Quick example
sidebar_label: Quick example
---

> _**Note**: Typescript is used in all examples to show off how one can integrate their interfaces for a nicer experience. Simply remove all references to `interface` and generics (e.g. `<IUIStore>`) to get pure JavaScript._

Let's dive right in and define and export our first state store:

```tsx
import { Store } from "pullstate";

interface IUIStore {
  isDarkMode: boolean;
}

export const UIStore = new Store<IUIStore>({
  isDarkMode: true,
});
```
