"use client"

import { useState } from 'react'
import { SimulateResponse, RiskAnalysis } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SimulationConfig } from './SimulationPanel'
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  Activity,
  BarChart3,
  Target,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RiskAssessmentProps {
  results: SimulateResponse
  config: SimulationConfig
  className?: string
}

interface RiskFactor {
  name: string
  value: number
  level: 'low' | 'medium' | 'high' | 'extreme'
  description: string
  impact: string
}

export function RiskAssessment({ results, config, className }: RiskAssessmentProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'factors' | 'recommendations'>('overview')

  const { riskAnalysis, simulation } = results

  // Calculate additional risk metrics based on portfolio composition
  const calculatePortfolioRisks = (): RiskFactor[] => {
    const risks: RiskFactor[] = []

    // Concentration Risk
    const maxAllocation = Math.max(...simulation.assets.map(a => a.allocation))
    const concentrationLevel = maxAllocation > 40 ? 'high' : maxAllocation > 25 ? 'medium' : 'low'
    risks.push({
      name: 'Concentration Risk',
      value: maxAllocation,
      level: concentrationLevel,
      description: `Largest single position: ${maxAllocation.toFixed(1)}%`,
      impact: concentrationLevel === 'high' ? 'High exposure to single asset failure' : 
              concentrationLevel === 'medium' ? 'Moderate single-asset dependency' :
              'Well-diversified portfolio'
    })

    // Volatility Risk
    const volatility = simulation.performance?.volatility || 20
    const volatilityLevel = volatility > 30 ? 'extreme' : volatility > 20 ? 'high' : volatility > 10 ? 'medium' : 'low'
    risks.push({
      name: 'Volatility Risk',
      value: volatility,
      level: volatilityLevel,
      description: `Expected volatility: ${volatility.toFixed(1)}%`,
      impact: volatilityLevel === 'extreme' ? 'Extreme price swings expected' :
              volatilityLevel === 'high' ? 'High price volatility' :
              volatilityLevel === 'medium' ? 'Moderate price movements' :
              'Stable price movements'
    })

    // Liquidity Risk (based on asset types)
    const nftCount = simulation.assets.filter(a => 
      config.selectedAssets.find(ca => ca.asset.symbol === a.symbol)?.asset.type.includes('nft')
    ).length
    const liquidityScore = ((simulation.assets.length - nftCount) / simulation.assets.length) * 100
    const liquidityLevel = liquidityScore < 30 ? 'high' : liquidityScore < 60 ? 'medium' : 'low'
    risks.push({
      name: 'Liquidity Risk',
      value: 100 - liquidityScore,
      level: liquidityLevel,
      description: `${nftCount} NFT positions out of ${simulation.assets.length} total`,
      impact: liquidityLevel === 'high' ? 'May be difficult to exit positions quickly' :
              liquidityLevel === 'medium' ? 'Some positions may have limited liquidity' :
              'Good liquidity across portfolio'
    })

    // Time Horizon Risk
    const timeHorizonRisk = config.timeHorizon === '1m' ? 'high' : 
                           config.timeHorizon === '3m' ? 'medium' : 'low'
    const timeValue = config.timeHorizon === '1m' ? 80 : 
                     config.timeHorizon === '3m' ? 50 : 
                     config.timeHorizon === '6m' ? 30 : 10
    risks.push({
      name: 'Time Horizon Risk',
      value: timeValue,
      level: timeHorizonRisk,
      description: `Investment period: ${config.timeHorizon}`,
      impact: timeHorizonRisk === 'high' ? 'Short time frame limits strategy effectiveness' :
              timeHorizonRisk === 'medium' ? 'Medium-term approach balances risk and opportunity' :
              'Long-term strategy allows for market cycle recovery'
    })

    return risks
  }

  const portfolioRisks = calculatePortfolioRisks()
  const overallRiskScore = riskAnalysis.riskScore

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'extreme': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'medium': return <Info className="h-4 w-4 text-yellow-600" />
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'extreme': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'low': return 'default'
      case 'medium': return 'secondary'
      case 'high': return 'destructive'
      case 'extreme': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Risk Overview Header */}
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Shield className="h-6 w-6" />
          Risk Assessment
        </h3>
        <p className="text-muted-foreground">
          Comprehensive risk analysis for your {simulation.assets.length}-asset portfolio
        </p>
      </div>

      {/* Overall Risk Score */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h4 className="text-lg font-semibold">Overall Risk Score</h4>
              <div className="text-5xl font-bold">
                <span className={getRiskColor(riskAnalysis.overallRisk)}>
                  {overallRiskScore}
                </span>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <Badge 
                variant={getRiskBadgeVariant(riskAnalysis.overallRisk)}
                className="text-base px-4 py-1 capitalize"
              >
                {riskAnalysis.overallRisk} Risk
              </Badge>
            </div>
            <Progress value={overallRiskScore} className="h-3 max-w-xs mx-auto" />
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {overallRiskScore < 30 ? 'Conservative portfolio with lower expected volatility' :
               overallRiskScore < 60 ? 'Balanced risk profile suitable for moderate investors' :
               overallRiskScore < 80 ? 'Aggressive portfolio with higher growth potential' :
               'High-risk portfolio requiring careful monitoring'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="factors" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Risk Factors
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Mitigation
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {riskAnalysis.factors.map((factor, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{factor.factor}</span>
                      <Badge variant={getRiskBadgeVariant(factor.impact)} className="text-xs capitalize">
                        {factor.impact}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{factor.description}</p>
                    <Progress 
                      value={factor.impact === 'high' ? 80 : factor.impact === 'medium' ? 50 : 20} 
                      className="h-2" 
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Portfolio Composition Risk */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Composition Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Assets</span>
                      <p className="font-medium">{simulation.assets.length}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Risk Tolerance</span>
                      <p className="font-medium capitalize">{config.riskTolerance}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time Horizon</span>
                      <p className="font-medium">{config.timeHorizon}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rebalancing</span>
                      <p className="font-medium capitalize">{config.rebalanceFrequency}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h5 className="font-medium text-sm">Asset Type Breakdown</h5>
                    {config.selectedAssets.reduce((acc, item) => {
                      const type = item.asset.type
                      if (!acc[type]) acc[type] = { count: 0, allocation: 0 }
                      acc[type].count++
                      acc[type].allocation += item.allocation
                      return acc
                    }, {} as Record<string, { count: number; allocation: number }>)
                    && Object.entries(
                      config.selectedAssets.reduce((acc, item) => {
                        const type = item.asset.type
                        if (!acc[type]) acc[type] = { count: 0, allocation: 0 }
                        acc[type].count++
                        acc[type].allocation += item.allocation
                        return acc
                      }, {} as Record<string, { count: number; allocation: number }>)
                    ).map(([type, data]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span>{data.count} assets ({data.allocation.toFixed(1)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Factors Tab */}
        <TabsContent value="factors" className="mt-6">
          <div className="grid gap-4">
            {portfolioRisks.map((risk, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getRiskIcon(risk.level)}
                      <div>
                        <h4 className="font-medium">{risk.name}</h4>
                        <p className="text-sm text-muted-foreground">{risk.description}</p>
                      </div>
                    </div>
                    <Badge variant={getRiskBadgeVariant(risk.level)} className="capitalize">
                      {risk.level}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <Progress value={risk.value} className="h-2" />
                    <p className="text-sm text-muted-foreground">{risk.impact}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="mt-6">
          <div className="space-y-6">
            {/* AI Recommendations */}
            {riskAnalysis.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    AI Risk Mitigation Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {riskAnalysis.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-primary">{index + 1}</span>
                        </div>
                        <p className="text-sm leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* General Risk Management Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  General Risk Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Best Practices
                      </h5>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Regular portfolio monitoring and rebalancing</li>
                        <li>• Set stop-loss orders for high-risk positions</li>
                        <li>• Diversify across different asset types and sectors</li>
                        <li>• Keep emergency funds separate from investments</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        Warning Signs
                      </h5>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Single position exceeds 30% of portfolio</li>
                        <li>• Consecutive losses over 3 months</li>
                        <li>• High correlation between assets during stress</li>
                        <li>• Inability to exit positions when needed</li>
                      </ul>
                    </div>
                  </div>

                  <Separator />

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Remember</p>
                        <p className="text-sm text-blue-700">
                          This risk assessment is based on historical data and projections. 
                          Actual results may vary significantly. Never invest more than you can afford to lose.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}