import { describe, it, expect, vi } from "vitest";
import { create } from "zustand";
import { zFetch, fetcherStore, type FetchedData } from "../src";

interface TestUser {
  id: number;
  name: string;
  email: string;
}

interface TestPost {
  id: number;
  title: string;
  body: string;
}

interface TestStore {
  user: FetchedData<TestUser>;
  users: FetchedData<TestUser[]>;
  posts: FetchedData<Record<number, TestPost>>;
  fetchUser: (id: number) => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchPosts: () => Promise<void>;
}

describe("zFetch", () => {
  it("should handle successful single entity fetch", async () => {
    const mockUser: TestUser = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
    };

    const store = create<TestStore>((set, get) => {
      const { fetcher } = zFetch(set, get);

      return {
        user: fetcherStore(),
        users: fetcherStore(),
        posts: fetcherStore(),
        fetchUser: fetcher(() => ({
          path: "user",
          fetch: async () => mockUser,
        })),
        fetchUsers: fetcher(() => ({
          path: "users",
          fetch: async () => [mockUser],
        })),
        fetchPosts: fetcher(() => ({
          path: "posts",
          fetch: async () => ({ 1: { id: 1, title: "Test", body: "Content" } }),
        })),
      };
    });

    await store.getState().fetchUser(1);

    const state = store.getState();
    expect(state.user.loadingState).toBe("loaded");
    expect(state.user.data).toEqual(mockUser);
  });

  it("should handle fetch errors with retry logic", async () => {
    let attempts = 0;

    const store = create<TestStore>((set, get) => {
      const { fetcher } = zFetch(set, get);

      return {
        user: fetcherStore(),
        users: fetcherStore(),
        posts: fetcherStore(),
        fetchUser: fetcher(() => ({
          path: "user",
          fetch: async () => {
            attempts++;
            if (attempts < 3) {
              throw new Error("Failed");
            }
            return { id: 1, name: "Test", email: "test@example.com" };
          },
        })),
        fetchUsers: fetcher(() => ({
          path: "users",
          fetch: async () => [],
        })),
        fetchPosts: fetcher(() => ({
          path: "posts",
          fetch: async () => ({}),
        })),
      };
    });

    await store.getState().fetchUser(3);

    const state = store.getState();
    expect(attempts).toBe(3);
    expect(state.user.loadingState).toBe("loaded");
  });

  it("should handle empty results with errorOnEmptyResult option", async () => {
    const store = create<TestStore>((set, get) => {
      const { fetcher } = zFetch(set, get);

      return {
        user: fetcherStore(),
        users: fetcherStore(),
        posts: fetcherStore(),
        fetchUser: fetcher(() => ({
          path: "user",
          fetch: async () => null as any,
          errorOnEmptyResult: true,
        })),
        fetchUsers: fetcher(() => ({
          path: "users",
          fetch: async () => [],
        })),
        fetchPosts: fetcher(() => ({
          path: "posts",
          fetch: async () => ({}),
        })),
      };
    });

    await store.getState().fetchUser(1);

    const state = store.getState();
    expect(state.user.loadingState).toBe("error");
  });
});
