// prettier-ignore

type ExtractObj<S extends object, K> = K extends keyof S ? S[K] : never

export type ObjectPath<S extends object, T extends readonly unknown[]> =
  T extends readonly [infer T0, ...infer TR]
    ? TR extends []
      ? ExtractObj<S, T0> extends never
        ? readonly []
        : readonly [T0]
      : ExtractObj<S, T0> extends object
        ? readonly [T0, ...ObjectPath<ExtractObj<S, T0>, TR>]
        : ExtractObj<S, T0> extends never
          ? readonly []
          : readonly [T0]
    : readonly []

/*
export interface DeepKeyOfArray<O> extends Array<string | number> {
  ["0"]: keyof O;
  ["1"]?: this extends {
    ["0"]: infer K0
  } ?
    K0 extends keyof O ?
      O[K0] extends Array<any> ?
        number
        :
        keyof O[K0]
      :
      never
    :
    never;
  [rest: string]: any;
}

export type TAllPathsParameter<S> =
  | [DeepKeyOfArray<S>]
  | [DeepKeyOfArray<S>, DeepKeyOfArray<S>]
  | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
  | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
  | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
  | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
  | [
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>
    ]
  | [
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>
    ]
  | [
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>
    ]
  | [
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>,
      DeepKeyOfArray<S>
    ];

export type ArrayHasIndex<MinLength extends string> = { [K in MinLength]: any };

export type DeepTypeOfArray<T, L extends DeepKeyOfArray<T> | undefined> = L extends ArrayHasIndex<
  "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7"
>
  ? any
  : L extends ArrayHasIndex<"0" | "1" | "2" | "3" | "4" | "5" | "6">
  ? T[L["0"]][L["1"]][L["2"]][L["3"]][L["4"]][L["5"]][L["6"]]
  : L extends ArrayHasIndex<"0" | "1" | "2" | "3" | "4" | "5">
  ? T[L["0"]][L["1"]][L["2"]][L["3"]][L["4"]][L["5"]]
  : L extends ArrayHasIndex<"0" | "1" | "2" | "3" | "4">
  ? T[L["0"]][L["1"]][L["2"]][L["3"]][L["4"]]
  : L extends ArrayHasIndex<"0" | "1" | "2" | "3">
  ? T[L["0"]][L["1"]][L["2"]][L["3"]]
  : L extends ArrayHasIndex<"0" | "1" | "2">
  ? T[L["0"]][L["1"]][L["2"]]
  : L extends ArrayHasIndex<"0" | "1">
  ? T[L["0"]][L["1"]]
  : L extends ArrayHasIndex<"0">
  ? T[L["0"]]
  : never;
*/
