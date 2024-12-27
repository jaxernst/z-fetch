import {
  type AssociationParams,
  type FeedFilters,
  fetchAccountAssociatesFeed,
  fetchAccountFeed,
  fetchAccountFollowersFeed,
  fetchEveryoneFeed,
} from "../lib/api-interface";
import create from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  ActivityFeedItem as ActivityFeedItemSchema,
  ActivityFeedSchema,
} from "../lib/api-interface/schemas";
import { type z } from "zod";

import { type EvmAddress } from "../types/ethcoPrimitives";
import { fetcherRecord } from "../src";

export type ActivityFeed = z.infer<typeof ActivityFeedSchema>;

export type ActivityFeedItem = z.infer<typeof ActivityFeedItemSchema>;

export const emptyActivityFeed: ActivityFeed = {
  items: [],
  last_page: false,
  next_page: null,
  number_of_fetched_items: 0,
  feed_metadata: {},
};

const lastPageFeed = { ...emptyActivityFeed, last_page: true };

const defaultParams: Partial<FeedFilters> = { max_per_day_per_account: 3 };

interface ActivityFeedState {
  everyone: FetchedData<ActivityFeed>;
  account: FetchedRecord<EvmAddress, ActivityFeed>;
  associates: FetchedData<ActivityFeed>;
  followers: FetchedData<ActivityFeed>;
}

interface ActivityFeedActions {
  fetchPage: {
    everyone: (filters: FeedFilters, force?: boolean) => Promise<void>;
    account: (
      address: EvmAddress,
      filters: FeedFilters,
      force?: boolean
    ) => Promise<void>;
    followers: (
      account: EvmAddress,
      filters: FeedFilters,
      force?: boolean
    ) => Promise<void>;
    associates: (
      account: EvmAddress,
      filters: FeedFilters & { association_params: AssociationParams },
      force?: boolean
    ) => Promise<void>;
  };
}

const initialState: ActivityFeedState = {
  account: fetcherRecord(),
  everyone: fetcherStore(),
  associates: fetcherStore(),
  followers: fetcherStore(),
};

const resultReducer =
  (force?: boolean) =>
  (curFeed: ActivityFeed | undefined, pageResult: ActivityFeed) => {
    if (force) return pageResult; // Override feed on 'force'

    return {
      ...pageResult,
      items: (curFeed?.items ?? []).concat(pageResult?.items ?? []),
    };
  };

export const useActivityFeed = create(
  immer<ActivityFeedState & ActivityFeedActions>((set, get) => {
    const { fetcher, recordFetcher } = zFetch(set, get);

    return {
      ...initialState,

      fetchPage: {
        everyone: fetcher((filterParams, force) => ({
          path: "everyone",
          force,
          errorOnEmptyResult: true,
          fetch: async (cur) => {
            if (cur?.last_page && !force) return lastPageFeed;

            return await fetchEveryoneFeed({
              ...filterParams,
              ...defaultParams,
              page: force ? null : cur?.next_page,
            });
          },

          reduce: resultReducer(force),
        })),

        account: recordFetcher((account, filterParams, force) => ({
          path: "account",
          key: account,
          force,
          errorOnEmptyResult: true,
          fetch: async (cur) => {
            if (cur?.last_page && !force) return lastPageFeed;

            return await fetchAccountFeed(account, {
              ...filterParams,
              page: force ? null : cur?.next_page,
            });
          },

          reduce: resultReducer(force),
        })),

        followers: fetcher((account, filterParams, force) => ({
          path: "followers",
          force,
          errorOnEmptyResult: true,
          fetch: async (cur) => {
            if (cur?.last_page && !force) return lastPageFeed;

            return await fetchAccountFollowersFeed(account, {
              ...filterParams,
              ...defaultParams,
              page: force ? null : cur?.next_page,
            });
          },

          reduce: resultReducer(force),
        })),

        associates: fetcher((account, filterParams, force) => ({
          path: "associates",
          force,
          errorOnEmptyResult: true,
          fetch: async (cur) => {
            if (cur?.last_page && !force) return emptyActivityFeed;

            return await fetchAccountAssociatesFeed(account, {
              ...filterParams,
              ...defaultParams,
              page: force ? null : cur?.next_page,
            });
          },

          reduce: resultReducer(force),
        })),
      },
    };
  })
);
