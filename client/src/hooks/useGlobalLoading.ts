import { create } from 'zustand'

export interface LoadingState {
  isLoading: boolean
  message?: string
  progress?: number
  variant?: 'default' | 'ai' | 'processing'
}

interface GlobalLoadingStore {
  loadingStates: Map<string, LoadingState>
  setLoading: (key: string, state: Partial<LoadingState>) => void
  clearLoading: (key: string) => void
  clearAllLoading: () => void
}

export const useGlobalLoadingStore = create<GlobalLoadingStore>((set, get) => ({
  loadingStates: new Map(),
  
  setLoading: (key: string, state: Partial<LoadingState>) => {
    set((store: GlobalLoadingStore) => {
      const newMap = new Map(store.loadingStates)
      const existingState = newMap.get(key) || {
        isLoading: false,
        message: 'Loading...',
        variant: 'default' as const
      }
      
      newMap.set(key, { ...existingState, ...state, isLoading: true })
      return { loadingStates: newMap }
    })
  },
  
  clearLoading: (key: string) => {
    set((store: GlobalLoadingStore) => {
      const newMap = new Map(store.loadingStates)
      newMap.delete(key)
      return { loadingStates: newMap }
    })
  },
  
  clearAllLoading: () => {
    set({ loadingStates: new Map() })
  },
  
}))

// Selector for the global loading state
export const selectGlobalLoading = (state: GlobalLoadingStore): LoadingState => {
  const states = Array.from(state.loadingStates.values()).filter(s => s.isLoading)
  
  if (states.length === 0) {
    return { isLoading: false }
  }
  
  // Prioritize AI/processing states
  const prioritizedState = states.find((s: LoadingState) => s.variant === 'ai' || s.variant === 'processing') || states[0]
  return prioritizedState
}

export function useGlobalLoadingState(): LoadingState {
  return useGlobalLoadingStore(selectGlobalLoading)
}

export function useGlobalLoading(key: string) {
  const { setLoading, clearLoading } = useGlobalLoadingStore()
  
  const startLoading = (message?: string, options?: { progress?: number; variant?: 'default' | 'ai' | 'processing' }) => {
    setLoading(key, { 
      message: message || 'Loading...', 
      progress: options?.progress,
      variant: options?.variant || 'default'
    })
  }
  
  const updateProgress = (progress: number, message?: string) => {
    setLoading(key, { progress, ...(message && { message }) })
  }
  
  const stopLoading = () => {
    clearLoading(key)
  }
  
  return { startLoading, updateProgress, stopLoading }
}