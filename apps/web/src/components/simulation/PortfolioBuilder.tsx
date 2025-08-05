"use client"

import { useState, useCallback, useMemo } from 'react'
import { AssetRecommendation } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SimulationConfig } from './SimulationPanel'
import { 
  Plus,
  Minus,
  RefreshCw,
  Target,
  DollarSign,
  Percent,
  TrendingUp,
  AlertTriangle,
  Settings2,
  PieChart
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PortfolioBuilderProps {
  assets: AssetRecommendation[]
  config: SimulationConfig
  onConfigUpdate: (updates: Partial<SimulationConfig>) => void
  onRunSimulation: () => void
  isSimulating: boolean
}

export function PortfolioBuilder({
  assets,
  config,
  onConfigUpdate,
  onRunSimulation,
  isSimulating
}: PortfolioBuilderProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  // Calculate total allocation for validation
  const totalAllocation = useMemo(() => {
    return config.selectedAssets.reduce((sum, item) => sum + item.allocation, 0)
  }, [config.selectedAssets])

  const remainingAllocation = 100 - totalAllocation
  const isValidAllocation = Math.abs(totalAllocation - 100) <= 0.1

  // Available assets (not already selected)
  const availableAssets = useMemo(() => {
    const selectedSymbols = new Set(config.selectedAssets.map(item => item.asset.symbol))
    return assets.filter(asset => !selectedSymbols.has(asset.symbol))
  }, [assets, config.selectedAssets])

  const addAsset = useCallback((asset: AssetRecommendation) => {
    const defaultAllocation = Math.min(remainingAllocation, 20) // Default to 20% or remaining
    
    onConfigUpdate({
      selectedAssets: [
        ...config.selectedAssets,
        { asset, allocation: defaultAllocation }
      ]
    })
  }, [config.selectedAssets, remainingAllocation, onConfigUpdate])

  const removeAsset = useCallback((index: number) => {
    const newSelectedAssets = config.selectedAssets.filter((_, i) => i !== index)
    onConfigUpdate({ selectedAssets: newSelectedAssets })
  }, [config.selectedAssets, onConfigUpdate])

  const updateAllocation = useCallback((index: number, allocation: number) => {
    const newSelectedAssets = [...config.selectedAssets]
    newSelectedAssets[index] = { ...newSelectedAssets[index], allocation }
    onConfigUpdate({ selectedAssets: newSelectedAssets })
  }, [config.selectedAssets, onConfigUpdate])

  const equalizeAllocations = useCallback(() => {
    if (config.selectedAssets.length === 0) return
    
    const equalAllocation = 100 / config.selectedAssets.length
    const newSelectedAssets = config.selectedAssets.map(item => ({
      ...item,
      allocation: equalAllocation
    }))
    onConfigUpdate({ selectedAssets: newSelectedAssets })
  }, [config.selectedAssets, onConfigUpdate])

  const optimizeAllocations = useCallback(() => {
    if (config.selectedAssets.length === 0) return

    // Weight by confidence and inverse risk
    const totalWeight = config.selectedAssets.reduce((sum, item) => {
      const confidence = item.asset.recommendation.confidence
      const riskWeight = item.asset.recommendation.riskLevel === 'low' ? 1.5 :
                        item.asset.recommendation.riskLevel === 'medium' ? 1.0 :
                        item.asset.recommendation.riskLevel === 'high' ? 0.7 : 0.5
      return sum + (confidence * riskWeight)
    }, 0)

    const newSelectedAssets = config.selectedAssets.map(item => {
      const confidence = item.asset.recommendation.confidence
      const riskWeight = item.asset.recommendation.riskLevel === 'low' ? 1.5 :
                        item.asset.recommendation.riskLevel === 'medium' ? 1.0 :
                        item.asset.recommendation.riskLevel === 'high' ? 0.7 : 0.5
      const weight = (confidence * riskWeight) / totalWeight
      return { ...item, allocation: Math.round(weight * 100 * 100) / 100 }
    })
    
    onConfigUpdate({ selectedAssets: newSelectedAssets })
  }, [config.selectedAssets, onConfigUpdate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Configuration */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Portfolio Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portfolio-size">Portfolio Size</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="portfolio-size"
                  type="number"
                  value={config.portfolioSize}
                  onChange={(e) => onConfigUpdate({ portfolioSize: Math.max(100, parseInt(e.target.value) || 100) })}
                  className="pl-9"
                  min="100"
                  step="100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Risk Tolerance</Label>
              <Select
                value={config.riskTolerance}
                onValueChange={(value: string) =>
                  onConfigUpdate({ riskTolerance: value as 'conservative' | 'moderate' | 'aggressive' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative (Lower risk)</SelectItem>
                  <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
                  <SelectItem value="aggressive">Aggressive (Higher risk)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Horizon</Label>
              <Select
                value={config.timeHorizon}
                onValueChange={(value: string) =>
                  onConfigUpdate({ timeHorizon: value as '1m' | '3m' | '6m' | '1y' | '2y' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Month (Short-term)</SelectItem>
                  <SelectItem value="3m">3 Months (Medium-term)</SelectItem>
                  <SelectItem value="6m">6 Months (Medium-term)</SelectItem>
                  <SelectItem value="1y">1 Year (Long-term)</SelectItem>
                  <SelectItem value="2y">2 Years (Long-term)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="advanced-settings"
                checked={showAdvancedSettings}
                onCheckedChange={setShowAdvancedSettings}
              />
              <Label htmlFor="advanced-settings">Advanced Settings</Label>
            </div>

            {showAdvancedSettings && (
              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label>Rebalancing Frequency</Label>
                  <Select
                    value={config.rebalanceFrequency}
                    onValueChange={(value: string) =>
                      onConfigUpdate({ rebalanceFrequency: value as 'never' | 'monthly' | 'quarterly' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allocation Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Allocation Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Allocation</span>
                <span className={cn(
                  "font-medium",
                  isValidAllocation ? "text-green-600" : "text-red-600"
                )}>
                  {totalAllocation.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(totalAllocation, 100)} 
                className={cn(
                  "h-3",
                  totalAllocation > 100 && "bg-red-100"
                )}
              />
              {!isValidAllocation && (
                <p className="text-xs text-red-600">
                  {totalAllocation > 100 
                    ? `Over-allocated by ${(totalAllocation - 100).toFixed(1)}%`
                    : `Under-allocated by ${(100 - totalAllocation).toFixed(1)}%`
                  }
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Selected Assets</p>
                <p className="font-medium">{config.selectedAssets.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Available Assets</p>
                <p className="font-medium">{availableAssets.length}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={equalizeAllocations}
                disabled={config.selectedAssets.length === 0}
                className="flex-1"
              >
                <Target className="h-3 w-3 mr-1" />
                Equal Weight
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={optimizeAllocations}
                disabled={config.selectedAssets.length === 0}
                className="flex-1"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Optimize
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Assets */}
      {config.selectedAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Selected Assets ({config.selectedAssets.length})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onRunSimulation}
                disabled={!isValidAllocation || isSimulating}
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  'Run Simulation'
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {config.selectedAssets.map((item, index) => (
                <div key={item.asset.symbol} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{item.asset.symbol}</h4>
                        <Badge variant="outline" className="text-xs">
                          {item.asset.type.replace('_', ' ')}
                        </Badge>
                        <Badge 
                          variant={item.asset.recommendation.riskLevel === 'low' ? 'default' :
                                 item.asset.recommendation.riskLevel === 'medium' ? 'secondary' :
                                 'destructive'}
                          className="text-xs"
                        >
                          {item.asset.recommendation.riskLevel} risk
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.asset.name}</p>
                      {item.asset.currentPrice && (
                        <p className="text-sm font-medium">
                          ${item.asset.currentPrice.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAsset(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <Label>Allocation: {item.allocation.toFixed(1)}%</Label>
                        <span className="text-muted-foreground">
                          {formatCurrency((config.portfolioSize * item.allocation) / 100)}
                        </span>
                      </div>
                      <Slider
                        value={[item.allocation]}
                        onValueChange={([value]: number[]) => updateAllocation(index, value)}
                        max={100}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                      <div>
                        <span>Confidence: </span>
                        <span className="font-medium">
                          {Math.round(item.asset.recommendation.confidence * 100)}%
                        </span>
                      </div>
                      <div>
                        <span>Action: </span>
                        <span className="font-medium capitalize">
                          {item.asset.recommendation.action}
                        </span>
                      </div>
                      <div>
                        <span>Blockchain: </span>
                        <span className="font-medium capitalize">
                          {item.asset.blockchain}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Assets */}
      {availableAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Available Assets ({availableAssets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {availableAssets.map((asset) => (
                <div key={asset.symbol} className="border rounded-lg p-3 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{asset.symbol}</h4>
                        <Badge variant="outline" className="text-xs">
                          {asset.type.replace('_', ' ')}
                        </Badge>
                        <Badge 
                          variant={asset.recommendation.riskLevel === 'low' ? 'default' :
                                 asset.recommendation.riskLevel === 'medium' ? 'secondary' :
                                 'destructive'}
                          className="text-xs"
                        >
                          {asset.recommendation.riskLevel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{asset.name}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {asset.currentPrice && (
                          <span>${asset.currentPrice.toLocaleString()}</span>
                        )}
                        <span>Confidence: {Math.round(asset.recommendation.confidence * 100)}%</span>
                        <span className="capitalize">{asset.recommendation.action}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addAsset(asset)}
                      disabled={remainingAllocation <= 0}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Messages */}
      {!isValidAllocation && config.selectedAssets.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <p className="text-sm text-amber-700">
            Please adjust allocations to total exactly 100% before running the simulation.
          </p>
        </div>
      )}
    </div>
  )
}