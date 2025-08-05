"use client"

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function GraphSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-muted animate-pulse rounded"></div>
          <div className="h-4 w-64 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-6 w-16 bg-muted animate-pulse rounded-full"></div>
          ))}
        </div>
      </div>
      
      <div className="border rounded-lg h-96 bg-muted/20 animate-pulse flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-4 w-32 bg-muted animate-pulse rounded mx-auto"></div>
          <div className="h-3 w-48 bg-muted animate-pulse rounded mx-auto"></div>
        </div>
      </div>
    </Card>
  )
}

export function CardSkeleton() {
  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 bg-muted animate-pulse rounded"></div>
              <div className="h-5 w-12 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
            <div className="h-5 w-20 bg-muted animate-pulse rounded"></div>
          </div>
          
          <div className="text-right space-y-2">
            <div className="h-4 w-12 bg-muted animate-pulse rounded ml-auto"></div>
            <div className="h-5 w-16 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-3 w-20 bg-muted animate-pulse rounded"></div>
            <div className="h-5 w-16 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
            <div className="h-5 w-12 bg-muted animate-pulse rounded"></div>
          </div>
        </div>

        <Separator />

        {/* Recommendation Details */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-8 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="h-2 w-full bg-muted animate-pulse rounded"></div>
          </div>

          <div className="space-y-2">
            <div className="h-3 w-20 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded"></div>
          </div>
        </div>

        <Separator />

        {/* External Links */}
        <div className="space-y-2">
          <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-7 w-20 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProgressIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = [
    'Expanding themes...',
    'Analyzing cultural taste...',
    'Discovering assets...',
    'Generating insights...'
  ]

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Analyzing Cultural Intelligence</h3>
            <p className="text-sm text-muted-foreground">
              {steps[Math.min(currentStep - 1, steps.length - 1)]}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Animation indicators */}
          <div className="flex justify-center space-x-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

export function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="text-center space-y-2">
        <div className="h-8 w-64 bg-muted animate-pulse rounded mx-auto"></div>
        <div className="flex items-center justify-center gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 w-24 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-1 h-9 bg-background rounded-md animate-pulse"></div>
          ))}
        </div>
        
        {/* Graph Content */}
        <GraphSkeleton />
      </div>
    </div>
  )
}