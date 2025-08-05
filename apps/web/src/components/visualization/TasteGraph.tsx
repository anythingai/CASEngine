"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { SearchResponse } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
  ssr: false,
  loading: () => <div className="w-full h-96 bg-muted/20 animate-pulse rounded-lg flex items-center justify-center">
    <p className="text-muted-foreground">Loading graph visualization...</p>
  </div>
})

interface GraphNode {
  id: string
  name: string
  type: 'query' | 'theme' | 'category' | 'asset'
  size: number
  color: string
  data?: any
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  strength: number
  color: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface TasteGraphProps {
  data: SearchResponse
  onNodeClick?: (node: GraphNode) => void
  height?: number
  className?: string
}

const NODE_COLORS = {
  query: '#3b82f6',      // blue-500
  theme: '#10b981',      // emerald-500
  category: '#f59e0b',   // amber-500
  asset: '#8b5cf6',      // violet-500
}

const LINK_COLORS = {
  strong: '#10b981',     // emerald-500
  medium: '#f59e0b',     // amber-500
  weak: '#6b7280',       // gray-500
}

export function TasteGraph({ data, onNodeClick, height = 400, className = '' }: TasteGraphProps) {
  const graphRef = useRef<any>()
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height })

  // Transform SearchResponse data into graph format
  const transformDataToGraph = useCallback((searchData: SearchResponse): GraphData => {
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []

    // Create central query node
    const queryNode: GraphNode = {
      id: 'query',
      name: searchData.query,
      type: 'query',
      size: 20,
      color: NODE_COLORS.query,
      data: { query: searchData.query }
    }
    nodes.push(queryNode)

    // Create theme nodes
    searchData.themes?.forEach((theme, index) => {
      const themeNode: GraphNode = {
        id: `theme-${index}`,
        name: theme,
        type: 'theme',
        size: 15,
        color: NODE_COLORS.theme,
        data: { theme }
      }
      nodes.push(themeNode)

      // Link query to themes
      links.push({
        source: 'query',
        target: `theme-${index}`,
        strength: 0.8,
        color: LINK_COLORS.strong
      })
    })

    // Create category nodes from taste profile
    if (searchData.tasteProfile?.primaryCategories) {
      searchData.tasteProfile.primaryCategories.forEach((category, index) => {
        const categoryNode: GraphNode = {
          id: `category-${index}`,
          name: category,
          type: 'category',
          size: 12,
          color: NODE_COLORS.category,
          data: { category, sentiment: searchData.tasteProfile?.sentiment }
        }
        nodes.push(categoryNode)

        // Link categories to themes (simplified correlation)
        searchData.themes?.slice(0, 2).forEach((_, themeIndex) => {
          links.push({
            source: `theme-${themeIndex}`,
            target: `category-${index}`,
            strength: 0.6,
            color: LINK_COLORS.medium
          })
        })
      })
    }

    // Create asset nodes
    searchData.assets?.slice(0, 8).forEach((asset, index) => {
      const assetNode: GraphNode = {
        id: `asset-${index}`,
        name: asset.symbol,
        type: 'asset',
        size: 10 + (asset.recommendation.confidence * 8), // Size based on confidence
        color: NODE_COLORS.asset,
        data: asset
      }
      nodes.push(assetNode)

      // Link assets to categories based on confidence
      const confidence = asset.recommendation.confidence
      const linkStrength = confidence > 0.7 ? 0.8 : confidence > 0.5 ? 0.6 : 0.4
      const linkColor = confidence > 0.7 ? LINK_COLORS.strong : confidence > 0.5 ? LINK_COLORS.medium : LINK_COLORS.weak

      // Connect to most relevant category or theme
      const targetIndex = index % Math.max(1, (searchData.tasteProfile?.primaryCategories?.length || 0))
      const targetId = searchData.tasteProfile?.primaryCategories ? `category-${targetIndex}` : `theme-${targetIndex % searchData.themes.length}`

      links.push({
        source: targetId,
        target: `asset-${index}`,
        strength: linkStrength,
        color: linkColor
      })
    })

    return { nodes, links }
  }, [])

  // Update graph data when props change
  useEffect(() => {
    const newGraphData = transformDataToGraph(data)
    setGraphData(newGraphData)
  }, [data, transformDataToGraph])

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node)
    onNodeClick?.(node)
  }, [onNodeClick])

  // Handle node hover
  const handleNodeHover = useCallback((node: any) => {
    if (graphRef.current) {
      // Highlight connected nodes
      const connectedNodes = new Set<string>()
      if (node) {
        connectedNodes.add(node.id)
        graphData.links.forEach(link => {
          const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id
          const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id
          
          if (sourceId === node.id) {
            connectedNodes.add(targetId)
          }
          if (targetId === node.id) {
            connectedNodes.add(sourceId)
          }
        })
      }
      
      // Update node opacity based on hover state
      graphRef.current.nodeCanvasObject((node: any, ctx: any, globalScale: number) => {
        const label = node.name
        const fontSize = Math.max(12, 16 / globalScale)
        ctx.font = `${fontSize}px Sans-Serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Node opacity
        const isConnected = connectedNodes.size === 0 || connectedNodes.has(node.id)
        ctx.globalAlpha = isConnected ? 1 : 0.2
        
        // Draw node
        ctx.fillStyle = node.color
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size / 2, 0, 2 * Math.PI, false)
        ctx.fill()
        
        // Draw label
        ctx.fillStyle = '#fff'
        ctx.fillText(label, node.x, node.y)
        
        ctx.globalAlpha = 1
      })
    }
  }, [graphData.links])

  // Responsive sizing
  useEffect(() => {
    const handleResize = () => {
      const container = graphRef.current?.container
      if (container) {
        const rect = container.getBoundingClientRect()
        setDimensions({ width: rect.width, height })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [height])

  return (
    <div className={`relative ${className}`}>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Cultural Taste Network</h3>
            <p className="text-sm text-muted-foreground">
              Interactive visualization of cultural correlations and asset opportunities
            </p>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    Query
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Original search query</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Themes
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Expanded cultural themes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    Categories
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Cultural categories</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1">
                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                    Assets
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Investment opportunities</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="transparent"
            nodeAutoColorBy="type"
            nodeLabel="name"
            nodeVal="size"
            nodeColor="color"
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.01}
            linkColor="color"
            linkWidth={(link: any) => link.strength * 3}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            enablePointerInteraction={true}
          />
        </div>
        
        {selectedNode && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedNode.color }}
              ></div>
              <h4 className="font-medium capitalize">{selectedNode.type}</h4>
            </div>
            <p className="font-semibold">{selectedNode.name}</p>
            {selectedNode.data && selectedNode.type === 'asset' && (
              <div className="mt-2 text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium">Type:</span> {selectedNode.data.type}</p>
                <p><span className="font-medium">Confidence:</span> {Math.round(selectedNode.data.recommendation.confidence * 100)}%</p>
                <p><span className="font-medium">Action:</span> {selectedNode.data.recommendation.action}</p>
                {selectedNode.data.currentPrice && (
                  <p><span className="font-medium">Price:</span> ${selectedNode.data.currentPrice.toFixed(4)}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}