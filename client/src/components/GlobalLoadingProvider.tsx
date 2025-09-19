import { useGlobalLoadingState } from '@/hooks/useGlobalLoading'
import { LoadingOverlay } from '@/components/ui/loading'

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const globalLoading = useGlobalLoadingState()

  return (
    <div className="relative">
      {children}
      {globalLoading.isLoading && (
        <LoadingOverlay
          message={globalLoading.message}
          progress={globalLoading.progress}
          variant={globalLoading.variant}
        />
      )}
    </div>
  )
}