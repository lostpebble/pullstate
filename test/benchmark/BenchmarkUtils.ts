import * as _ from "lodash";

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

export interface IRandomArgObject {
  limit: number;
  queryString: string;
  isItGood: boolean;
  anything: any;
}

export function createRandomArgs(amount: number): IRandomArgObject[] {
  const args: IRandomArgObject[] = [];

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
