# zFetch

A lightweight, type-safe library for managing async state in Zustand stores. Similar to React Query or SWR, but specifically designed for Zustand's architecture and patterns.

## Why zFetch?

Managing async state in React applications often involves handling multiple states:

- Loading states
- Error states
- Data caching
- Request deduplication
- Retry logic

While solutions like React Query excel at this, they introduce their own state management patterns. zFetch brings these same capabilities directly to your Zustand stores, maintaining a consistent state management approach throughout your application.

## Installation

```bash
npm install z-fetch
or
yarn add z-fetch
```

## Basic Usage

```typescript
import { create } from 'zustand'
import { zFetch, fetcherStore } from 'z-fetch'
interface User {
id: number
name: string
}
interface State {
user: FetchedData<User>
fetchUser: (id: number) => Promise<void>
}
const useStore = create<State>((set, get) => {
const { fetcher } = zFetch(set, get)
return {
user: fetcherStore(),
fetchUser: fetcher((id: number) => ({
path: 'user',
fetch: () => fetch(/api/users/${id}).then(r => r.json())
}))
}
})
```

### Using in Components

```typescript
function UserProfile({ id }: { id: number }) {
  const { user, fetchUser } = useStore();
  useEffect(() => {
    fetchUser(id);
  }, [id]);
  if (user.loadingState === "loading") return <div>Loading...</div>;
  if (user.loadingState === "error") return <div>Error loading user</div>;
  if (!user.data) return null;
  return <div>Hello, {user.data.name}!</div>;
}
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
fetch: () => fetch(/api/users/${id}).then(r => r.json())
}))
}
})
```

### Custom Reducers

Transform fetch results before storing:

```typescript
fetchUser: fetcher((id: number) => ({
path: 'user',
fetch: () => fetch(/api/users/${id}).then(r => r.json()),
reduce: (prevData, newData) => ({
...newData,
lastUpdated: Date.now()
})
}))
```

## API Reference

### `zFetch(set, get)`

Creates a fetcher instance for your store.

### `fetcherStore<T>(initialData?: T)`

Creates an initial store state for fetchable data.

### `FetchOptions`

- `force?: boolean` - Force fetch even if data exists
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
