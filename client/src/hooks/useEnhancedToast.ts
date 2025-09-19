import { useToast } from "@/hooks/use-toast"

export interface EnhancedToastOptions {
  title: string
  description?: string
  variant?: "default" | "destructive" | "success" | "warning" | "info"
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  progress?: number
  persistent?: boolean
}

export function useEnhancedToast() {
  const { toast } = useToast()

  const showToast = ({
    title,
    description,
    variant = "default",
    duration,
    action,
    progress,
    persistent = false,
  }: EnhancedToastOptions) => {
    // Map enhanced variants to toast variants
    const toastVariant = variant === "success" || variant === "warning" || variant === "info" 
      ? "default" 
      : variant

    // Enhanced description with progress and action
    let enhancedDescription = description || ""
    
    if (progress !== undefined) {
      enhancedDescription += `\nProgress: ${Math.round(progress)}%`
    }
    
    if (action) {
      enhancedDescription += `\n• ${action.label}`
    }

    return toast({
      title: `${getIcon(variant)} ${title}`,
      description: enhancedDescription,
      variant: toastVariant,
      duration: persistent ? Infinity : duration,
      className: getVariantClassName(variant)
    })
  }

  const success = (title: string, description?: string, options?: Partial<EnhancedToastOptions>) => {
    return showToast({ title, description, variant: "success", ...options })
  }

  const error = (title: string, description?: string, options?: Partial<EnhancedToastOptions>) => {
    return showToast({ title, description, variant: "destructive", ...options })
  }

  const warning = (title: string, description?: string, options?: Partial<EnhancedToastOptions>) => {
    return showToast({ title, description, variant: "warning", ...options })
  }

  const info = (title: string, description?: string, options?: Partial<EnhancedToastOptions>) => {
    return showToast({ title, description, variant: "info", ...options })
  }

  const loading = (title: string, description?: string, progress?: number) => {
    return showToast({ 
      title, 
      description, 
      variant: "info", 
      progress, 
      persistent: true,
      duration: Infinity
    })
  }

  const aiProcessing = (message: string, progress?: number) => {
    return showToast({
      title: "AI Processing",
      description: message,
      variant: "info",
      progress,
      persistent: true,
      duration: Infinity
    })
  }

  return {
    showToast,
    success,
    error,
    warning, 
    info,
    loading,
    aiProcessing,
  }
}

function getIcon(variant?: string): string {
  switch (variant) {
    case "success": return "[✓]"
    case "destructive": return "[!]"
    case "warning": return "[!]"
    case "info": return "[i]"
    default: return "[i]"
  }
}

function getVariantClassName(variant?: string): string {
  switch (variant) {
    case "success":
      return "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
    case "warning":
      return "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100"
    case "info":
      return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100"
    default:
      return ""
  }
}