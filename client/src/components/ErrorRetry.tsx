import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading'

interface ErrorRetryProps {
  title?: string
  message?: string
  error?: Error | string
  onRetry?: () => void | Promise<void>
  onGoHome?: () => void
  showDetails?: boolean
  className?: string
  variant?: 'default' | 'minimal' | 'card'
}

export function ErrorRetry({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  error,
  onRetry,
  onGoHome = () => window.location.href = '/',
  showDetails = import.meta.env.DEV,
  className,
  variant = 'card'
}: ErrorRetryProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    if (!onRetry) return

    setIsRetrying(true)
    try {
      await onRetry()
    } catch (retryError) {
      console.error('Retry failed:', retryError)
    } finally {
      setIsRetrying(false)
    }
  }

  const errorMessage = error instanceof Error ? error.message : error?.toString()

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 text-sm text-destructive ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <span>{message}</span>
        {onRetry && (
          <LoadingButton
            variant="default"
            size="sm"
            onClick={handleRetry}
            loading={isRetrying}
            className="h-6 px-2"
          >
            Retry
          </LoadingButton>
        )}
      </div>
    )
  }

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 text-destructive">
          <AlertTriangle className="h-full w-full" />
        </div>
        <CardTitle className="text-destructive">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          {message}
        </p>
        {showDetails && errorMessage && (
          <details className="text-left">
            <summary className="text-xs font-medium cursor-pointer text-muted-foreground">
              Error Details
            </summary>
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto text-left">
              {errorMessage}
            </pre>
          </details>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 justify-center">
        {onRetry && (
          <LoadingButton
            variant="default"
            size="sm"
            onClick={handleRetry}
            loading={isRetrying}
            data-testid="button-retry"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </LoadingButton>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onGoHome}
          data-testid="button-home"
        >
          <Home className="h-4 w-4 mr-2" />
          Go Home
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const supportEmail = "support@example.com"
            window.location.href = `mailto:${supportEmail}?subject=Error Report&body=${encodeURIComponent(`Error: ${errorMessage}\nPage: ${window.location.href}`)}`
          }}
          data-testid="button-support"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Contact Support
        </Button>
      </CardFooter>
    </Card>
  )
}

// Use ErrorBoundary with ErrorRetry as fallback for proper error handling
// The withErrorRetry HOC was removed because try/catch in render violates React principles
// Instead, use: <ErrorBoundary fallback={<ErrorRetry />}><Component /></ErrorBoundary>