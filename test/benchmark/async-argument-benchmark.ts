import _ from "lodash";
import Benchmark from "benchmark";
import { keyFromObject } from "../../src/async";

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

console.log(`\nkeyFromObject()`);
console.log(keyFromObject(testArgs));
console.log(`\ncustomKeyCreator()`);
console.log(customKeyCreator(testArgs));
console.log(`\nJSON.stringify()`);
console.log(JSON.stringify(testArgs));
console.log(`\nJSON stringify replace quotes:`);
console.log(jsonStringifyReplaceQuotes(testArgs));

const randomNumbers = [100, 200, 300, 400, 500];
const randomQueryString = [
  "thasd;kljaasdasd",
  "123978120378sadsda",
  "asdhixcluyisadsd",
  "qweu07sdvohjjksd",
  "1320918khjlabnm",
];
const randomBools = [true, false, true, false, false];
const randomAny = [null, undefined, 123, false, "asdasduqoweuh"];

/*function keyFromObject(jsonObject: any): string {
  if (typeof jsonObject !== "object" || Array.isArray(jsonObject) || jsonObject === null || jsonObject === undefined) {
    if (typeof jsonObject === "string") {
      return `${jsonObject}`;
    }
    return JSON.stringify(jsonObject);
  }

  let props = Object.keys(jsonObject)
    .sort()
    .map(key => `${key}:${keyFromObject(jsonObject[key])}`)
    .join(",");
  return `${props}`;
}*/

function customKeyCreator(json: any): string {
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
      prefix += customKeyCreator(json[key]);
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

function createRandomArgs(amount: number): any[] {
  const args: any[] = [];

  for (let i = 0; i <= amount; i += 1) {
    args.push({
      limit: _.sample(randomNumbers),
      queryString: _.sample(randomQueryString),
      isItGood: _.sample(randomBools),
      anything: _.sample(randomAny),
    });
  }

  return args;
}

const suite = new Benchmark.Suite();

// const args = createRandomArgs(2);

// console.log(args[0]);

// console.log(keyFromObject(args[0]));
// console.log(JSON.stringify(args[0]));

const args = createRandomArgs(200);

function jsonStringifyReplaceQuotes(obj: any) {
  return JSON.stringify(obj).replace("\"", "-");
}

console.log("\n");

suite
  .add(`JSON.stringify()`, function() {
    runKeyCreator(JSON.stringify, args);
  })
  .add(`JSON.stringify()-replace-quotes`, function() {
    runKeyCreator(jsonStringifyReplaceQuotes, args);
  })
  .add(`keyFromObject()`, function() {
    runKeyCreator(keyFromObject, args);
  })
  .add(`customKeyCreator()`, function() {
    runKeyCreator(customKeyCreator, args);
  })
  .on("cycle", function(event) {
    // console.log(event);
    console.log(String(event.target));
  })
  .on("complete", function() {
    console.log("Fastest is " + this.filter("fastest").map("name"));
  })
  .run();
