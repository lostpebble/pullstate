import _ from "lodash";

const args = {
  limit: 300,
  queryString: "bring-it-on-three",
  isItGood: true,
  anything: false,
}

const randomNumbers = [100, 200, 300, 400, 500];
const randomQueryString = ["thasd;kljaasdasd", "123978120378sadsda", "asdhixcluyisadsd", "qweu07sdvohjjksd", "1320918khjlabnm"];
const randomBools = [true, false, true, false, false];
const randomAny = [null, undefined, 123, false, "asdasduqoweuh"];

function createKey(json: any) {
  if (json == null) {
    return `${json}`;
  }

  let prefix = "";

  for (const key in Object.keys(json)) {
    if (typeof json[key] == null) {
      prefix += JSON.stringify(json[key]);
    } else if (typeof json[key] === "string" || typeof json[key] === "boolean" || typeof json[key] === "number") {
      prefix += `${json[key]}`;
    } else {
      prefix += createKey(json[key]);
    }
  }
}

function runKeyCreator(func: (json: any) => string, args: any[]): [number, string[]] {
  const timeStart = Date.now();
  const keys: string[] = [];

  for (const arg of args) {
    keys.push(func(arg));
  }

  return [Date.now() - timeStart, keys];
}

function createRandomArgs(amount: number): any {
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

describe("Arguments to key benchmark for various methods", () => {
  it("Should run JSON.stringify", () => {
    const args = createRandomArgs(10);
    console.log(args);
  });

  it("Should create a custom string from properties", () => {

  })
})