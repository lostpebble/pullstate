import React from "react";
import { createPullstateCore, InjectStoreState, PullstateProvider, Store, update, useStoreState } from "../../src/index";
import ReactDOMServer from "react-dom/server";
import { TestUIStore } from "./testStores/TestUIStore";
const beautify = require('js-beautify').html;

const PullstateCore = createPullstateCore({ TestUIStore });

const Counter = () => {
  const { TestUIStore: ui } = PullstateCore.useStores();
  const count = useStoreState(ui, s => s.count);

  return (
    <div>
      <b>{count}</b> -{" "}
      <button
        onClick={() =>
          update(ui, s => {
            s.count++;
          })
        }
      >
        +
      </button>
    </div>
  );
};

const App = () => {
  const { TestUIStore: ui } = PullstateCore.useStores();

  return (
    <div>
      <h1>Some test</h1>
      <InjectStoreState store={ui} on={s => s.message}>
        {message => (
          <div>
            <h2>{message}</h2>
            <input
              onChange={e =>
                update(ui, s => {
                  s.message = e.target.value;
                })
              }
              value={message}
            />
          </div>
        )}
      </InjectStoreState>
      <InjectStoreState store={ui}>{uiStore => <h2>{uiStore.count}</h2>}</InjectStoreState>
      <Counter />
    </div>
  );
};

describe("Server Side Rendering tests", () => {
  const instance = PullstateCore.instantiate({ ssr: true });

  instance.stores.TestUIStore.update(s => {
    s.message = "hey there!";
  });

  const ReactApp = (
    <PullstateProvider instance={instance}>
      <App />
    </PullstateProvider>
  );

  it("Should be able to display data that's been changed on the server directly", () => {
    expect(beautify(ReactDOMServer.renderToString(ReactApp))).toMatchSnapshot();
  });
});
