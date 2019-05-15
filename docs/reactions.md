---
id: reactions
title: Reactions
sidebar_label: Reactions
---

A reaction is very similar to running an `update()`, except that it's an update that runs when a certain value has changed in your store.

Reactions on a store are run directly after a call to `update()` on that store. They check their watched value in the store, and if changed, react with further state updates as you define. This is all batched in one go before notifying our React components to re-render as needed.

## Creating a reaction

You register a reaction by calling `createReaction()` on your store:

<!--DOCUSAURUS_CODE_TABS-->
<!--JavaScript-->
```jsx
StoreName.createReaction(watch, reaction);
```

<!--TypeScript-->
```tsx
type TReactionFunction<S, T> = (watched:  T, draft: S, original: S) => void;

StoreName.createReaction(watch: (state: S) => T, reaction: TReactionFunction<S, T>): () => void
```

<!--END_DOCUSAURUS_CODE_TABS-->

Similar to how we select sub-state with `useStoreState()` and `<InjectStoreState>`, the first argument, `watch`, is function which returns a sub-selection of the store's state. This is the value we will be watching for changes:

```
storeState => storeState.watchedValue;
```

The watched value is checked every time the store is updated. If the value has changed, the `reaction` function is run. This is done in a performant way - reactions are run directly after updates before notifying your React components to update.

The `reaction` function:

```jsx
(watched, draft, original) => { //do things };
```

The new watched value will be passed as the first argument,`watched` 

The next two arguments are the same as those used whe running `update()` on a store:

* You can mutate your store directly, using `draft`

* `original` is passed as a performance consideration. It is exactly the same as `draft` but without all the `immer` magic. It's a plain object of your state.
  * **Why?** Referencing values directly on your `draft` object can be a performance hit in certain situations because of the way that immer works internally (JavaScript proxies) - so if you need to _reference_ the current store state, you should use `original`. But if you want to _change_ it, you use `draft`. [Read more on immer's github](https://github.com/immerjs/immer#pitfalls).
  
## Examples

Listening to a [Cron Tab](https://en.wikipedia.org/wiki/Cron#Overview) string value, `crontab`, and calculating other values such as a human readable time and the previous and next dates of the cron run:

```tsx
CronJobStore.createReaction(s => s.crontab, (crontab, draft) => {
    if (crontab !== null) {
      const resp = utils.getTimesAndTextFromCronTab({ crontab });
      if (resp.positive) {
        draft.currentCronJobTimesAndText = resp.payload;
      } else {
        draft.currentCronJobTimesAndText = {
          text: `Bad crontab`,
          times: {
            prevTime: null,
            nextTime: null,
          },
        };
      }
    }
  }
);
```

An interesting use-case could be subscribing to a Firebase realtime data node, based on a certain value in your store.

```tsx
let previousCityUnsubscribe = () => null;

function startWatchingCity(cityCode) {
  return db.collection("cities")
    .doc(cityCode)
    .onSnapshot(function(doc) {
      CityStore.update(s => {
        s.watchedCities[cityCode] = { updated: new Date(), data: doc.data() };
      });
    });
}

function getRealtimeUpdatesForCityCode(cityCode) {
  previousCityUnsubscribe();
  previousCityUnsubscribe = startWatchingCity(watchedValue);
}

CityStore.createReaction(s => s.currentCityCode, getRealtimeUpdatesForCityCode);

// inside some initialization code on the client, start watching initial city
getRealtimeUpdatesForCityCode("CAPE_TOWN");
```

And now, any time you run an update somewhere in your app:
```tsx
CityStore.update(s => {
  s.currentCityCode = newCode;
})
```

If the value has actually changed, the current realtime database listener should be unsubscribed and a new one created with the new `currentCityCode`.

## Unsubscribe from a reaction (client-side only)

You may unsubscribe from a reaction on the client side of your app by simply running the function which is returned when you created the reaction.

For example (setting a new tile layer on a leaflet map depending on template settings in our `GISStore`):

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
