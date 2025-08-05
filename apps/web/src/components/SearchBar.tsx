"use client"

import { useState } from "react"
import { Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

const EXAMPLE_VIBES = [
  "solarpunk",
  "gothcore futurism", 
  "Y2K revival",
  "dark academia",
  "cottagecore",
  "cyberpunk minimalism"
]

export function SearchBar({ 
  onSearch, 
  isLoading = false, 
  placeholder = "Enter cultural vibe to analyze...",
  className 
}: SearchBarProps) {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !isLoading) {
      onSearch(query.trim())
    }
  }

  const handleExampleClick = (vibe: string) => {
    if (!isLoading) {
      setQuery(vibe)
      onSearch(vibe)
    }
  }

  return (
    <div className={cn("w-full max-w-2xl mx-auto space-y-4", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-16 h-12 text-base border-2 focus:border-primary/50 transition-colors"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="sm" 
            className="absolute right-2 top-1/2 -translate-y-1/2"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground text-center">
          Try these cultural vibes:
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLE_VIBES.map((vibe) => (
            <Badge
              key={vibe}
              variant="outline"
              className={cn(
                "cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => handleExampleClick(vibe)}
            >
              {vibe}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}