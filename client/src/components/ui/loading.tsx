import { cn } from "@/lib/utils"
import { Loader2, Sparkles, Brain, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button, ButtonProps } from "@/components/ui/button"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  variant?: "default" | "ai" | "brain" | "zap"
  className?: string
}

export function LoadingSpinner({ 
  size = "md", 
  variant = "default",
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  const IconComponent = {
    default: Loader2,
    ai: Sparkles,
    brain: Brain,
    zap: Zap
  }[variant]

  const animationClass = variant === "ai" ? "animate-pulse" : "animate-spin"

  return (
    <IconComponent 
      className={cn(sizeClasses[size], animationClass, className)}
      data-testid="loading-spinner"
    />
  )
}

interface LoadingOverlayProps {
  message?: string
  progress?: number
  variant?: "default" | "ai" | "processing"
  className?: string
}

export function LoadingOverlay({ 
  message = "Loading...", 
  progress,
  variant = "default",
  className 
}: LoadingOverlayProps) {
  return (
    <div 
      className={cn(
        "absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50",
        className
      )}
      data-testid="loading-overlay"
    >
      <Card className="w-64">
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner 
              size="lg" 
              variant={variant === "ai" ? "ai" : variant === "processing" ? "brain" : "default"}
            />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">{message}</p>
              {progress !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface LoadingSkeletonProps {
  lines?: number
  className?: string
}

export function LoadingSkeleton({ lines = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)} data-testid="loading-skeleton">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-muted rounded animate-pulse",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  children: React.ReactNode
  loadingVariant?: "default" | "ai" | "processing"
}

export function LoadingButton({ 
  loading = false, 
  children, 
  loadingVariant = "default",
  disabled,
  ...props 
}: LoadingButtonProps) {
  return (
    <Button
      disabled={loading || disabled}
      {...props}
    >
      {loading && (
        <LoadingSpinner 
          size="sm" 
          variant={loadingVariant === "ai" ? "ai" : loadingVariant === "processing" ? "brain" : "default"}
          className="mr-2"
        />
      )}
      {children}
    </Button>
  )
}