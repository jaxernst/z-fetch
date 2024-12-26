import { describe, it, expect, vi } from 'vitest'
import { create } from 'zustand'
import { zFetch, fetcherStore } from '../src'

describe('zFetch', () => {
  it('should handle successful fetches', async () => {
    const mockData = { id: 1, name: 'Test' }
    
    const store = create((set, get) => {
      const { fetcher } = zFetch(set, get)
      
      return {
        data: fetcherStore(),
        fetchData: fetcher(() => ({
          path: 'data',
          fetch: async () => mockData
        }))
      }
    })

    await store.getState().fetchData()
    
    const state = store.getState()
    expect(state.data.loadingState).toBe('loaded')
    expect(state.data.data).toEqual(mockData)
  })

  it('should handle fetch errors', async () => {
    const store = create((set, get) => {
      const { fetcher } = zFetch(set, get)
      
      return {
        data: fetcherStore(),
        fetchData: fetcher(() => ({
          path: 'data',
          fetch: async () => { throw new Error('Failed') }
        }))
      }
    })

    await store.getState().fetchData()
    
    const state = store.getState()
    expect(state.data.loadingState).toBe('error')
  })
})


