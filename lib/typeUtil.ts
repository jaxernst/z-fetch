import type { FetchedData, FetchedRecord } from "."

export type Key = string | number | symbol

export type Reducer<TStore, TResult, AssertResult = false> = (
  prev: TStore | undefined,
  result: AssertResult extends true ? NonNullable<TResult> : TResult
) => TStore

type Dot<T extends string, U extends string> = `${T}.${U}`

// Helper type for recursively building paths with dot notation
type NestedPath<T> = {
  [K in keyof T & string]: T[K] extends FetchedData<any>
    ? K
    : T[K] extends object
    ? Dot<K, FetcherObjectPath<T[K]>>
    : never
}[keyof T & string]

export type FetcherObjectPath<T> = T extends object
  ? T extends readonly unknown[]
    ? FetcherObjectPath<T[number]>
    : NestedPath<T>
  : never

type RecordNestedPath<T> = {
  [K in keyof T & string]: T[K] extends FetchedRecord<Key, any>
    ? K
    : T[K] extends object
    ? Dot<K, RecordFetcherObjectPath<T[K]>>
    : never
}[keyof T & string]

export type RecordFetcherObjectPath<T> = T extends object
  ? T extends readonly unknown[]
    ? RecordFetcherObjectPath<T[number]>
    : RecordNestedPath<T>
  : never

type Idx<T, K extends string> = K extends keyof T ? T[K] : never

export type PathRecordValue<
  State,
  Path extends string & RecordFetcherObjectPath<State>
> = DeepIndex<State, Path> extends Record<
  infer KeyType,
  FetchedData<infer ValType>
>
  ? { key: KeyType; val: ValType }
  : never

export type DeepIndex<T, K extends string> = T extends object
  ? K extends `${infer F}.${infer R}`
    ? DeepIndex<Idx<T, F>, R>
    : Idx<T, K>
  : never
