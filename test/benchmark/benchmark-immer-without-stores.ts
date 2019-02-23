import Benchmark from "benchmark";
import { createRandomArgs, IRandomArgObject } from "./BenchmarkUtils";
import { produce, setAutoFreeze } from "immer";

const amount = 10;

const firstObjectSet = { objectSet: createRandomArgs(amount) };
const firstObjectSetChanges = createRandomArgs(amount);

const secondObjectSet = { objectSet: createRandomArgs(amount) };
const secondObjectSetChanges = createRandomArgs(amount);

const thirdObjectSet = { objectSet: createRandomArgs(amount) };
const thirdObjectSetChanges = createRandomArgs(amount);

const fourthObjectSet = { objectSet: createRandomArgs(amount) };
const fourthObjectSetChanges = createRandomArgs(amount);

console.log("\n");

const suiteName = "Immer produce() usage";

new Benchmark.Suite(suiteName)
  .add(`with default auto-freeze (true) and no original`, function() {
    setAutoFreeze(true);

    const allUseIt: any[] = [];

    for (const [index, arg] of firstObjectSet.objectSet.entries()) {
      const randomChanges = firstObjectSetChanges[index];

      const useIt = produce(arg, s => {
        s.anything = randomChanges.anything;
        s.limit = s.limit * 100 * randomChanges.limit;
        s.isItGood = !s.isItGood && randomChanges.isItGood;
        s.queryString = `${s.queryString}${randomChanges.queryString}`;
      });

      allUseIt.push(useIt);
    }

    return allUseIt;
  })
  .add(`with no auto-freeze (false) and no original`, function() {
    setAutoFreeze(false);

    const allUseIt: any[] = [];

    for (const [index, arg] of secondObjectSet.objectSet.entries()) {
      const randomChanges = secondObjectSetChanges[index];

      const useIt = produce(arg, s => {
        s.anything = randomChanges.anything;
        s.limit = s.limit * 100 * randomChanges.limit;
        s.isItGood = !s.isItGood && randomChanges.isItGood;
        s.queryString = `${s.queryString}${randomChanges.queryString}`;
      });

      allUseIt.push(useIt);
    }

    return allUseIt;
  })
  .add(`with default auto-freeze (true) and using original`, function() {
    setAutoFreeze(true);

    const allUseIt: any[] = [];

    for (const [index, arg] of thirdObjectSet.objectSet.entries()) {
      const randomChanges = thirdObjectSetChanges[index];

      const useIt = produce(arg, s => {
        s.anything = randomChanges.anything;
        s.limit = arg.limit * 100 * randomChanges.limit;
        s.isItGood = !arg.isItGood && randomChanges.isItGood;
        s.queryString = `${arg.queryString}${randomChanges.queryString}`;
      });

      allUseIt.push(useIt);
    }

    return allUseIt;
  })
  .add(`with no auto-freeze (false) and using original`, function() {
    setAutoFreeze(false);

    const allUseIt: any[] = [];

    for (const [index, arg] of fourthObjectSet.objectSet.entries()) {
      const randomChanges = fourthObjectSetChanges[index];

      const useIt = produce(arg, s => {
        s.anything = randomChanges.anything;
        s.limit = arg.limit * 100 * randomChanges.limit;
        s.isItGood = !arg.isItGood && randomChanges.isItGood;
        s.queryString = `${arg.queryString}${randomChanges.queryString}`;
      });

      allUseIt.push(useIt);
    }

    return allUseIt;
  })
  .add(`with no auto-freeze (false) and using original - producing entire inner array once from original`, function() {
    setAutoFreeze(false);

    const result = produce(fourthObjectSet, s => {
      s.objectSet = fourthObjectSet.objectSet.map((o, i) => {
        const randomChanges = fourthObjectSetChanges[i];

        return {
          anything: randomChanges.anything,
          limit: o.limit * 100 * randomChanges.limit,
          isItGood: !o.isItGood && randomChanges.isItGood,
          queryString: `${o.queryString}${randomChanges.queryString}`
        };
      })
    });
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