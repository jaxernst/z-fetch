import create from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  FetchedTopAccount,
  UnregisteredEnsSuggestions,
} from "../types/preloadTypes";
import { safeEthcoUrl } from "../lib/utils";
import Cookies from "js-cookie";
import {
  fetchMostViewedNfts,
  fetchDiscoverData,
  fetchTopSupporters,
  fetchTopViewed,
  fetchUsers,
  fetchRandomNfts,
} from "../lib/api-interface";
import { getPreload } from "../lib/preload";
import {
  type EvmAddress,
  type RankMetric,
  type StatsRange,
} from "../types/ethcoPrimitives";
import { type CompactAccount } from "../types/userTypes";
import {
  type DiscoveryRandom,
  type CollectionToken,
  type DiscoveryRecent,
} from "../types/assetTypes";
import {
  zFetch,
  fetcherRecord,
  fetcherStore,
  type FetchedData,
  type FetchedRecord,
} from "./zFetchLib";
import {
  type FarcasterUsernameData,
  fetchFarcasterUsername,
} from "../lib/api-interface/farcasterInterface";

export type TopAccount = Omit<FetchedTopAccount, "stat_type" | "stat_value"> & {
  statValue: number | null;
  statType: RankMetric;
  position: number;
};

export interface GlobalState {
  matches: Record<string, string>;
  userRecord: FetchedRecord<EvmAddress, CompactAccount>;
  fidUsernameRecord: FetchedRecord<number, FarcasterUsernameData>;
  unregisteredEnsSuggestions: UnregisteredEnsSuggestions | undefined;
  showFirstConnectTip: boolean;
  theme: "light" | "dark";
  topViewedProfiles: Record<StatsRange, FetchedData<TopAccount[]>>;
  topSupporters: Record<
    StatsRange,
    FetchedData<{ collectors: TopAccount[]; creators: TopAccount[] }>
  >;
  discoveryRecent: FetchedData<DiscoveryRecent>;
  randomNfts: FetchedData<DiscoveryRandom>;
  mostViewedNfts: FetchedData<CollectionToken[]>;
  flags?: {
    debug: string | null;
    creatorMode: string | null;
  };
}

export interface GlobalStateActions {
  init: () => void;
  setRouteMatches: (matches: Record<string, string>) => void;
  setShowFirstConnectTip: (showFirstConnectTip: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;
  fetch: {
    user: (address: EvmAddress) => Promise<void>;
    fidUsername: (fid: number) => Promise<void>;
    topViewedProfiles: (range: StatsRange, force?: boolean) => Promise<void>;
    topSupporters: (range: StatsRange, force?: boolean) => Promise<void>;
    discoveryRecent: () => Promise<void>;
    randomNfts: () => Promise<void>;
    mostViewedNfts: () => Promise<void>;
  };
}

const initState: GlobalState = {
  theme: "light",
  showFirstConnectTip: false,
  matches: {},
  userRecord: fetcherRecord(),
  fidUsernameRecord: fetcherRecord(),
  unregisteredEnsSuggestions: getPreload("unregistered_ens_suggestions"),
  topSupporters: {
    daily: fetcherStore(),
    weekly: fetcherStore(),
    monthly: fetcherStore(),
    quarterly: fetcherStore(),
    yearly: fetcherStore(),
    alltime: fetcherStore(),
  },
  topViewedProfiles: {
    daily: fetcherStore(),
    weekly: fetcherStore(),
    monthly: fetcherStore(),
    quarterly: fetcherStore(),
    yearly: fetcherStore(),
    alltime: fetcherStore(),
  },
  discoveryRecent: fetcherStore(),
  randomNfts: fetcherStore(),
  mostViewedNfts: fetcherStore(),
};

export const globalStore = immer<GlobalState & GlobalStateActions>(
  (set, get) => {
    const { fetcher, recordFetcher } = zFetch(set, get);

    return {
      ...initState,
      init: () => {
        const search = window.location.search;
        const params = new URLSearchParams(search);
        const debug = params.get("debug");
        const creatorMode = params.get("creatorMode");

        set((state) => {
          state.flags = {
            debug,
            creatorMode,
          };
        });
      },
      setShowFirstConnectTip: (showFirstConnectTip: boolean) => {
        set((state) => {
          state.showFirstConnectTip = showFirstConnectTip;
        });
      },
      setRouteMatches: (matches) => {
        set((state) => {
          state.matches = matches;
        });
      },
      setTheme: (theme: "light" | "dark") => {
        set((state) => {
          state.theme = theme;
        });

        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }

        const host = new URL(safeEthcoUrl({})).hostname;
        Cookies.set("theme", theme, { domain: host });
      },

      fetch: {
        user: recordFetcher((user: EvmAddress) => ({
          path: "userRecord",
          key: user,
          noRefetch: true,
          fetch: async () => await fetchUsers([user]),
          reduce: (_, res) => res[0],
        })),

        fidUsername: recordFetcher((fid: number) => ({
          path: "fidUsernameRecord",
          key: fid,
          noRefetch: true,
          fetch: async () => await fetchFarcasterUsername(fid),
        })),

        topViewedProfiles: fetcher((range: StatsRange, force?: boolean) => ({
          path: `topViewedProfiles.${range}`,
          force,
          noRefetch: true,
          errorOnEmptyResult: true,
          fetch: async () => {
            return await fetchTopViewed(range);
          },
          reduce: (_, result) => {
            return result.map((profile, i) => {
              return {
                ...profile,
                statType: "views",
                statValue: profile.stat_value,
                position: i + 1,
              } satisfies TopAccount;
            });
          },
        })),

        topSupporters: fetcher((range: StatsRange, force?: boolean) => ({
          path: `topSupporters.${range}`,
          force,
          noRefetch: true,
          errorOnEmptyResult: true,
          fetch: async () => {
            return await fetchTopSupporters(range);
          },
          reduce: (_, result) => {
            const resultMapping =
              (statType: RankMetric) =>
              (item: FetchedTopAccount, i: number) => {
                return {
                  ...item,
                  statType,
                  statValue: item.stat_value,
                  position: i + 1,
                };
              };

            return {
              creators: result.top_creators.map(resultMapping("creators")),
              collectors: result.top_holders.map(resultMapping("collectors")),
            };
          },
        })),

        discoveryRecent: fetcher(() => ({
          path: "discoveryRecent",
          noRefetch: true,
          fetch: fetchDiscoverData,
        })),

        randomNfts: fetcher(() => ({
          path: "randomNfts",
          fetch: fetchRandomNfts,
        })),

        mostViewedNfts: fetcher(() => ({
          path: "mostViewedNfts",
          noRefetch: true,
          fetch: fetchMostViewedNfts,
        })),
      },
    };
  }
);

export const useGlobalStore = create(globalStore);

// Utility function to retrieve cache compact accounts from outside rendering methods
export const getOrFetchUser = async (
  address: EvmAddress
): Promise<CompactAccount> => {
  const user = useGlobalStore.getState().userRecord[address];
  if (user.data) return user.data;

  await useGlobalStore.getState().fetch.user(address);

  return (
    useGlobalStore.getState().userRecord[address].data ?? {
      address,
      verified: false,
    }
  );
};

export const getOrFetchUserSync = (address: EvmAddress): CompactAccount => {
  const user = useGlobalStore.getState().userRecord[address];
  if (user?.data) return user.data;

  void useGlobalStore.getState().fetch.user(address);

  return (
    useGlobalStore.getState().userRecord[address].data ?? {
      address,
      verified: false,
    }
  );
};
