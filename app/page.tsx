"use client"

import type React from "react"

import { useState } from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function FinancialSearch() {
  const [ticker, setTicker] = useState("")
  const [query, setQuery] = useState("")
  const [selectedTicker, setSelectedTicker] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleTickerSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker) return

    setLoading(true)
    // Simulate API call to validate ticker
    setTimeout(() => {
      setSelectedTicker(ticker.toUpperCase())
      setLoading(false)

      // Mock data for demonstration
      setResults({
        symbol: ticker.toUpperCase(),
        companyName:
          ticker.toUpperCase() === "AAPL"
            ? "Apple Inc."
            : ticker.toUpperCase() === "MSFT"
              ? "Microsoft Corporation"
              : ticker.toUpperCase() === "GOOGL"
                ? "Alphabet Inc."
                : "Example Corporation",
        exchange: "NASDAQ",
        industry: "Technology",
        marketCap: "$2.5T",
        price: "$175.34",
      })
    }, 1000)
  }

  const handleInfoQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicker || !query) return

    setLoading(true)
    // Simulate API call for specific information
    setTimeout(() => {
      setLoading(false)

      // Mock data based on query
      if (query.toLowerCase().includes("revenue")) {
        setResults({
          ...results,
          queryResult: {
            type: "Revenue",
            currentYear: "$394.3 billion",
            previousYear: "$365.8 billion",
            growth: "+7.8%",
          },
        })
      } else if (query.toLowerCase().includes("profit") || query.toLowerCase().includes("income")) {
        setResults({
          ...results,
          queryResult: {
            type: "Net Income",
            currentYear: "$97.2 billion",
            previousYear: "$94.7 billion",
            growth: "+2.6%",
          },
        })
      } else if (query.toLowerCase().includes("employee")) {
        setResults({
          ...results,
          queryResult: {
            type: "Employees",
            count: "164,000",
            yearOverYearChange: "+4.2%",
          },
        })
      } else {
        setResults({
          ...results,
          queryResult: {
            type: "General Info",
            message: `Information about "${query}" for ${selectedTicker}`,
          },
        })
      }
    }, 1000)
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">SEC Search</h1>

      <div className="grid gap-8 md:grid-cols-[1fr_1.5fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search for a Ticker</CardTitle>
              <CardDescription>Enter a stock symbol to begin your search</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTickerSearch} className="flex gap-2">
                <Input
                  placeholder="Enter ticker symbol (e.g., AAPL)"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                />
                <Button type="submit" disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {selectedTicker && (
            <Card>
              <CardHeader>
                <CardTitle>Query Information</CardTitle>
                <CardDescription>Ask about {selectedTicker}'s financial data</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInfoQuery} className="flex gap-2">
                  <Input
                    placeholder="E.g., current year revenue, profit margin"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <Button type="submit" disabled={loading}>
                    {loading ? "Querying..." : "Query"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl font-bold">{results.symbol}</span>
                  <span className="text-lg font-normal text-muted-foreground">{results.companyName}</span>
                </CardTitle>
                <CardDescription>
                  {results.exchange} • {results.industry}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList className="mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    {results.queryResult && <TabsTrigger value="query">Query Results</TabsTrigger>}
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Market Cap</p>
                        <p className="text-lg font-medium">{results.marketCap}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Current Price</p>
                        <p className="text-lg font-medium">{results.price}</p>
                      </div>
                    </div>
                  </TabsContent>

                  {results.queryResult && (
                    <TabsContent value="query" className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2">{results.queryResult.type}</h3>

                        {results.queryResult.currentYear && (
                          <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                              <p className="text-sm text-muted-foreground">Current Year</p>
                              <p className="font-medium">{results.queryResult.currentYear}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Previous Year</p>
                              <p className="font-medium">{results.queryResult.previousYear}</p>
                            </div>
                          </div>
                        )}

                        {results.queryResult.growth && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">Growth</p>
                            <p
                              className={`font-medium ${results.queryResult.growth.startsWith("+") ? "text-green-600" : "text-red-600"}`}
                            >
                              {results.queryResult.growth}
                            </p>
                          </div>
                        )}

                        {results.queryResult.count && (
                          <div>
                            <p className="text-sm text-muted-foreground">Count</p>
                            <p className="font-medium">{results.queryResult.count}</p>
                          </div>
                        )}

                        {results.queryResult.message && <p>{results.queryResult.message}</p>}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          )}

          {!results && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] border rounded-lg p-8 bg-muted/50">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No Results Yet</h3>
              <p className="text-center text-muted-foreground">
                Search for a ticker symbol to see company information, then query for specific financial data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
