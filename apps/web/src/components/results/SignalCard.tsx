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
  low: 'text-success bg-success/10 border-success/20 shadow-success/10',
  medium: 'text-warning bg-warning/10 border-warning/20 shadow-warning/10',
  high: 'text-destructive bg-destructive/10 border-destructive/20 shadow-destructive/10',
  extreme: 'text-neon bg-neon/10 border-neon/20 shadow-neon/10'
}

const ACTION_COLORS = {
  buy: 'bg-success shadow-success/20',
  sell: 'bg-destructive shadow-destructive/20',
  hold: 'bg-warning shadow-warning/20',
  watch: 'bg-info shadow-info/20',
  mint: 'bg-neon shadow-neon/20',
  stake: 'bg-cyber shadow-cyber/20'
}

const BLOCKCHAIN_COLORS = {
  ethereum: 'bg-blue-600 text-white',
  polygon: 'bg-purple-600 text-white',
  arbitrum: 'bg-blue-500 text-white',
  optimism: 'bg-red-500 text-white',
  base: 'bg-blue-700 text-white',
  solana: 'bg-green-500 text-white',
  avalanche: 'bg-red-600 text-white',
  bsc: 'bg-warning text-white',
  other: 'bg-muted text-muted-foreground'
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
    <Card className={cn("group glass-card", className)}>
      <CardHeader className="pb-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold">{asset.symbol}</h3>
              <Badge
                className={cn("px-3 py-1 rounded-xl font-medium", BLOCKCHAIN_COLORS[asset.blockchain])}
              >
                {asset.blockchain}
              </Badge>
            </div>
            <p className="text-base text-muted-foreground font-medium">{asset.name}</p>
            <Badge variant="secondary" className="w-fit px-3 py-1 rounded-xl font-medium">
              {asset.type.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="text-right space-y-3">
            <div className="flex items-center gap-2">
              <div
                className={cn("w-3 h-3 rounded-full", ACTION_COLORS[recommendation.action])}
              ></div>
              <span className="text-base font-bold capitalize">
                {recommendation.action}
              </span>
            </div>
            <div className={cn(
              "text-sm px-3 py-2 rounded-xl border-2 font-bold shadow-lg",
              RISK_COLORS[recommendation.riskLevel]
            )}>
              {recommendation.riskLevel} risk
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Price Information */}
        {asset.currentPrice && (
          <div className="glass-card p-4 space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Current Price
                </div>
                <p className="text-xl font-bold">{formatPrice(asset.currentPrice)}</p>
              </div>
              
              {asset.priceChange24h !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {asset.priceChange24h >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    24h Change
                  </div>
                  <p className={cn(
                    "text-xl font-bold",
                    asset.priceChange24h >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {asset.priceChange24h >= 0 ? '+' : ''}{asset.priceChange24h.toFixed(2)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Volume and Market Cap */}
        <div className="grid grid-cols-2 gap-4">
          {asset.volume24h && (
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Volume 24h
              </div>
              <p className="text-lg font-bold">{formatVolume(asset.volume24h)}</p>
            </div>
          )}
          
          {asset.marketCap && (
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                Market Cap
              </div>
              <p className="text-lg font-bold">{formatVolume(asset.marketCap)}</p>
            </div>
          )}

          {asset.floorPrice && (
            <div className="glass-card p-4 space-y-2 col-span-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Floor Price
              </div>
              <p className="text-lg font-bold">{formatPrice(asset.floorPrice)}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Recommendation Details */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold">AI Confidence</span>
              <span className="text-base font-bold gradient-text-cosmic">{confidencePercent}%</span>
            </div>
            <Progress value={confidencePercent} className="h-3 gradient-animated" />
          </div>

          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              AI Reasoning
            </div>
            <p className="text-base leading-relaxed font-medium">{recommendation.reasoning}</p>
          </div>

          {recommendation.timeframe && (
            <div className="flex items-center gap-3 text-base font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Timeframe: <span className="gradient-text-aurora">{recommendation.timeframe}</span></span>
            </div>
          )}

          {recommendation.targetPrice && (
            <div className="flex items-center gap-3 text-base font-medium">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span>Target: <span className="gradient-text-cyber">{formatPrice(recommendation.targetPrice)}</span></span>
            </div>
          )}
        </div>

        <Separator />

        {/* Add to Portfolio Button */}
        {onAddToPortfolio && (
          <Button
            onClick={() => onAddToPortfolio(asset)}
            className="w-full h-12 text-base font-bold gradient-bg-cosmic text-white border-0 shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Target className="h-5 w-5 mr-3" />
            Add to Portfolio
          </Button>
        )}

        {onAddToPortfolio && asset.links && <Separator />}

        {/* External Links */}
        {asset.links && (
          <div className="space-y-4">
            <p className="text-base font-bold text-muted-foreground">External Links</p>
            <div className="flex flex-wrap gap-3">
              {asset.links.opensea && (
                <Button
                  variant="outline"
                  className="glass-button hover:gradient-bg-aurora hover:text-white hover:border-transparent"
                  onClick={() => handleExternalClick(asset.links!.opensea!, 'opensea')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  OpenSea
                </Button>
              )}
              
              {asset.links.website && (
                <Button
                  variant="outline"
                  className="glass-button hover:gradient-bg-cosmic hover:text-white hover:border-transparent"
                  onClick={() => handleExternalClick(asset.links!.website!, 'website')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Website
                </Button>
              )}
              
              {asset.links.twitter && (
                <Button
                  variant="outline"
                  className="glass-button hover:gradient-bg-cyberpunk hover:text-white hover:border-transparent"
                  onClick={() => handleExternalClick(asset.links!.twitter!, 'twitter')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
              )}
              
              {asset.links.discord && (
                <Button
                  variant="outline"
                  className="glass-button hover:gradient-bg-aurora hover:text-white hover:border-transparent"
                  onClick={() => handleExternalClick(asset.links!.discord!, 'discord')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
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