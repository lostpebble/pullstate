---
id: subscribe
title: Subscribe
sidebar_label: Subscribe
---

Subscriptions are client-side only listeners to changes in your store's state.

They are very similar to [Reactions](reactions.md), the difference being they only listen for state changes and send you the new state. Reactions allow you to react and change your store's state at the same time in a "batched" way. **Subscriptions only send you the new values.** The reason these two are separated is for performance reasons - if you do not need to react and change your store's state on an update, rather use subscriptions.

Some uses include integrating with third-party tools, for times when you want to align your app's state changes with a change in the tool as well.

## Subscribe API

```tsx
myStore.subscribe(watch, listener) => unsubscribe
```

**First** argument `watch` - a function which selects the state you'd like to watch for changes:

```
storeState => storeState.valueToWatch;
```

**Second** argument `listener` - a callback function which is run when the watched value changes. The new watched value will be the first argument, and the entire store's state is the second. The third argument is the last watched value, passed as a convenience for if you ever need to refer to it.

```jsx
(watched, allState, prevWatched) => { //do things };
```

**Return** value `unsubscribe` is simply a function you can run in order to stop listening.

## Subscribe Examples

### Leaflet tile change

_(Listening for an option change in our store to update a Leaflet tile layer's source)_

```tsx
// a useEffect() hook in a functional component

useEffect(() => {
  const tileLayer = L.tileLayer(tileTemplate.url, {
    minZoom: 3,
    maxZoom: 18,
  }).addTo(mapRef.current);

  const unsubscribeFromTileTemplate = GISStore.subscribe(
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

As you can see from the example, we listen to the `tileLayerTemplate` value in `GISStore`. If that changes, we want to set our Leaflet `tileLayer` to the new url, which will change the source of images used for our map's tiles.

Also note that the value returned from `subscribe()` is a function. We should call this function to remove the listener when we don't need it anymore - here in the "cleanup" returned function of `useEffect()`.

---

### Firebase Realtime Database

Another interesting use-case could be subscribing to a Firebase realtime data node, based on a certain value in your store.

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
  previousCityUnsubscribe = startWatchingCity(cityCode);
}

CityStore.subscribe(s => s.currentCityCode, getRealtimeUpdatesForCityCode);

// inside some initialization code on the client (run after initial
// store hydration, if any), start watching initial city
function initializeClientThings() {
  getRealtimeUpdatesForCityCode(CityStore.getRawState().currentCityCode);
}
```

And now, any time you run an update somewhere in your app:
```tsx
CityStore.update(s => {
  s.currentCityCode = newCode;
})
```

If the value has actually changed, the current realtime database listener should be unsubscribed and a new one created with the new `currentCityCode`.