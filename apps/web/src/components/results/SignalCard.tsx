"use client"

import { AssetRecommendation } from '@/lib/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  DollarSign,
  BarChart3,
  Target,
  AlertTriangle,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignalCardProps {
  asset: AssetRecommendation
  onExternalLink?: (url: string, type: string) => void
  onAddToPortfolio?: (asset: AssetRecommendation) => void
  className?: string
}

const RISK_COLORS = {
  low: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900',
  medium: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-900',
  high: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900',
  extreme: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-900'
}

const ACTION_COLORS = {
  buy: 'bg-green-500',
  sell: 'bg-red-500', 
  hold: 'bg-amber-500',
  watch: 'bg-blue-500',
  mint: 'bg-purple-500',
  stake: 'bg-indigo-500'
}

const BLOCKCHAIN_COLORS = {
  ethereum: 'bg-blue-600',
  polygon: 'bg-purple-600',
  arbitrum: 'bg-blue-500',
  optimism: 'bg-red-500',
  base: 'bg-blue-700',
  solana: 'bg-green-500',
  avalanche: 'bg-red-600',
  bsc: 'bg-yellow-500',
  other: 'bg-gray-500'
}

export function SignalCard({ asset, onExternalLink, onAddToPortfolio, className }: SignalCardProps) {
  const { recommendation } = asset
  const confidencePercent = Math.round(recommendation.confidence * 100)
  
  const handleExternalClick = (url: string, type: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
    onExternalLink?.(url, type)
  }

  const formatPrice = (price: number) => {
    if (price < 0.01) return `$${price.toFixed(6)}`
    if (price < 1) return `$${price.toFixed(4)}`
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`
    return `$${volume.toFixed(2)}`
  }

  return (
    <Card className={cn("group hover:shadow-lg transition-all duration-200", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{asset.symbol}</h3>
              <Badge 
                variant="outline" 
                className={cn("text-xs", BLOCKCHAIN_COLORS[asset.blockchain])}
              >
                {asset.blockchain}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{asset.name}</p>
            <Badge variant="secondary" className="w-fit">
              {asset.type.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="text-right space-y-1">
            <div className="flex items-center gap-1">
              <div 
                className={cn("w-2 h-2 rounded-full", ACTION_COLORS[recommendation.action])}
              ></div>
              <span className="text-sm font-medium capitalize">
                {recommendation.action}
              </span>
            </div>
            <div className={cn(
              "text-xs px-2 py-1 rounded-full border",
              RISK_COLORS[recommendation.riskLevel]
            )}>
              {recommendation.riskLevel} risk
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Information */}
        {asset.currentPrice && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                Current Price
              </div>
              <p className="font-semibold">{formatPrice(asset.currentPrice)}</p>
            </div>
            
            {asset.priceChange24h !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {asset.priceChange24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  24h Change
                </div>
                <p className={cn(
                  "font-semibold",
                  asset.priceChange24h >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {asset.priceChange24h >= 0 ? '+' : ''}{asset.priceChange24h.toFixed(2)}%
                </p>
              </div>
            )}
          </div>
        )}

        {/* Volume and Market Cap */}
        <div className="grid grid-cols-2 gap-4">
          {asset.volume24h && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <BarChart3 className="h-3 w-3" />
                Volume 24h
              </div>
              <p className="text-sm">{formatVolume(asset.volume24h)}</p>
            </div>
          )}
          
          {asset.marketCap && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                Market Cap
              </div>
              <p className="text-sm">{formatVolume(asset.marketCap)}</p>
            </div>
          )}

          {asset.floorPrice && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                Floor Price
              </div>
              <p className="text-sm">{formatPrice(asset.floorPrice)}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Recommendation Details */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence</span>
              <span className="text-sm text-muted-foreground">{confidencePercent}%</span>
            </div>
            <Progress value={confidencePercent} className="h-2" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Reasoning
            </div>
            <p className="text-sm leading-relaxed">{recommendation.reasoning}</p>
          </div>

          {recommendation.timeframe && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Timeframe: {recommendation.timeframe}</span>
            </div>
          )}

          {recommendation.targetPrice && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>Target: {formatPrice(recommendation.targetPrice)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Add to Portfolio Button */}
        {onAddToPortfolio && (
          <div className="space-y-2">
            <Button
              onClick={() => onAddToPortfolio(asset)}
              className="w-full"
              size="sm"
            >
              <Target className="h-3 w-3 mr-2" />
              Add to Portfolio
            </Button>
          </div>
        )}

        {onAddToPortfolio && asset.links && <Separator />}

        {/* External Links */}
        {asset.links && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">External Links</p>
            <div className="flex flex-wrap gap-2">
              {asset.links.opensea && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleExternalClick(asset.links!.opensea!, 'opensea')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  OpenSea
                </Button>
              )}
              
              {asset.links.website && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleExternalClick(asset.links!.website!, 'website')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Website
                </Button>
              )}
              
              {asset.links.twitter && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleExternalClick(asset.links!.twitter!, 'twitter')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Twitter
                </Button>
              )}
              
              {asset.links.discord && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleExternalClick(asset.links!.discord!, 'discord')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Discord
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SignalCard