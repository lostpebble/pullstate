import { IPullstateAllStores } from "./PullstateCore";
import { isWebOrReactNative } from "./environmentUtils";

interface IORegisterInDevtoolsOptions {
  namespace?: string;
}

export function registerInDevtools(stores: IPullstateAllStores, { namespace = "" }: IORegisterInDevtoolsOptions = {}) {
  if (isWebOrReactNative()) {
    for (const key of Object.keys(stores)) {
      const store = stores[key];

      const devToolsExtension = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
      if (devToolsExtension) {
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
}
