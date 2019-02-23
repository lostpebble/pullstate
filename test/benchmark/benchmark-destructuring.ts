import Benchmark from "benchmark";
import { createRandomArgs, IRandomArgObject } from "./BenchmarkUtils";

const argsObjects = createRandomArgs(1000);
const argsObjectsTwo = createRandomArgs(1000);

function returnArrayFromArgs(args: IRandomArgObject): [number, string, boolean, any] {
  return [args.limit, args.queryString, args.isItGood, args.anything];
}

const argsArrays = argsObjects.map(returnArrayFromArgs);

console.log("\n");

const suiteName = "Destructuring";

new Benchmark.Suite(suiteName)
  .add(`array destructuring`, function() {
    const allUseIt: any[] = [];

    for (const arg of argsArrays) {
      const [limit, queryString, isItGood, anything] = arg;
      const useIt = `${limit}${queryString}${isItGood}${anything}`;
      allUseIt.push(useIt);
    }

    return allUseIt;
  })
  .add(`object destructuring (no renames)`, function() {
    const allUseIt: any[] = [];

    for (const arg of argsObjects) {
      const { limit, queryString, isItGood, anything } = arg;
      const useIt = `${limit}${queryString}${isItGood}${anything}`;
      allUseIt.push(useIt);
    }

    return allUseIt;
  })
  .add(`object destructuring with renaming`, function() {
    const allUseIt: any[] = [];

    for (const arg of argsObjectsTwo) {
      const {
        limit: renamedLimit,
        queryString: renamedQueryString,
        isItGood: renamedIsItGood,
        anything: renamedAnything,
      } = arg;
      const useIt = `${renamedLimit}${renamedQueryString}${renamedIsItGood}${renamedAnything}`;
      allUseIt.push(useIt);
    }

    return allUseIt;
  })
  .on("error", function(event) {
    console.log(`An error occurred`);
    console.log(String(event.target));
  })
  .on("cycle", function(event) {
    console.log(String(event.target));
  })
  .on("complete", function() {
    console.log(`\n${suiteName} - Fastest is ` + this.filter("fastest").map("name"));
  })
  .run();

/*
* array destructuring x 26,493 ops/sec ±0.57% (97 runs sampled)
object destructuring x 28,591 ops/sec ±0.28% (94 runs sampled)
object destructuring with renaming x 28,267 ops/sec ±0.37% (94 runs sampled)
* */