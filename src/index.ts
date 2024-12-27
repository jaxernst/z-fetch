import { fetcher as _fetcher, type FetcherAction } from "./fetcher";
import {
  recordFetcher as _recordFetcher,
  type RecordFetcherAction,
} from "./recordFetcher";
import type {
  FetcherObjectPath,
  DeepIndex,
  RecordFetcherObjectPath,
  PathRecordValue,
  Key,
} from "./typeUtil";

/**
 * Fetch Utility for zustand + immer stores
 *  - Auto manage loading and error states for queryable data
 *  - Customize retry fetch logic
 *  - Avoid duplicate fetching from React hooks
 *  - Manage fetching of keyed records
 *
 * Planned api changes:
 *  - Abstract away the 'immer' call when creating the store
 *  - Loading state to be replaced with isLoading, isError, error
 *  - To add a 'hasFetched' flag to substitute checking: loading === "none"
 *  - To rename 'FetchedData' to 'FetcherStore' for consistancy
 *  - To rename 'FetchedRecord' to 'FetcherRecord' for consistancy
 */

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

const initialLoadingState: LoadingState = "none";

export const fetcherStore = <T>(initialData?: T): FetchedData<T> => {
  return { data: initialData, loadingState: initialLoadingState };
};

export const fetcherRecord = <K extends Key, T>(
  initialData?: Record<K, T>
): FetchedRecord<K, T> => {
  if (initialData) {
    const values = Object.values(initialData) as Array<[K, T]>;
    return values.reduce<FetchedRecord<K, T>>((acc, [key, val]) => {
      return { ...acc, [key]: fetcherStore(val) };
    }, {} as any);
  }

  return {} as FetchedRecord<K, T>;
};

export function zFetch<State extends object>(
  set: (updater: (state: State) => State) => void,
  get: () => State
) {
  return {
    fetcher: <
      ActionArgs extends any[],
      Path extends string & FetcherObjectPath<State>,
      TFetchStored extends DeepIndex<State, Path>["data"],
      TFetchResult,
      AssertFetchResult,
    >(
      action: FetcherAction<
        State,
        ActionArgs,
        Path,
        TFetchStored,
        TFetchResult,
        AssertFetchResult
      >
    ) => {
      return _fetcher(set, get, action);
    },
    recordFetcher: <
      ActionArgs extends any[],
      Path extends string & RecordFetcherObjectPath<State>,
      TFetchStored extends PathRecordValue<State, Path>,
      TFetchResult,
      AssertFetchResult,
    >(
      action: RecordFetcherAction<
        State,
        ActionArgs,
        Path,
        TFetchStored,
        TFetchResult,
        AssertFetchResult
      >
    ) => _recordFetcher(set, get, action),
  };
}
