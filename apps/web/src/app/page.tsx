"use client"

import { useState, useCallback, useEffect } from "react"
import { SearchBar } from "@/components/SearchBar"
import { ThemeToggle } from "@/components/ThemeToggle"
import { SearchingSpinner } from "@/components/LoadingSpinner"
import { NetworkError } from "@/components/ErrorDisplay"
import { ResultsLayout } from "@/components/results/ResultsLayout"
import { ProgressIndicator } from "@/components/loading/ResultsSkeleton"
import { searchVibes, ProgressStep } from "@/lib/api"
import { SearchResponse, APIError } from "@/lib/types"
import { getErrorMessage, isAPIError } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { TrendingUp, Zap, Brain, Sparkles, ArrowRight, Clock } from "lucide-react"

// Demo examples with rich cultural contexts
const DEMO_EXAMPLES = [
  {
    vibe: "solarpunk",
    description: "Optimistic green tech aesthetics",
    tags: ["sustainability", "nature", "technology", "utopian"]
  },
  {
    vibe: "gothcore futurism",
    description: "Dark cyberpunk meets gothic revival",
    tags: ["darkwave", "cyberpunk", "gothic", "futuristic"]
  },
  {
    vibe: "Y2K revival",
    description: "Early 2000s digital nostalgia",
    tags: ["nostalgia", "digital", "chrome", "millennium"]
  },
  {
    vibe: "cottagecore",
    description: "Rural romantic escapism",
    tags: ["nature", "simplicity", "handmade", "pastoral"]
  },
  {
    vibe: "dark academia",
    description: "Scholarly gothic aesthetics",
    tags: ["literature", "academic", "vintage", "intellectual"]
  },
  {
    vibe: "kawaii anime aesthetics",
    description: "Japanese cute culture and anime",
    tags: ["anime", "kawaii", "japanese", "cute"]
  }
]

type SearchStep = 'idle' | 'expanding' | 'analyzing' | 'discovering' | 'generating'

