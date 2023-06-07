import Benchmark from "benchmark";
import { createRandomArgs, IRandomArgObject } from "./BenchmarkUtils";
import { produce, setAutoFreeze } from "immer";
import { Store } from "../../src";

const amount = 10;

const FirstStore = new Store({
  objectSet: createRandomArgs(amount),
});
const firstStoreObjectSetChanges = createRandomArgs(amount);
FirstStore._setInternalOptions({ ssr: true });

const SecondStore = new Store({
  objectSet: createRandomArgs(amount),
});
const secondStoreObjectSetChanges = createRandomArgs(amount);
SecondStore._setInternalOptions({ ssr: true });

const ThirdStore = new Store({
  objectSet: createRandomArgs(amount),
});
const thirdStoreObjectSetChanges = createRandomArgs(amount);
ThirdStore._setInternalOptions({ ssr: true });

const FourthStore = new Store({
  objectSet: createRandomArgs(amount),
});
const fourthStoreObjectSetChanges = createRandomArgs(amount);
FourthStore._setInternalOptions({ ssr: true });

console.log("\n");

const suiteName = "Immer with stores updates";

new Benchmark.Suite(suiteName)
  .add(`with default auto-freeze (true) and no original`, function() {
    setAutoFreeze(true);

    FirstStore.update(s => {
      for (const [index, arg] of s.objectSet.entries()) {
        const randomChanges = firstStoreObjectSetChanges[index];

        arg.anything = randomChanges.anything;
        arg.limit = arg.limit * 100 * randomChanges.limit;
        arg.isItGood = !arg.isItGood && randomChanges.isItGood;
        arg.queryString = `${arg.queryString}${randomChanges.queryString}`;
      }
    });
  })
  .add(`with no auto-freeze (false) and no original`, function() {
    setAutoFreeze(false);

    SecondStore.update(s => {
      for (const [index, arg] of s.objectSet.entries()) {
        const randomChanges = secondStoreObjectSetChanges[index];

        arg.anything = randomChanges.anything;
        arg.limit = arg.limit * 100 * randomChanges.limit;
        arg.isItGood = !arg.isItGood && randomChanges.isItGood;
        arg.queryString = `${arg.queryString}${randomChanges.queryString}`;
      }
    });
  })
  .add(`with default auto-freeze (true) and using original`, function() {
    setAutoFreeze(true);

    ThirdStore.update((s, original) => {
      for (const [index, arg] of original.objectSet.entries()) {
        const randomChanges = thirdStoreObjectSetChanges[index];

        s.objectSet[index] = {
          anything: randomChanges.anything,
          limit: arg.limit * 100 * randomChanges.limit,
          isItGood: !arg.isItGood && randomChanges.isItGood,
          queryString: `${arg.queryString}${randomChanges.queryString}`,
        };

        /*s.objectSet[index].anything = randomChanges.anything;
        s.objectSet[index].limit = arg.limit * 100 * randomChanges.limit;
        s.objectSet[index].isItGood = !arg.isItGood && randomChanges.isItGood;
        s.objectSet[index].queryString = `${arg.queryString}${randomChanges.queryString}`;*/
      }
    });
  })
  .add(`with no auto-freeze (false) and using original`, function() {
    setAutoFreeze(false);

    FourthStore.update((s, original) => {
      for (const [index, arg] of original.objectSet.entries()) {
        const randomChanges = fourthStoreObjectSetChanges[index];

        s.objectSet[index] = {
          anything: randomChanges.anything,
          limit: arg.limit * 100 * randomChanges.limit,
          isItGood: !arg.isItGood && randomChanges.isItGood,
          queryString: `${arg.queryString}${randomChanges.queryString}`,
        };

        /*s.objectSet[index].anything = randomChanges.anything;
        s.objectSet[index].limit = arg.limit * 100 * randomChanges.limit;
        s.objectSet[index].isItGood = !arg.isItGood && randomChanges.isItGood;
        s.objectSet[index].queryString = `${arg.queryString}${randomChanges.queryString}`;*/
      }
    });
  })
  .add(`with default auto-freeze (true) and full array change using original`, function() {
    setAutoFreeze(true);

    ThirdStore.update((s, original) => {
      s.objectSet = original.objectSet.map((arg, index) => {
        const randomChanges = thirdStoreObjectSetChanges[index];

        return {
          anything: randomChanges.anything,
          limit: arg.limit * 100 * randomChanges.limit,
          isItGood: !arg.isItGood && randomChanges.isItGood,
          queryString: `${arg.queryString}${randomChanges.queryString}`,
        };
      });
    });
  })
  .add(`with no auto-freeze (false) and full array change using original`, function() {
    setAutoFreeze(false);

    FourthStore.update((s, original) => {
      s.objectSet = original.objectSet.map((arg, index) => {
        const randomChanges = thirdStoreObjectSetChanges[index];

        return {
          anything: randomChanges.anything,
          limit: arg.limit * 100 * randomChanges.limit,
          isItGood: !arg.isItGood && randomChanges.isItGood,
          queryString: `${arg.queryString}${randomChanges.queryString}`,
        };
      });
    });
  })
  .on("error", function(event) {
    console.log(`An error occurred`);
    console.log(event);
  })
  .on("cycle", function(event) {
    console.log(String(event.target));
  })
  .on("complete", function() {
    console.log(`\n${suiteName} - Fastest is ` + this.filter("fastest").map("name"));
  })
  .run({ async: true });

/*
* array destructuring x 26,493 ops/sec ±0.57% (97 runs sampled)
object destructuring x 28,591 ops/sec ±0.28% (94 runs sampled)
object destructuring with renaming x 28,267 ops/sec ±0.37% (94 runs sampled)
* */
