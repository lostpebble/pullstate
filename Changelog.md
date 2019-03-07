### 0.6.0

* Added the "reactions" to store state. Usable like so:

```typescript jsx
UIStore.createReaction((s) => s.valueToListenForChanges, (draft, original, watched) => {
  // do something here when s.valueToListenForChanges changes
  
  // alter draft as usual - like regular update()
  
  // watched = the value returned from the first function (the selector for what to watch)
})
```
