"use client"

import { useState, useCallback, useEffect } from "react"
import { SearchBar } from "@/components/SearchBar"
import { ThemeToggle } from "@/components/ThemeToggle"
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
import { TrendingUp, Zap, Brain, Sparkles, ArrowRight, Clock, Github, Twitter, Globe, Heart } from "lucide-react"
import Image from "next/image"

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

  // Debug: Add home button handler to reset state
  const handleHomeClick = useCallback(() => {
    console.log('[DEBUG] Home button clicked - Current state:', {
      isLoading: searchState.isLoading,
      hasResults: !!searchState.results,
      hasError: !!searchState.error,
      currentStep: searchState.currentStep,
      lastQuery
    })
    
    // Reset all search state to initial values
    setSearchState({
      isLoading: false,
      results: null,
      error: null,
      currentStep: 'idle',
      progress: null
    })
    setLastQuery("")
    
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    console.log('[DEBUG] Home button - State reset complete')
    
    toast({
      title: "Welcome back to home!",
      description: "Ready to explore new cultural vibes",
    })
  }, [searchState, lastQuery, toast])

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
    <main className="min-h-screen gradient-bg-subtle">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <button
            className="flex items-center space-x-3 hover:opacity-80 transition-all duration-200 cursor-pointer group bg-transparent border-0 p-0 m-0 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 rounded-lg"
            onClick={handleHomeClick}
            aria-label="Return to home"
            title="Return to home"
          >
            <div className="flex-shrink-0 flex items-center">
              <Image
                src="/logo.png"
                alt="Cultural Arbitrage Signal Engine"
                width={40}
                height={40}
                className="rounded-lg group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="flex flex-col justify-center text-left min-h-[40px]">
              <h1 className="text-lg font-semibold leading-none group-hover:text-primary transition-colors duration-200">
                Cultural Arbitrage Signal Engine
              </h1>
              <p className="text-xs text-muted-foreground leading-none -mt-0.5 hidden sm:block">
                Trade the trend before it trends
              </p>
            </div>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="container pt-0 pb-10">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-10">
          
          {/* Hero Section */}
          <section className="relative text-center space-y-8 min-h-[calc(100dvh-64px)] flex flex-col items-center justify-center hero-aurora pt-6 pb-8 md:pt-10 md:pb-10">
            <div className="space-y-4 px-4 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40 text-xs mx-auto">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-medium">Beta Version</span>
                <span className="text-muted-foreground">Using Qloo</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl leading-[1.15] md:leading-[1.1]">
                Discover crypto opportunities through
                <span className="block gradient-text-cosmic pb-1">
                  cultural intelligence
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Map emerging cultural vibes to Web3 investments. Enter any cultural trend, aesthetic, or vibe to discover aligned crypto and NFT opportunities.
              </p>
            </div>

            {/* Search Interface */}
            <div className="w-full max-w-2xl mx-auto px-4 relative z-10 glass p-2 sm:p-3 rounded-2xl shadow-lg">
              <SearchBar
                onSearch={handleSearch}
                isLoading={searchState.isLoading}
                placeholder="Enter cultural vibe to analyze... (e.g., solarpunk, Y2K revival)"
              />
            </div>

          </section>

          {/* Demo Examples */}
          {!searchState.results && !searchState.isLoading && !searchState.error && (
            <div className="space-y-6" id="examples">
              <div className="text-center">
                <h3 className="text-2xl sm:text-3xl font-semibold mb-2">Try these cultural vibes</h3>
                <p className="text-muted-foreground">Click any example to see our AI in action</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {DEMO_EXAMPLES.map((example) => (
                  <Card
                    key={example.vibe}
                    className="group cursor-pointer border hover:shadow-lg hover:border-primary/50 transition-all duration-200"
                    onClick={() => handleExampleClick(example)}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="font-semibold text-lg">{example.vibe}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {example.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
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
              <div className="space-y-6 md:space-y-8" id="how-it-works">
                <div className="text-center">
                  <h3 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h3>
                  <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                    Our AI-powered engine connects cultural intelligence with Web3 opportunities through a sophisticated multi-step analysis
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="rounded-lg bg-primary/10 p-3 w-fit">
                          <Brain className="h-8 w-8 text-primary" />
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

                  <Card className="border hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="rounded-lg bg-success/10 p-3 w-fit">
                          <TrendingUp className="h-8 w-8 text-success" />
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

                  <Card className="border hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="rounded-lg bg-info/10 p-3 w-fit">
                          <Zap className="h-8 w-8 text-info" />
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
      <footer className="border-t mt-12 bg-background/50 backdrop-blur-sm">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center space-x-3">
                <Image
                  src="/logo.png"
                  alt="Cultural Arbitrage Signal Engine"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <div>
                  <h3 className="font-semibold text-lg">Cultural Arbitrage</h3>
                  <p className="text-sm text-muted-foreground">Signal Engine</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                Mapping cultural vibes to Web3 opportunities. Discover crypto and NFT investments through cultural intelligence and AI-powered analysis.
              </p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">Beta Version</span>
                </div>
              </div>
            </div>
            
            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-medium">Explore</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-foreground transition-colors cursor-pointer">Cultural Trends</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Asset Discovery</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Market Analysis</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Portfolio Builder</li>
              </ul>
            </div>
            
            {/* Connect */}
            <div className="space-y-4">
              <h4 className="font-medium">Connect</h4>
              <div className="flex space-x-4">
                <button className="p-2 rounded-lg hover:bg-primary/10 transition-colors">
                  <Twitter className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg hover:bg-primary/10 transition-colors">
                  <Github className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg hover:bg-primary/10 transition-colors">
                  <Globe className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Built for the Web3 economy
              </p>
            </div>
          </div>
          
          {/* Bottom Section */}
          <Separator className="my-8" />
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <span>Built with</span>
              <Heart className="h-3 w-3 text-red-500" />
              <span>for Qloo-Hackathon-2025</span>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span>© 2025Cultural Arbitrage Signal Engine</span>
              <span>•</span>
              <span className="hover:text-foreground transition-colors cursor-pointer">Privacy</span>
              <span>•</span>
              <span className="hover:text-foreground transition-colors cursor-pointer">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}