# zFetch

A lightweight, type-safe library for managing async state in Zustand stores. Similar to React Query or SWR, but specifically designed for Zustand's architecture and patterns.

## Why zFetch?

Managing async state in React and other frontend frameworks typically requires duplicative code that is error-prone and grows in complexity as the fetching needs of your app change over time. Zustand is almost a great solution for fetching application state, but inevitably requires loading states, error states, and more advanced logic to be handled:

```typescript
const store = create(
  immer<State & StateActions>((set, get) => {
    return {
      result: { isLoading: false, isError: false, data: null },

      fetchResult: async () => {
        if (get().isLoading) return

        set((state) => {
          result.isLoading = true
        })

        try {
          res = await fetchSomeData(params)

          if (!res.ok) throw

          set((state) => {
            state.result = res
          })
        } catch {
          set((state) => {
            state.isError = true
          })
        } finally {
          set((state) => {
            state.isLoading = true
          })
        }
      },
    }
  })
)

```

zFetch provides a light and type-safe extension to the Zustand api to manage these basic states, and provide additional async state management helpers:

```typescript
import { zFetch, fetcherState } from "zFetchLib"

const store = create(
  immer<UserState & UserActions>((set, get) => {
    const { fetcher } = zFetch(set, get)

    return {
      user: {
        likes: fetcherState(),
        followers: fetcherState()
      }

      fetchFollowers: fetcher(() => ({
        path: "user.followers", // Set the location to store fetched data
        query: fetchFromUserApi, // Type safe query: Success case should return the expected type at user.followers
      })),
    }
  })
)
```


## Advanced Features

### Record Fetching

For managing collections of entities:

```typescript
const useStore = create((set, get) => {
  const { recordFetcher } = zFetch(set, get)
  return {
    users: fetcherRecord<string, User>(),

    fetchUser: recordFetcher((id: string) => ({
      path: 'users',
      key: id,
      query: () => fetch(/api/users/${id}).then(r => r.json())
    }))
  }
})
```

### Custom Reducers

Transform fetch results before storing. Values returned from the 'fetch' call will be passed to the reducer to be transformed into the expected type at 'path':

```typescript
fetchUser: fetcher((uid: number) => ({
  path: 'user.totalLikes',
  fetch: () => fetch(/api/likes/${uid}).then(r => r.json()),
  reduce: (_prevData, newData) => ({
    ...newData,
    lastUpdated: Date.now()
  })
}))
```

## API Reference

### `FetchOptions`

Fetch options can be applied when creating a fetcher(), but can be overwritten on individual 'fetch' calls.

- `force?: boolean` - Force refetch even if data exists
- `noRefetch?: boolean` - Prevent refetching if data exists
- `errorOnEmptyResult?: boolean` - Treat empty results as errors

## License

MIT © Jackson Ernst

## Roadmap

### 1.0 Release

- [ ] Core Functionality
  - [ ] Comprehensive test coverage
  - [ ] Proper TypeScript types and inference
  - [ ] Basic error handling
  - [ ] Request deduplication
  - [ ] Simple caching strategy

### Basic Features

- [ ] Loading States
  - [ ] Initial loading
  - [ ] Refresh loading
  - [ ] Error states
- [ ] Data Management
  - [ ] Cache invalidation
  - [ ] Automatic revalidation
  - [ ] Optimistic updates
- [ ] Error Handling

  - [ ] Retry logic
  - [ ] Error boundaries
  - [ ] Timeout handling

- [ ] Developer Experience
  - [ ] Complete documentation
  - [ ] Usage examples
  - [ ] Type-safe APIs

## Contributing

We welcome contributions! Please see our contributing guidelines for details.
