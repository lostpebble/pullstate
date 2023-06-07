export type Primitive = null | undefined | string | number | boolean | symbol | bigint;

type ArrayKey = number;

type IsTuple<T extends readonly any[]> = number extends T["length"] ? false : true;

type TupleKeys<T extends readonly any[]> = Exclude<keyof T, keyof any[]>;

export type PathStringConcat<TKey extends string | number, TValue> = TValue extends Primitive
  ? `${TKey}`
  : `${TKey}` | `${TKey}.${PathString<TValue>}`;

export type PathString<T> = T extends readonly (infer V)[]
  ? IsTuple<T> extends true
    ? {
        [K in TupleKeys<T>]-?: PathStringConcat<K & string, T[K]>;
      }[TupleKeys<T>]
    : PathStringConcat<ArrayKey, V>
  : {
      [K in keyof T]-?: PathStringConcat<K & string, T[K]>;
    }[keyof T];

type ArrayPathStringConcat<TKey extends string | number, TValue> = TValue extends Primitive
  ? never
  : TValue extends readonly (infer U)[]
  ? U extends Primitive
    ? never
    : `${TKey}` | `${TKey}.${ArrayPathString<TValue>}`
  : `${TKey}.${ArrayPathString<TValue>}`;

export type ArrayPathString<T> = T extends readonly (infer V)[]
  ? IsTuple<T> extends true
    ? {
        [K in TupleKeys<T>]-?: ArrayPathStringConcat<K & string, T[K]>;
      }[TupleKeys<T>]
    : ArrayPathStringConcat<ArrayKey, V>
  : {
      [K in keyof T]-?: ArrayPathStringConcat<K & string, T[K]>;
    }[keyof T];

export type PathValue<T, TPath extends PathString<T> | ArrayPathString<T>> = T extends any
  ? TPath extends `${infer K}.${infer R}`
    ? K extends keyof T
      ? R extends PathString<T[K]>
        ? undefined extends T[K]
          ? PathValue<T[K], R> | undefined
          : PathValue<T[K], R>
        : never
      : K extends `${ArrayKey}`
      ? T extends readonly (infer V)[]
        ? PathValue<V, R & PathString<V>>
        : never
      : never
    : TPath extends keyof T
    ? T[TPath]
    : TPath extends `${ArrayKey}`
    ? T extends readonly (infer V)[]
      ? V
      : never
    : never
  : never;