export default function Home() {
  const { toast } = useToast()
  const [searchState, setSearchState] = useState<{
    isLoading: boolean
    results: SearchResponse | null
    error: string | null
    currentStep: SearchStep
    progress: ProgressStep | null
  }>({
    isLoading: false,
    results: null,
    error: null,
    currentStep: 'idle',
    progress: null
  })

  const [lastQuery, setLastQuery] = useState<string>("")

  const updateProgress = useCallback((step: SearchStep, stepNumber: number, message: string) => {
    setSearchState(prev => ({
      ...prev,
      currentStep: step,
      progress: {
        step: stepNumber,
        totalSteps: 4,
        message,
        completed: false
      }
    }))
  }, [])

  const handleSearch = useCallback(async (query: string) => {
    setSearchState({
      isLoading: true,
      results: null,
      error: null,
      currentStep: 'expanding',
      progress: null
    })
    setLastQuery(query)

    // Show progress steps
    const progressSteps = [
      { step: 'expanding', message: 'Expanding cultural themes...' },
      { step: 'analyzing', message: 'Analyzing taste correlations...' },
      { step: 'discovering', message: 'Discovering crypto assets...' },
      { step: 'generating', message: 'Generating insights...' }
    ] as const

    try {
      // Simulate progress updates
      let currentStep = 0
      const progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          updateProgress(
            progressSteps[currentStep].step as SearchStep,
            currentStep + 1,
            progressSteps[currentStep].message
          )
          currentStep++
        }
      }, 1500)

      const results = await searchVibes({ query })
      
      clearInterval(progressInterval)
      
      setSearchState({
        isLoading: false,
        results,
        error: null,
        currentStep: 'idle',
        progress: null
      })

      toast({
        title: "Analysis Complete! ✨",
        description: `Found ${results.assets?.length || 0} relevant opportunities for "${query}"`,
      })

    } catch (error) {
      const errorMessage = getErrorMessage(error)
      setSearchState({
        isLoading: false,
        results: null,
        error: errorMessage,
        currentStep: 'idle',
        progress: null
      })

      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }, [toast, updateProgress])

  const handleRetry = useCallback(() => {
    if (lastQuery) {
      handleSearch(lastQuery)
    } else {
      setSearchState({
        isLoading: false,
        results: null,
        error: null,
        currentStep: 'idle',
        progress: null
      })
    }
  }, [lastQuery, handleSearch])

  const handleExampleClick = useCallback((example: typeof DEMO_EXAMPLES[0]) => {
    toast({
      title: `Analyzing "${example.vibe}"`,
      description: example.description,
    })
    handleSearch(example.vibe)
  }, [handleSearch, toast])

  // Clear error after 10 seconds
  useEffect(() => {
    if (searchState.error) {
      const timeout = setTimeout(() => {
        setSearchState(prev => ({ ...prev, error: null }))
      }, 10000)
      return () => clearTimeout(timeout)
    }
  }, [searchState.error])

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-gradient-to-br from-primary to-primary/80 p-2">
                  <TrendingUp className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    Cultural Arbitrage Signal Engine
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Trade the trend before it trends — with taste‑powered alpha
                  </p>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Hero Section */}
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter">
                Discover crypto opportunities through
                <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  cultural intelligence
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Map emerging cultural vibes to Web3 investments. Enter any cultural trend, aesthetic, or vibe to discover aligned crypto and NFT opportunities.
              </p>
            </div>

            {/* Search Interface */}
            <div className="max-w-2xl mx-auto">
              <SearchBar 
                onSearch={handleSearch} 
                isLoading={searchState.isLoading}
                placeholder="Enter cultural vibe to analyze... (e.g., solarpunk, Y2K revival)"
              />
            </div>
          </div>

          {/* Demo Examples */}
          {!searchState.results && !searchState.isLoading && !searchState.error && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Try these cultural vibes</h3>
                <p className="text-muted-foreground">Click any example to see our AI in action</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DEMO_EXAMPLES.map((example) => (
                  <Card
                    key={example.vibe}
                    className="group cursor-pointer border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-background to-muted/20"
                    onClick={() => handleExampleClick(example)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <h4 className="font-semibold text-lg">{example.vibe}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {example.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {example.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-muted-foreground">Click to analyze</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Search Results/States */}
          <div className="space-y-8">
            {searchState.isLoading && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <ProgressIndicator
                    currentStep={searchState.progress?.step || 1}
                    totalSteps={searchState.progress?.totalSteps || 4}
                  />
                </div>
                
                {/* Additional loading context */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {searchState.progress?.message || 'Processing your cultural vibe...'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This may take 30-60 seconds as we analyze across multiple data sources
                  </p>
                </div>
              </div>
            )}

            {searchState.error && (
              <div className="max-w-2xl mx-auto">
                {isAPIError({ message: searchState.error, status: 0 }) ? (
                  <NetworkError onRetry={handleRetry} />
                ) : (
                  <div className="text-center space-y-4">
                    <div className="text-muted-foreground">
                      <p>{searchState.error}</p>
                    </div>
                    {lastQuery && (
                      <Button onClick={handleRetry} variant="outline" className="gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Retry &quot;{lastQuery}&quot;
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {searchState.results && (
              <div className="animate-in slide-in-from-bottom-4 duration-700">
                <ResultsLayout data={searchState.results} />
              </div>
            )}
          </div>

          {/* Features Overview */}
          {!searchState.results && !searchState.isLoading && !searchState.error && (
            <>
              <Separator className="my-12" />
              
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-2xl font-semibold mb-2">How It Works</h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Our AI-powered engine connects cultural intelligence with Web3 opportunities through a sophisticated multi-step analysis
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-3 w-fit">
                          <Brain className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold">Cultural Intelligence</h3>
                          <p className="text-muted-foreground text-sm">
                            Advanced AI analyzes cultural trends across social platforms to identify emerging vibes and aesthetics, expanding themes into actionable insights.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/10 p-3 w-fit">
                          <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold">Asset Discovery</h3>
                          <p className="text-muted-foreground text-sm">
                            Correlates cultural data with crypto tokens and NFT collections across multiple blockchains to generate high-confidence investment signals.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-3 w-fit">
                          <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold">Interactive Analysis</h3>
                          <p className="text-muted-foreground text-sm">
                            Explore cultural networks through interactive graphs, review detailed asset cards, and get AI-powered recommendations with risk assessment.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>Cultural Arbitrage Signal Engine • Alpha Version</p>
            <p className="mt-1">Mapping cultural vibes to Web3 opportunities</p>
          </div>
        </div>
      </footer>
    </main>
  )
}