"use client"

import { useState, useCallback } from 'react'
import { AssetRecommendation, SimulateResponse, RiskAnalysis, PortfolioSimulation } from '@/lib/types'
import { simulateVibePortfolio } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { PortfolioBuilder } from './PortfolioBuilder'
import { SimulationResults } from './SimulationResults'
import { RiskAssessment } from './RiskAssessment'
import {
  Calculator,
  TrendingUp,
  Shield,
  Settings,
  Play,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimulationPanelProps {
  assets: AssetRecommendation[]
  className?: string
  vibe?: string
}

export interface SimulationConfig {
  selectedAssets: Array<{
    asset: AssetRecommendation
    allocation: number
  }>
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  timeHorizon: '1m' | '3m' | '6m' | '1y' | '2y'
  portfolioSize: number
  rebalanceFrequency: 'never' | 'monthly' | 'quarterly'
}

export function SimulationPanel({ assets, className, vibe }: SimulationPanelProps) {
  const [activeTab, setActiveTab] = useState<'builder' | 'results' | 'risk'>('builder')
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResults, setSimulationResults] = useState<SimulateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Default simulation configuration
  const [config, setConfig] = useState<SimulationConfig>({
    selectedAssets: [],
    riskTolerance: 'moderate',
    timeHorizon: '6m',
    portfolioSize: 10000,
    rebalanceFrequency: 'quarterly'
  })

  const handleConfigUpdate = useCallback((updates: Partial<SimulationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const runSimulation = useCallback(async () => {
    if (!vibe || vibe.trim().length === 0) {
      setError('Missing vibe context. Please run a search first to provide a vibe.')
      return
    }

    setIsSimulating(true)
    setError(null)

    try {
      // Call AI-driven vibe portfolio simulation on the backend
      const { data } = await simulateVibePortfolio(vibe, {
        portfolioSize: config.portfolioSize,
        riskTolerance: config.riskTolerance,
        timeHorizon: config.timeHorizon,
        rebalanceFrequency: config.rebalanceFrequency
      })

      const sim = data.simulation

      // Map backend SimulationResult -> UI PortfolioSimulation
      const expectedReturn = sim.projections.expectedReturn || 0
      const totalValue = Math.round(config.portfolioSize * (1 + expectedReturn / 100) * 100) / 100

      const mappedAssets = sim.portfolio.assets.map((a: any) => {
        const invested = (config.portfolioSize * a.allocation) / 100
        const value = Math.round(invested * (1 + expectedReturn / 100) * 100) / 100
        return {
          symbol: a.id,
          allocation: a.allocation,
          value,
          return: value - invested,
          returnPercent: expectedReturn
        }
      })

      const simulation: PortfolioSimulation = {
        totalValue,
        totalReturn: totalValue - config.portfolioSize,
        totalReturnPercent: expectedReturn,
        timeframe: sim.projections.timeframe,
        assets: mappedAssets,
        performance: {
          sharpeRatio: sim.projections.sharpeRatio,
          volatility: sim.projections.volatility,
          maxDrawdown: sim.projections.maxDrawdown
        }
      }

      const volatility = sim.projections.volatility || 0
      const overallRisk: RiskAnalysis['overallRisk'] =
        volatility < 15 ? 'low' :
        volatility < 25 ? 'medium' :
        volatility < 40 ? 'high' : 'extreme'

      const riskAnalysis: RiskAnalysis = {
        overallRisk,
        riskScore: Math.min(100, Math.round(sim.portfolio.riskScore)),
        factors: [
          {
            factor: 'Liquidity',
            impact: sim.riskMetrics.liquidityScore > 70 ? 'low' :
                    sim.riskMetrics.liquidityScore > 40 ? 'medium' : 'high',
            description: `Liquidity score ${sim.riskMetrics.liquidityScore}/100`
          },
          {
            factor: 'Diversification',
            impact: sim.portfolio.diversificationScore > 60 ? 'low' :
                    sim.portfolio.diversificationScore > 40 ? 'medium' : 'high',
            description: `Diversification score ${sim.portfolio.diversificationScore}/100`
          },
          {
            factor: 'VaR (95%)',
            impact: sim.riskMetrics.var95 > config.portfolioSize * 0.08 ? 'high' :
                    sim.riskMetrics.var95 > config.portfolioSize * 0.04 ? 'medium' : 'low',
            description: `VaR95 ≈ $${sim.riskMetrics.var95.toLocaleString()}`
          }
        ],
        recommendations: [
          ...sim.recommendations.riskMitigation,
          ...sim.recommendations.rebalancing
        ]
      }

      const response: SimulateResponse = {
        simulation,
        recommendations: [
          ...sim.recommendations.opportunities,
          ...sim.recommendations.rebalancing.slice(0, 2)
        ],
        riskAnalysis,
        timestamp: new Date().toISOString()
      }

      setSimulationResults(response)
      setActiveTab('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed. Please try again.')
    } finally {
      setIsSimulating(false)
    }
  }, [config, vibe])

  const runQuickSimulation = useCallback(async () => {
    // Quick simulation with equal weight distribution across top assets
    const topAssets = assets.slice(0, Math.min(5, assets.length))
    const equalWeight = 100 / topAssets.length

    const quickConfig = {
      ...config,
      selectedAssets: topAssets.map(asset => ({
        asset,
        allocation: equalWeight
      }))
    }

    setConfig(quickConfig)
    
    // Run simulation with the quick config
    setTimeout(() => runSimulation(), 100)
  }, [assets, config, runSimulation])

  const resetSimulation = useCallback(() => {
    setSimulationResults(null)
    setError(null)
    setActiveTab('builder')
    setConfig(prev => ({ ...prev, selectedAssets: [] }))
  }, [])

  const selectedAssetsCount = config.selectedAssets.length
  const totalAllocation = config.selectedAssets.reduce((sum, item) => sum + item.allocation, 0)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Simulation Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Portfolio Simulation
          </h3>
          <p className="text-muted-foreground">
            Build and test your cultural arbitrage portfolio with {assets.length} available assets
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={runQuickSimulation}
            disabled={isSimulating || assets.length === 0}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Quick Simulation
          </Button>
          <Button
            onClick={runSimulation}
            disabled={isSimulating}
            className="flex items-center gap-2"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Simulation
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Portfolio Size</p>
          <p className="font-semibold">${config.portfolioSize.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Selected Assets</p>
          <p className="font-semibold">{selectedAssetsCount}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Risk Tolerance</p>
          <Badge variant="outline" className="capitalize">
            {config.riskTolerance}
          </Badge>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Time Horizon</p>
          <Badge variant="outline">
            {config.timeHorizon}
          </Badge>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorDisplay 
          message={error} 
          onRetry={() => setError(null)}
          className="mb-4"
        />
      )}

      {/* Loading State */}
      {isSimulating && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <LoadingSpinner size="lg" />
              <p className="text-muted-foreground">
                Running portfolio simulation...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulation Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Portfolio Builder
          </TabsTrigger>
          <TabsTrigger 
            value="results" 
            className="flex items-center gap-2"
            disabled={!simulationResults}
          >
            <TrendingUp className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger 
            value="risk" 
            className="flex items-center gap-2"
            disabled={!simulationResults}
          >
            <Shield className="h-4 w-4" />
            Risk Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-6">
          <PortfolioBuilder
            assets={assets}
            config={config}
            onConfigUpdate={handleConfigUpdate}
            onRunSimulation={runSimulation}
            isSimulating={isSimulating}
          />
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          {simulationResults ? (
            <SimulationResults
              results={simulationResults}
              config={config}
              onReset={resetSimulation}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">
                  Run a simulation to see results here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="risk" className="mt-6">
          {simulationResults ? (
            <RiskAssessment
              results={simulationResults}
              config={config}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">
                  Run a simulation to see risk analysis here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}