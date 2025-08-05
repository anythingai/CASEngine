import { AlertCircle, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ErrorDisplayProps {
  title?: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  variant?: "default" | "destructive" | "warning"
  className?: string
}

const variants = {
  default: "border-border bg-background",
  destructive: "border-destructive/50 bg-destructive/5 text-destructive",
  warning: "border-orange-500/50 bg-orange-500/5 text-orange-600 dark:text-orange-400"
}

export function ErrorDisplay({
  title = "Something went wrong",
  message,
  onRetry,
  onDismiss,
  variant = "destructive",
  className
}: ErrorDisplayProps) {
  return (
    <Card className={cn(variants[variant], "border-2", className)}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="space-y-1">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm opacity-90">{message}</p>
            </div>
            
            {(onRetry || onDismiss) && (
              <div className="flex gap-2 pt-2">
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="h-8"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try Again
                  </Button>
                )}
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDismiss}
                    className="h-8"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Dismiss
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized error components
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      title="Connection Error"
      message="Unable to connect to the Cultural Arbitrage API. Please check your internet connection and try again."
      onRetry={onRetry}
      variant="destructive"
    />
  )
}

export function APIError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <ErrorDisplay
      title="API Error"
      message={message}
      onRetry={onRetry}
      variant="destructive"
    />
  )
}

export function ValidationError({ message }: { message: string }) {
  return (
    <ErrorDisplay
      title="Invalid Input"
      message={message}
      variant="warning"
    />
  )
}