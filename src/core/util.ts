import type { FetchedData, FetchedRecord, FetchOptions, Key } from "../types";

export function makePathUpdater<State extends object>(
  set: (updater: (state: State) => State) => void
) {
  return (path: string[], fetcherStoreUpdate: Partial<FetchedData<any>>) => {
    set((state) => {
      const current = getAtPath<FetchedData<any>>(path, state);
      return updateObjectAtPath(state, path, {
        ...current,
        ...fetcherStoreUpdate,
      });
    });
  };
}

export function makeRecordPathUpdater<State extends object, K extends Key>(
  set: (updater: (state: State) => State) => void
) {
  return (
    path: string[],
    recordKey: K,
    fetcherStoreUpdate: Partial<FetchedData<any>>
  ) => {
    set((state) => {
      const record = getAtPath<FetchedRecord<K, any>>(path, state);

      const currentItem = record[recordKey] ?? {
        data: undefined,
        loadingState: "none",
      };

      return updateObjectAtPath(state, path, {
        ...record,
        [recordKey]: {
          ...currentItem,
          ...fetcherStoreUpdate,
        },
      });
    });
  };
}

export function getAtPath<T extends FetchedRecord<Key, any> | FetchedData<any>>(
  splitPath: string[],
  state: any
): T {
  return splitPath.reduce((obj, k) => {
    return obj[k];
  }, state);
}

export function updateObjectAtPath<T extends Record<string, any>>(
  obj: T,
  path: string[],
  newValue: unknown
): T {
  const [currentKey] = path;
  if (
    !(currentKey && currentKey in obj && typeof obj[currentKey] === "object")
  ) {
    return obj;
  }

  if (path.length === 1) {
    return {
      ...obj,
      [currentKey]: newValue,
    };
  }

  return {
    ...obj,
    [currentKey]: updateObjectAtPath(obj[currentKey], path.slice(1), newValue),
  };
}

export function shouldFetch(
  { loadingState, data }: FetchedData<any>,
  opts?: FetchOptions
) {
  if (opts?.force) return true;
  if (loadingState === "loading") return false;
  if (opts?.noRefetch && data) return false;

  const retryLimitReached = true;
  if (loadingState === "error" && retryLimitReached) return false;

  return true;
}
