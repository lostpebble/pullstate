import Benchmark from "benchmark";
import { createRandomArgs, IRandomArgObject } from "./BenchmarkUtils";

const testArgs = {
  limit: 300,
  deeper: {
    something: null,
    cor: "false",
    far: true,
    egg: [false, null, undefined, 312, "eggs"],
  },
  queryString: "bring-it-on-three",
  isItGood: true,
  anything: false,
};

console.log(`\nkeyFromObjectOld()`);
console.log(keyFromObjectOld(testArgs));
console.log(`\npullstateCustomKeyCreator()`);
console.log(pullstateCustomKeyCreator(testArgs));
console.log(`\nJSON.stringify()`);
console.log(JSON.stringify(testArgs));
console.log(`\nJSON stringify replace quotes:`);
console.log(jsonStringifyReplaceQuotes(testArgs));

function keyFromObjectOld(jsonObject: any): string {
  if (typeof jsonObject !== "object" || Array.isArray(jsonObject) || jsonObject === null || jsonObject === undefined) {
    if (typeof jsonObject === "string") {
      return `${jsonObject}`;
    }
    return JSON.stringify(jsonObject);
  }

  let props = Object.keys(jsonObject)
    .sort()
    .map(key => `${key}:${keyFromObjectOld(jsonObject[key])}`)
    .join(",");
  return `${props}`;
}

function pullstateCustomKeyCreator(json: any): string {
  if (json == null) {
    return `${json}`;
  }

  let prefix = "";

  for (const key of Object.keys(json).sort()) {
    prefix += key;

    if (typeof json[key] == null) {
      prefix += JSON.stringify(json[key]);
    } else if (typeof json[key] === "string" ) {
      prefix += `~${json[key]}~`;
    } else if (typeof json[key] === "boolean" || typeof json[key] === "number") {
      prefix += json[key];
    } else {
      prefix += pullstateCustomKeyCreator(json[key]);
    }
  }

  return prefix;
}

function runKeyCreator(func: (json: any) => string, args: any[]): [number, string[]] {
  const timeStart = Date.now();
  const keys: string[] = [];

  for (const arg of args) {
    keys.push(func(arg));
  }

  return [Date.now() - timeStart, keys];
}


const args = createRandomArgs(200);

function jsonStringifyReplaceQuotes(obj: any) {
  return JSON.stringify(obj).replace("\"", "-");
}

console.log("\n");

const suiteName = "Async Arguments to Key String";

new Benchmark.Suite(suiteName)
  .add(`JSON.stringify()`, function() {
    runKeyCreator(JSON.stringify, args);
  })
  .add(`JSON.stringify()-replace-quotes`, function() {
    runKeyCreator(jsonStringifyReplaceQuotes, args);
  })
  .add(`keyFromObjectOld()`, function() {
    runKeyCreator(keyFromObjectOld, args);
  })
  .add(`pullstateCustomKeyCreator()`, function() {
    runKeyCreator(pullstateCustomKeyCreator, args);
  })
  .on("cycle", function(event) {
    // console.log(event);
    console.log(String(event.target));
  })
  .on("complete", function() {
    console.log(`\n${suiteName} - Fastest is ` + this.filter("fastest").map("name"));
  })
  .run();
