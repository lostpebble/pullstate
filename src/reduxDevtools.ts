import { IPullstateAllStores } from "./PullstateCore";

export function registerInDevtools(stores: IPullstateAllStores) {
  if (typeof document !== "undefined") {
    for (const key of Object.keys(stores)) {
      const store = stores[key];

      const devToolsExtension = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
      if (devToolsExtension) {
        const devTools = devToolsExtension.connect({ name: key });
        devTools.init(store.getRawState());
        let ignoreNext = true;
        store.subscribe(
          (state) => {
            if (ignoreNext) {
              ignoreNext = false;
              return;
            }
            devTools.send("Change", state);
          },
          () => {}
        );

        devTools.subscribe((message: { type: string; state: any }) => {
          if (message.type === "DISPATCH" && message.state) {
            ignoreNext = true;
            const parsed = JSON.parse(message.state);
            store.replace(parsed);
          }
        });
      }
    }
  }
}
