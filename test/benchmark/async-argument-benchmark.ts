import _ from "lodash";
import Benchmark from "benchmark";

/*const args = {
  limit: 300,
  queryString: "bring-it-on-three",
  isItGood: true,
  anything: false,
};*/

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

function keyFromObject(jsonObject) {
  if (typeof jsonObject !== "object" || Array.isArray(jsonObject)) {
    // not an object, stringify using native function
    if (typeof jsonObject === "string") {
      return `${jsonObject}`;
    }
    return JSON.stringify(jsonObject);
  }
  // Implements recursive object serialization according to JSON spec
  // but without quotes around the keys.
  let props = Object.keys(jsonObject)
    .sort()
    .map(key => `${key}:${keyFromObject(jsonObject[key])}`)
    .join(",");
  return `{${props}}`;
}

function customKeyCreator(json: any) {
  if (json == null) {
    return `${json}`;
  }

  let prefix = "";

  for (const key of Object.keys(json)) {
    prefix += key;

    if (typeof json[key] == null) {
      prefix += JSON.stringify(json[key]);
    } else if (typeof json[key] === "string" || typeof json[key] === "boolean" || typeof json[key] === "number") {
      prefix += `${json[key]}`;
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

suite
  .add(`JSON.stringify()`, function() {
    const args = createRandomArgs(200);
    runKeyCreator(JSON.stringify, args);
  })
  .add(`customKeyCreator()`, function() {
    const args = createRandomArgs(200);
    runKeyCreator(customKeyCreator, args);
  })
  .add(`keyFromObject()`, function() {
    const args = createRandomArgs(200);
    runKeyCreator(keyFromObject, args);
  })
  .on("cycle", function(event) {
    console.log(String(event.target));
  })
  .on("complete", function() {
    console.log("Fastest is " + this.filter("fastest").map("name"));
  })
  .run({ async: true });
