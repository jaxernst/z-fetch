import { immer } from "zustand/middleware/immer";

import { getTokenKey, splitTokenKey } from "../lib/utils";
import {
  fetchCollectionTraits,
  fetchEns,
  fetchPaginatedStandaloneCollection,
  fetchToken,
} from "../lib/api-interface";
import { toast } from "react-toastify";
import create from "zustand";
import {
  type Chain,
  type EnsDomain,
  type EvmAddress,
  type TokenKey,
} from "../types/ethcoPrimitives";
import type {
  Traits,
  LikeInfo,
  NewToken,
  PiEns,
  V4AssetsQueryParams,
  PaginatedStandaloneCollection,
} from "../types/assetTypes";
import { reportSpamAsset } from "../lib/api-interface/authenticatedActions";
import { FetchedRecord, fetcherRecord } from "../src";

export interface AssetsState {
  likes: Record<TokenKey, LikeInfo>;
  tokens: FetchedRecord<TokenKey, NewToken>;
  ens: FetchedRecord<EnsDomain, PiEns>;
  paginatedCollections: FetchedRecord<
    EvmAddress,
    PaginatedStandaloneCollection
  >;
  collectionTraits: FetchedRecord<EvmAddress, Record<string, Traits>>;
}

export interface AssetsStateActions {
  setLikeInformation: (token: LikeInfo) => void;
  toggleSpam: (nft: {
    chain: Chain;
    address: TokenKey;
    spam?: boolean;
  }) => Promise<void>;
  getOrFetchDomain: (domain: EnsDomain) => PiEns | undefined;
  fetch: {
    ens: (domain: EnsDomain) => Promise<void>;
    traitValues: (
      chain: Chain,
      collection: EvmAddress,
      key: string
    ) => Promise<void>;
    token: (chain: Chain, collection: string, token: string) => Promise<void>;
    paginatedCollection: (
      collection: { address: EvmAddress; chain: Chain },
      opts?: V4AssetsQueryParams,
      force?: boolean
    ) => Promise<void>;
  };
}

const initState: AssetsState = {
  likes: {},
  tokens: fetcherRecord(),
  ens: fetcherRecord(),
  paginatedCollections: fetcherRecord(),
  collectionTraits: fetcherRecord(),
};

const assetsStore = immer<AssetsState & AssetsStateActions>((set, get) => {
  const { recordFetcher } = zFetch(set, get);
  return {
    ...initState,
    setLikeInformation: (token: LikeInfo) => {
      set((assets) => {
        assets.likes[`${token.contract_address}:${token.token_id}`] = token;
      });
    },
    toggleSpam: async (nft: {
      chain: Chain;
      address: TokenKey;
      spam?: boolean;
    }) => {
      const [collectionId, tokenId] = splitTokenKey(nft.address);
      await reportSpamAsset(nft.chain, collectionId, tokenId, !nft.spam);
      toast(`NFT ${!nft.spam ? "marked" : "unmarked"} as spam`, {
        autoClose: 5000,
        hideProgressBar: false,
      });
    },
    getOrFetchDomain: (domain: EnsDomain) => {
      const { ens } = get();
      if (!ens[domain]?.data) {
        void get().fetch.ens(domain);
        return;
      }
      return ens[domain]?.data;
    },
    fetch: {
      ens: recordFetcher((ensName: EnsDomain) => ({
        path: "ens",
        key: ensName,
        fetch: async () => {
          return await fetchEns(ensName);
        },
      })),

      traitValues: recordFetcher(
        (chain: Chain, collection: EvmAddress, key: string) => ({
          path: "collectionTraits",
          key: collection,
          fetch: async () => {
            return await fetchCollectionTraits(chain, collection, key);
          },
          reduce: (current, res) => {
            return {
              ...current,
              [key]: res,
            };
          },
        })
      ),

      token: recordFetcher(
        (chain: Chain, collection: string, token: string) => ({
          path: "tokens",
          key: getTokenKey(collection, token),
          noRefetch: true, // Only fetch each key a single time
          errorOnEmptyResult: true,
          fetch: async () => {
            return await fetchToken(chain, collection, token);
          },
        })
      ),

      paginatedCollection: recordFetcher(
        (
          collection: { address: EvmAddress; chain: Chain },
          opts?: V4AssetsQueryParams,
          force?: boolean
        ) => ({
          path: "paginatedCollections",
          key: collection.address,
          force,
          errorOnEmptyResult: true,
          fetch: async (current) => {
            if (current?.last_page) return;

            return await fetchPaginatedStandaloneCollection(
              collection.chain,
              collection.address,
              {
                ...opts,
                page: force ? "" : current?.next_page,
              }
            );
          },
          reduce: (prev, result) => {
            // Override store on force
            if (force) return result;

            return {
              ...prev,
              ...result,
              tokens: (prev?.tokens ?? []).concat(result.tokens),
            };
          },
        })
      ),
    },
  };
});

export const useAssetsStore = create(assetsStore);
