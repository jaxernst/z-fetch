import type { FetchedData, FetchOptions } from "."
import type { DeepIndex, FetcherObjectPath, Reducer } from "./typeUtil"
import { getAtPath, makePathUpdater, shouldFetch as _shouldFetch } from "./util"

export type FetcherAction<
  StoreSchema extends object,
  ActionArgs extends any[],
  Path extends string & FetcherObjectPath<StoreSchema>,
  TFetchStored extends DeepIndex<StoreSchema, Path>["data"],
  TFetchResult,
  AssertFetchResult
> = (...args: ActionArgs) => {
  path: Path
} & FetchOptions & { errorOnEmptyResult?: AssertFetchResult } & (
    | {
        fetch: (currentData: TFetchStored | undefined) => Promise<TFetchResult>
        reduce: Reducer<TFetchStored, TFetchResult, AssertFetchResult>
      }
    | {
        fetch: (
          currentData: TFetchStored | undefined
        ) => Promise<TFetchStored | undefined>
      }
  )

export function fetcher<
  State extends object,
  ActionArgs extends any[],
  Path extends string & FetcherObjectPath<State>,
  TFetchStored extends DeepIndex<State, Path>["data"],
  TFetchResult,
  AssertFetchResult
>(
  set: (updater: (state: State) => State) => void,
  get: () => State,
  action: FetcherAction<
    State,
    ActionArgs,
    Path,
    TFetchStored,
    TFetchResult,
    AssertFetchResult
  >
): (...args: ActionArgs) => Promise<void> {
  const updateAtPath = makePathUpdater(set)
  const pendingFetchIds = new Set()

  return async (...args) => {
    const { path, fetch, ...opts } = action(...args)

    let reduce:
      | Reducer<TFetchStored, TFetchResult, AssertFetchResult>
      | undefined

    if ("reduce" in opts) {
      reduce = opts.reduce
    }

    const splitPath = path.split(".")

    const fetcherStore = getAtPath<FetchedData<TFetchStored>>(splitPath, get())

    const shouldFetch = _shouldFetch(fetcherStore, opts)
    if (!shouldFetch) return

    if (opts.force) {
      pendingFetchIds.clear()
    }

    updateAtPath(splitPath, { loadingState: "loading" })

    const fetchId = Math.random().toString(36).substring(2, 15)
    pendingFetchIds.add(fetchId)

    try {
      const result = await fetch(fetcherStore.data)

      if (pendingFetchIds.has(fetchId)) {
        pendingFetchIds.delete(fetchId)
      } else {
        // Request cancelled
        return
      }

      if (!result && opts.errorOnEmptyResult) throw new Error("No result")

      const newStoreData = reduce ? reduce(fetcherStore.data, result!) : result
      updateAtPath(splitPath, {
        data: newStoreData,
        loadingState: "loaded",
      })
    } catch {
      updateAtPath(splitPath, {
        data: fetcherStore.data,
        loadingState: "error",
      })
    }
  }
}
