"use client"

import { useState } from 'react'
import { SearchResponse } from '@/lib/types'
import { TasteGraph } from '@/components/visualization/TasteGraph'
import { SignalCard } from './SignalCard'
import { SimulationPanel } from '@/components/simulation/SimulationPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  BarChart3,
  Network,
  DollarSign,
  TrendingUp,
  Clock,
  Brain,
  Filter,
  GridIcon,
  Calculator
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResultsLayoutProps {
  data: SearchResponse
  className?: string
}

export function ResultsLayout({ data, className }: ResultsLayoutProps) {
  const [selectedAssetType, setSelectedAssetType] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState('visualization')
  const [portfolioAssets, setPortfolioAssets] = useState<Set<string>>(new Set())

  // Filter assets based on selected type
  const filteredAssets = selectedAssetType 
    ? data.assets?.filter(asset => asset.type === selectedAssetType) || []
    : data.assets || []

  // Get unique asset types for filtering
  const assetTypes = Array.from(new Set(data.assets?.map(asset => asset.type) || []))

  const handleNodeClick = (node: any) => {
    if (node.type === 'asset' && node.data) {
      // Scroll to the corresponding asset card
      const assetElement = document.getElementById(`asset-${node.data.symbol}`)
      if (assetElement) {
        assetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Add temporary highlight
        assetElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-50')
        setTimeout(() => {
          assetElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50')
        }, 2000)
      }
    }
  }

  const handleExternalLink = (url: string, type: string) => {
    // Track external link clicks for analytics
    console.log(`External link clicked: ${type} - ${url}`)
  }

  const handleAddToPortfolio = (asset: any) => {
    // Add asset to portfolio tracking
    setPortfolioAssets(prev => new Set(prev).add(asset.symbol))
    // Switch to simulation tab
    setActiveTab('simulation')
    // Show success notification
    console.log(`Added ${asset.symbol} to portfolio`)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Results Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Cultural Intelligence Analysis</h2>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Brain className="h-4 w-4" />
            Query: &quot;{data.query}&quot;
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {data.metadata.processingTime}ms
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            {Math.round(data.metadata.confidence * 100)}% confidence
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visualization" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Network View
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Opportunities ({filteredAssets.length})
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Portfolio Simulation
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analysis
          </TabsTrigger>
        </TabsList>

        {/* Network Visualization Tab */}
        <TabsContent value="visualization" className="mt-6">
          <TasteGraph 
            data={data} 
            onNodeClick={handleNodeClick}
            height={500}
            className="w-full"
          />
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="mt-6 space-y-4">
          {/* Asset Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by type:</span>
              <div className="flex gap-1">
                <Button
                  variant={selectedAssetType === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedAssetType(null)}
                  className="h-7 px-2 text-xs"
                >
                  All ({data.assets?.length || 0})
                </Button>
                {assetTypes.map(type => {
                  const count = data.assets?.filter(asset => asset.type === type).length || 0
                  return (
                    <Button
                      key={type}
                      variant={selectedAssetType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAssetType(type)}
                      className="h-7 px-2 text-xs"
                    >
                      {type.replace('_', ' ')} ({count})
                    </Button>
                  )
                })}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="h-7 px-2"
            >
              <GridIcon className="h-3 w-3 mr-1" />
              {viewMode === 'grid' ? 'List' : 'Grid'}
            </Button>
          </div>

          {/* Assets Grid */}
          {filteredAssets.length > 0 ? (
            <div className={cn(
              "gap-4",
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
                : "space-y-4"
            )}>
              {filteredAssets.map((asset, index) => (
                <div key={asset.symbol} id={`asset-${asset.symbol}`}>
                  <SignalCard
                    asset={asset}
                    onExternalLink={handleExternalLink}
                    onAddToPortfolio={handleAddToPortfolio}
                    className={cn(
                      "h-full transition-all duration-200",
                      portfolioAssets.has(asset.symbol) && "ring-2 ring-primary/50"
                    )}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CardContent>
                <p className="text-muted-foreground">
                  No assets found matching the selected criteria.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Simulation Tab */}
        <TabsContent value="simulation" className="mt-6">
          {data.assets && data.assets.length > 0 ? (
            <div className="space-y-4">
              {/* Quick Start Guide */}
              {portfolioAssets.size === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-6">
                    <div className="text-center space-y-3">
                      <Calculator className="h-8 w-8 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">Start Building Your Portfolio</h3>
                        <p className="text-sm text-muted-foreground">
                          Add assets from the Opportunities tab or use Quick Simulation for equal-weight distribution
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('assets')}
                        className="mt-2"
                      >
                        Browse Assets
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Portfolio Added Assets Summary */}
              {portfolioAssets.size > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">
                          {portfolioAssets.size} asset{portfolioAssets.size > 1 ? 's' : ''} ready for simulation
                        </span>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {Array.from(portfolioAssets).slice(0, 3).map(symbol => (
                          <Badge key={symbol} variant="outline" className="text-xs">
                            {symbol}
                          </Badge>
                        ))}
                        {portfolioAssets.size > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{portfolioAssets.size - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <SimulationPanel
                assets={data.assets}
                className="w-full"
              />
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CardContent>
                <div className="space-y-4">
                  <Calculator className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">No Assets Available</h3>
                    <p className="text-muted-foreground">
                      Run a search to discover assets for portfolio simulation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Theme Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Cultural Themes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.themes?.map((theme, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{theme}</span>
                    <Badge variant="secondary">
                      {Math.round((1 - index / data.themes.length) * 100)}% relevance
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Taste Profile */}
            {data.tasteProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Taste Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Primary Categories</div>
                    <div className="flex flex-wrap gap-1">
                      {data.tasteProfile.primaryCategories.map((category, index) => (
                        <Badge key={index} variant="outline">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Investment Style:</span>
                      <p className="text-muted-foreground capitalize">
                        {data.tasteProfile.investmentStyle}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Risk Tolerance:</span>
                      <p className="text-muted-foreground capitalize">
                        {data.tasteProfile.riskTolerance}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Sentiment:</span>
                      <p className="text-muted-foreground capitalize">
                        {data.tasteProfile.sentiment.sentiment} ({Math.round(data.tasteProfile.sentiment.confidence * 100)}%)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Portfolio Simulation */}
            {data.simulation && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Portfolio Simulation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="font-medium">Total Value</span>
                      <p className="text-lg font-bold">
                        ${data.simulation.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-medium">Total Return</span>
                      <p className={cn(
                        "text-lg font-bold",
                        data.simulation.totalReturn >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {data.simulation.totalReturn >= 0 ? '+' : ''}
                        {data.simulation.totalReturnPercent.toFixed(2)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-medium">Timeframe</span>
                      <p className="text-lg">{data.simulation.timeframe}</p>
                    </div>
                    {data.simulation.performance.sharpeRatio && (
                      <div className="space-y-1">
                        <span className="font-medium">Sharpe Ratio</span>
                        <p className="text-lg">{data.simulation.performance.sharpeRatio.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}