import type { Key } from "./util";

export { Key };

export type LoadingState = "none" | "loading" | "loaded" | "error";

export interface FetchedData<T> {
  data: T | undefined;
  loadingState: LoadingState;
}

export type FetchedRecord<K extends Key, T> = Record<K, FetchedData<T>>;

export interface FetchOptions {
  force?: boolean;
  noRefetch?: boolean;
  errorOnEmptyResult?: boolean;
}
