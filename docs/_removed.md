<!--Server-rendered app (TypeScript)-->
```tsx
// UIStore.ts
import { Store } from "pullstate";

interface IUIStore {
  isDarkMode: boolean;
}

export const UIStore = new Store<IUIStore>({
  isDarkMode: true,
});
```

Server-rendering requires that we create a central place to reference all our stores, and we do this using `createPullstateCore()`:

```tsx
// PullstateCore.ts
import { UIStore } from "./stores/UIStore";
import { createPullstateCore } from "pullstate";

export const PullstateCore = createPullstateCore({
  UIStore
});

```