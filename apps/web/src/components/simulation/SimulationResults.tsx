"use client"

import { useState } from 'react'
import { SimulateResponse, PortfolioSimulation } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { SimulationConfig } from './SimulationPanel'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  Download,
  RefreshCw,
  PieChart,
  Activity,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimulationResultsProps {
  results: SimulateResponse
  config: SimulationConfig
  onReset: () => void
  className?: string
}

export function SimulationResults({ results, config, onReset, className }: SimulationResultsProps) {
  const [activeChart, setActiveChart] = useState<'performance' | 'allocation' | 'risk'>('performance')

  const { simulation, riskAnalysis } = results
  const totalInvested = config.portfolioSize
  const totalValue = simulation.totalValue
  const totalReturn = ((totalValue - totalInvested) / totalInvested) * 100
  const isProfit = totalReturn >= 0

  // Calculate individual asset performance
  const assetPerformance = simulation.assets.map(asset => {
    const configAsset = config.selectedAssets.find(ca => ca.asset.symbol === asset.symbol)
    const investedAmount = totalInvested * (asset.allocation / 100)
    const currentValue = asset.value
    const assetReturn = ((currentValue - investedAmount) / investedAmount) * 100
    
    return {
      ...asset,
      investedAmount,
      currentValue,
      assetReturn,
      configAsset: configAsset?.asset
    }
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const exportResults = () => {
    const exportData = {
      simulation: {
        ...simulation,
        config,
        timestamp: new Date().toISOString()
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio-simulation-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold">Simulation Results</h3>
          <p className="text-muted-foreground">
            {config.timeHorizon} projection for {config.selectedAssets.length} assets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportResults}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={onReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            New Simulation
          </Button>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Initial Investment
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                Current Value
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isProfit ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                Total Return
              </div>
              <p className={cn(
                "text-2xl font-bold",
                isProfit ? "text-green-600" : "text-red-600"
              )}>
                {formatPercentage(totalReturn)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Time Horizon
              </div>
              <p className="text-2xl font-bold">{config.timeHorizon}</p>
              <p className="text-xs text-muted-foreground">
                {config.riskTolerance} risk
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {simulation.performance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {simulation.performance.sharpeRatio && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                  <p className="text-3xl font-bold">{simulation.performance.sharpeRatio.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {simulation.performance.sharpeRatio > 1 ? 'Excellent' :
                     simulation.performance.sharpeRatio > 0.5 ? 'Good' : 'Poor'}
                  </p>
                </div>
              )}

              {simulation.performance.volatility && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Volatility</p>
                  <p className="text-3xl font-bold">{simulation.performance.volatility.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {simulation.performance.volatility < 15 ? 'Low' :
                     simulation.performance.volatility < 25 ? 'Moderate' : 'High'}
                  </p>
                </div>
              )}

              {simulation.performance.maxDrawdown && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Max Drawdown</p>
                  <p className="text-3xl font-bold text-red-600">
                    -{simulation.performance.maxDrawdown.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Worst decline</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Asset Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Portfolio Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assetPerformance.map((asset, index) => (
              <div key={asset.symbol} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{asset.symbol}</h4>
                      <Badge variant="outline" className="text-xs">
                        {asset.configAsset?.type.replace('_', ' ') || 'N/A'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {asset.allocation.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {asset.configAsset?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-medium">{formatCurrency(asset.currentValue)}</p>
                    <p className={cn(
                      "text-sm",
                      asset.assetReturn >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatPercentage(asset.assetReturn)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Invested: {formatCurrency(asset.investedAmount)}</span>
                    <span>Current: {formatCurrency(asset.currentValue)}</span>
                  </div>
                  <Progress 
                    value={asset.allocation} 
                    className="h-2"
                  />
                </div>

                {index < assetPerformance.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Summary */}
      {riskAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Risk Assessment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Overall Risk Level</span>
                <Badge 
                  variant={riskAnalysis.overallRisk === 'low' ? 'default' :
                         riskAnalysis.overallRisk === 'medium' ? 'secondary' :
                         'destructive'}
                  className="capitalize"
                >
                  {riskAnalysis.overallRisk}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Risk Score</span>
                  <span className="font-medium">{riskAnalysis.riskScore}/100</span>
                </div>
                <Progress value={riskAnalysis.riskScore} className="h-2" />
              </div>

              {riskAnalysis.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Recommendations</h5>
                  <ul className="space-y-1">
                    {riskAnalysis.recommendations.slice(0, 3).map((rec, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulation Recommendations */}
      {results.recommendations && results.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">{index + 1}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}