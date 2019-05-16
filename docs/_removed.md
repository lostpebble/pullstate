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

---

For example:

```tsx
// a useEffect() hook in our functional component

useEffect(() => {
  const tileLayer = L.tileLayer(tileTemplate.url, {
    minZoom: 3,
    maxZoom: 18,
  }).addTo(mapRef.current);

  const unsubscribeFromTileTemplate = GISStore.createReaction(
    s => s.tileLayerTemplate,
    newTemplate => {
      tileLayer.setUrl(newTemplate.url);
    }
  );

  return () => {
    unsubscribeFromTileTemplate();
  };
}, []);
```

As you can see we receive a function back from `createReaction()` which we have used here in the "cleanup" return function of `useEffect()` to unsubscribe from this reaction.
