import { fetcherStore, type FetchedRecord, type FetchOptions } from ".";

import type {
  Key,
  PathRecordValue,
  RecordFetcherObjectPath,
  Reducer,
} from "./typeUtil";

import {
  getAtPath,
  makeRecordPathUpdater,
  shouldFetch as _shouldFetch,
} from "./util";

export type RecordFetcherAction<
  State extends object,
  ActionArgs extends any[],
  Path extends string & RecordFetcherObjectPath<State>,
  TRecord extends PathRecordValue<State, Path>,
  TFetchResult,
  AssertFetchResult
> = (...args: ActionArgs) => {
  key: TRecord["key"];
  path: Path;
} & FetchOptions & { errorOnEmptyResult?: AssertFetchResult } & (
    | {
        fetch: (
          currentData: TRecord["val"] | undefined
        ) => Promise<TFetchResult>;
        reduce: Reducer<TRecord["val"], TFetchResult, AssertFetchResult>;
      }
    | {
        fetch: (
          currentData: TRecord["val"] | undefined
        ) => Promise<TFetchResult | undefined>;
      }
  );

export function recordFetcher<
  State extends object,
  ActionArgs extends any[],
  Path extends string & RecordFetcherObjectPath<State>,
  TRecord extends PathRecordValue<State, Path>,
  TFetchResult,
  AssertFetchResult
>(
  set: (updater: (state: State) => State) => void,
  get: () => State,
  action: RecordFetcherAction<
    State,
    ActionArgs,
    Path,
    TRecord,
    TFetchResult,
    AssertFetchResult
  >
): (...args: ActionArgs) => Promise<void> {
  const updateRecordItem = makeRecordPathUpdater(set);

  return async (...args) => {
    const { path, key, fetch: fetchKey, ...opts } = action(...args);

    let reduce:
      | Reducer<TRecord["val"], TFetchResult, AssertFetchResult>
      | undefined;

    if ("reduce" in opts) {
      reduce = opts.reduce;
    }

    const splitPath = path.split(".");

    const record = getAtPath<FetchedRecord<Key, TRecord["val"]>>(
      splitPath,
      get()
    );

    const recordItem = record[key] ?? fetcherStore();

    const shouldFetch = _shouldFetch(recordItem, opts);
    if (!shouldFetch) return;

    updateRecordItem(splitPath, key, { loadingState: "loading" });

    try {
      const result = await fetchKey(recordItem.data);
      if (!result && opts.errorOnEmptyResult) throw new Error("No result");

      // Must assert result because the 'AssertResult' generic cannot be infered
      // from the opts.errorOnEmptyResult check above
      const newStoreData = reduce ? reduce(recordItem.data, result!) : result;

      updateRecordItem(splitPath, key, {
        data: newStoreData,
        loadingState: "loaded",
      });
    } catch {
      updateRecordItem(splitPath, key, {
        data: recordItem?.data,
        loadingState: "error",
      });
    }
  };
}
