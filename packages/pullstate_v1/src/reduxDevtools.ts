import { IPullstateAllStores } from "./PullstateCore";

interface IORegisterInDevtoolsOptions {
  namespace?: string;
}

export function registerInDevtools(stores: IPullstateAllStores, { namespace = "" }: IORegisterInDevtoolsOptions = {}) {
  const devToolsExtension = typeof window !== "undefined" ? (window as any)?.__REDUX_DEVTOOLS_EXTENSION__ : undefined;

  if (devToolsExtension) {
    for (const key of Object.keys(stores)) {
      const store = stores[key];

      const devTools = devToolsExtension.connect({ name: `${namespace}${key}` });
      devTools.init(store.getRawState());
      let ignoreNext = false;
      /*store.subscribe(
          (state) => {
            if (ignoreNext) {
              ignoreNext = false;
              return;
            }
            devTools.send("Change", state);
          },
          () => {}
        );*/
      store.subscribe(
        (s) => s,
        (watched) => {
          if (ignoreNext) {
            ignoreNext = false;
            return;
          }
          devTools.send("Change", watched);
        }
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
