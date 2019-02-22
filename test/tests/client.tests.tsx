import ReactDOMServer from "react-dom/server";
import React from "react";
import { InjectStoreState, update, useStoreState } from "../../src/index";
import { TestUIStore } from "./testStores/TestUIStore";
const beautify = require("js-beautify").html;

const Counter = () => {
  const count = useStoreState(TestUIStore, s => s.count);

  return (
    <div>
      <h3>Count: {count}</h3>
      <button
        onClick={() =>
          update(TestUIStore, s => {
            s.count++;
          })
        }
      >
        PLUS
      </button>
    </div>
  );
};

const App = () => {
  return (
    <div>
      <h1>Some test</h1>
      <InjectStoreState store={TestUIStore} on={s => s.message}>
        {message => (
          <div>
            <h2>{message}</h2>
            <input
              onChange={e =>
                TestUIStore.update(s => {
                  s.message = e.target.value;
                })
              }
              value={message}
            />
          </div>
        )}
      </InjectStoreState>
      <InjectStoreState store={TestUIStore}>{uiStore => <h2>{uiStore.count}</h2>}</InjectStoreState>
      <Counter />
    </div>
  );
};

describe("Pullstate on client only", () => {
  const ReactApp = <App />;

  it("Should be able to render its data", () => {
    expect(beautify(ReactDOMServer.renderToString(ReactApp))).toMatchSnapshot();
  });
});
