# zFetch - Zustand async state management

A lightweight no-dependency library for managing async state in Zustand stores. zFetch manages fetch loading states, error states, retry logic, request deduplication, and more. 

### Why zFetch?
A common pattern for fetching with Zustand stores involves manually setting loading states for the api consumer. This results in verbose and error-prone code that only grows in complexity from here:

```typescript
const store = create(
  immer<State & StateActions>((set, get) => {
    return {
      result: { isLoading: false, isError: false, result: null },

      fetchResult: async () => {
        if (get().isLoading) return

        set((state) => {
          result.isLoading = true
        })

        try {
          res = await fetchSomeData()
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

zFetch provides a type-safe api to manage these states:

```typescript
import { zFetch, fetcherStore } from "zFetchLib"

const store = create(
  immer<GlobalState & GlobalStateActions>((set, get) => {
    const { fetcher } = zFetch(set, get)

    return {
      result: fetcherStore(),

      fetchResult: fetcher(() => ({
        path: "result",
        query: fetchSomeData,
      })),
    }
  })
)
```
        
