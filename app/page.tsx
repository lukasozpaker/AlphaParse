"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Search, Check } from "lucide-react";

import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { tickerToCIK } from "@/lib/resources";

type QueryResult = {
  id: string;
  timestamp: Date;
  type: string;
  query: string;
  currentYear?: string;
  previousYear?: string;
  growth?: string;
  count?: string;
  yearOverYearChange?: string;
  message?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type Company = {
  symbol: string;
  name: string;
};

export default function FinancialSearch() {
  const [ticker, setTicker] = useState("");
  const [query, setQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [selectedTicker, setSelectedTicker] = useState("");
  const [tickerData, setTickerData] = useState<any>(null);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"query" | "chat">("query");
  const [searchInput, setSearchInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [tickerOptions, setTickerOptions] = useState<Company[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [searchMode, setSearchMode] = useState<"ticker" | "company">("ticker");
  const searchRef = useRef<HTMLDivElement>(null);
  const ALPHAVANTAGE_KEY = process.env.ALPHAVANTAGE_KEY ?? null;

  // Ref for auto-scrolling chat
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (mode === "chat" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, mode]);

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchRef]);

  const fetchTickerSuggestions = async (search: string) => {
    if (!search || search.length < 1) {
      setTickerOptions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(
        `https://ticker-2e1ica8b9.now.sh/keyword/${search}`
      );

      // Check if response.data exists and is an array
      if (response.data && Array.isArray(response.data)) {
        // Sort results by name
        const sortedResults = [...response.data].sort((a, b) => {
          return a.name.localeCompare(b.name);
        });

        setTickerOptions(sortedResults);
      } else {
        console.error("API response is not in expected format:", response);
        setTickerOptions([]);
      }
    } catch (error) {
      console.error("Error fetching ticker suggestions:", error);
      setTickerOptions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTickerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);

    setSelectedTicker(ticker.toUpperCase());
    setLoading(false);

    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker.toUpperCase()}&apikey=${ALPHAVANTAGE_KEY}`
    );
    const data = await response.json();
    if (data["Global Quote"]) {
      const globalQuote = data["Global Quote"];
      setTickerData({
        symbol: ticker.toUpperCase(),
        companyName: "",
        exchange: "",
        industry: "",
        marketCap: "",
        todayChange: `${
          parseFloat(globalQuote["10. change percent"]) > 0 ? "+" : ""
        }${parseFloat(globalQuote["10. change percent"].slice(0, -1)).toFixed(
          2
        )}%`,
        volume: globalQuote["06. volume"],
        lastTradingDay: globalQuote["07. latest trading day"],
        price: `$${parseFloat(globalQuote["05. price"]).toFixed(2)}`,
      });
    } else {
      setTickerData(null);
    }
  };

  const handleInfoQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicker || !query) return;

    setLoading(true);
    // Simulate API call for specific information from 10K and 10Q filings
    setTimeout(() => {
      setLoading(false);

      // Generate a new query result
      let newResult: QueryResult = {
        id: Date.now().toString(),
        timestamp: new Date(),
        query: query,
        type: "Financial Analysis",
        message: `AI-generated insights about "${query}" for ${selectedTicker} based on recent financial filings`,
      };

      // Mock AI-generated data based on query
      if (query.toLowerCase().includes("revenue")) {
        newResult = {
          ...newResult,
          type: "Revenue Analysis",
          currentYear: "$394.3 billion",
          previousYear: "$365.8 billion",
          growth: "+7.8%",
        };
      } else if (
        query.toLowerCase().includes("profit") ||
        query.toLowerCase().includes("income")
      ) {
        newResult = {
          ...newResult,
          type: "Net Income Analysis",
          currentYear: "$97.2 billion",
          previousYear: "$94.7 billion",
          growth: "+2.6%",
        };
      } else if (query.toLowerCase().includes("employee")) {
        newResult = {
          ...newResult,
          type: "Employee Information",
          count: "164,000",
          yearOverYearChange: "+4.2%",
        };
      }

      // Add the new result to the beginning of the array (newest first)
      setQueryResults((prev) => [newResult, ...prev]);
      setQuery(""); // Clear the query input
    }, 1000);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput(""); // Clear input
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateAIResponse(chatInput, selectedTicker),
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, aiResponse]);
      setLoading(false);
    }, 1500);
  };

  // Helper function to generate mock AI responses
  const generateAIResponse = (message: string, ticker: string): string => {
    if (message.toLowerCase().includes("revenue")) {
      return `Based on ${ticker}'s latest 10-K filing, the company reported annual revenue of $394.3 billion, which represents a 7.8% increase from the previous year's $365.8 billion. This growth was primarily driven by their services segment, which saw a 14.2% year-over-year increase.`;
    } else if (
      message.toLowerCase().includes("profit") ||
      message.toLowerCase().includes("income")
    ) {
      return `${ticker}'s net income for the most recent fiscal year was $97.2 billion, up 2.6% from $94.7 billion in the previous year. Their operating margin decreased slightly from 30.3% to 29.8% due to increased R&D investments.`;
    } else if (message.toLowerCase().includes("employee")) {
      return `According to the latest SEC filings, ${ticker} currently employs approximately 164,000 people worldwide, which is a 4.2% increase from the previous year. The company has been expanding its workforce primarily in AI research and cloud services divisions.`;
    } else if (message.toLowerCase().includes("dividend")) {
      return `${ticker} currently pays a quarterly dividend of $0.24 per share, which translates to an annual yield of approximately 0.55% at the current share price. The company has consistently increased its dividend for the past 10 years, with an average annual growth rate of 7.3%.`;
    } else {
      return `I've analyzed ${ticker}'s recent financial filings for information about "${message}". While I don't have specific data on this exact query, I can help you find related information in their 10-K or 10-Q reports. Would you like me to look for something more specific?`;
    }
  };

  // Toggle search mode
  const toggleSearchMode = () => {
    setSearchMode(searchMode === "ticker" ? "company" : "ticker");
    // Clear search inputs when switching modes
    setSearchInput("");
    setTicker("");
    setShowDropdown(false);
  };

  // Handle company selection
  const handleSelectCompany = (option: Company) => {
    setSelectedCompanyName(option.name);
    setTicker(option.symbol);
    setSearchInput(option.symbol); // not showing ticker
    setShowDropdown(false);
    setSelectedTicker(option.symbol);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="container mx-auto py-10 px-4 pb-24">
      <h1 className="text-3xl font-bold text-center mb-8">
        Financial Data Search
      </h1>

      {/* Top row with ticker search and information cards */}
      <div className="grid gap-8 md:grid-cols-2 mb-8">
        {/* Ticker search card */}
        <Card className="h-[200px] flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  {searchMode === "ticker"
                    ? "Enter Ticker Symbol"
                    : "Search for a Company"}
                </CardTitle>
                <CardDescription>
                  {searchMode === "ticker"
                    ? "Enter a stock symbol directly"
                    : "Search by company name or ticker"}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="search-mode" className="text-xs">
                  {searchMode === "ticker" ? "Ticker" : "Company"}
                </Label>
                <Switch
                  id="search-mode"
                  checked={searchMode === "company"}
                  onCheckedChange={toggleSearchMode}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex items-center">
            <div className="w-full">
              {searchMode === "ticker" ? (
                // Simple ticker input mode
                <form
                  onSubmit={handleTickerSearch}
                  className="flex gap-2 w-full"
                >
                  <Input
                    placeholder="Enter ticker symbol (e.g., AAPL)"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    className="uppercase"
                  />
                  <Button type="submit" disabled={loading || !ticker}>
                    {loading ? "Searching..." : "Search"}
                  </Button>
                </form>
              ) : (
                // Company search with simple dropdown
                <div className="relative w-full" ref={searchRef}>
                  <Input
                    placeholder="Search company name or ticker..."
                    value={searchInput || ""}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      fetchTickerSuggestions(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full"
                  />

                  {/* Dropdown for search results */}
                  {showDropdown && (
                    <div className="absolute z-100 w-full mt-1 bg-popover rounded-md border shadow-md">
                      <div className="max-h-[300px] overflow-auto p-1">
                        {isSearching ? (
                          <div className="flex items-center justify-center py-6">
                            <p className="text-sm text-muted-foreground">
                              Searching...
                            </p>
                          </div>
                        ) : tickerOptions.length === 0 ? (
                          <div className="flex items-center justify-center py-6">
                            <p className="text-sm text-muted-foreground">
                              {searchInput
                                ? "No results found"
                                : "Type to search for companies"}
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-1">
                            {tickerOptions.map((option) => (
                              <Button
                                key={`${option.symbol}-${option.name}`}
                                variant="ghost"
                                className="flex w-full justify-start text-left"
                                onClick={() => handleSelectCompany(option)}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedCompanyName === option.name
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {option.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {option.symbol}
                                  </span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ticker information card */}
        <Card className="h-[200px] flex flex-col">
          {tickerData ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl font-bold">{tickerData.symbol}</span>
                  <span className="text-lg font-normal text-muted-foreground">
                    {tickerData.companyName}
                  </span>
                </CardTitle>
                <CardDescription>
                  {/* {tickerData.exchange} • {tickerData.industry} */}
                  Volume: {tickerData.volume} • {tickerData.lastTradingDay}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-center">
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Current Price
                    </p>
                    <p className="text-lg font-medium">{tickerData.price}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Change</p>
                    <p
                      className={`text-lg font-medium ${
                        tickerData.todayChange.startsWith("-")
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {tickerData.todayChange}
                    </p>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col justify-center items-center h-full">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No Ticker Selected</h3>
              <p className="text-center text-muted-foreground">
                Search for a ticker symbol to see company information
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Mode toggle tabs - below the top cards */}
      <div className="mb-8">
        <Tabs
          defaultValue="query"
          className="w-full"
          onValueChange={(value) => setMode(value as "query" | "chat")}
          value={mode}
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger
              value="query"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Search className="h-4 w-4" />
              <span>Query Mode</span>
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat Mode</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content area - changes based on selected mode */}
      {/* Query Mode */}
      {mode === "query" && (
        <div className="grid gap-8 md:grid-cols-[1fr_1.5fr]">
          {/* Left column - Query input with sticky positioning */}
          <div className="relative">
            <div className="sticky top-4 z-10">
              <Card className="mb-6 shadow-md">
                <CardHeader>
                  <CardTitle>Query Information</CardTitle>
                  <CardDescription>
                    {selectedTicker
                      ? `Ask about ${selectedTicker}'s financial data`
                      : "Select a ticker first to enable queries"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInfoQuery} className="flex gap-2">
                    <Input
                      placeholder={
                        selectedTicker
                          ? "E.g., current year revenue, profit margin"
                          : "Search for a ticker first..."
                      }
                      value={query || ""}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={!selectedTicker}
                    />
                    <Button type="submit" disabled={loading || !selectedTicker}>
                      {loading ? "Querying..." : "Query"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right column - Query results */}
          <div className="space-y-4">
            {selectedTicker && queryResults.length > 0 ? (
              queryResults.map((result) => (
                <Card key={result.id} className="border-2 border-primary/20">
                  <CardHeader /*className="bg-primary/5"*/>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span>{result.type}</span>
                    </CardTitle>
                    <CardDescription className="flex justify-between">
                      <span>
                        Data extracted from {selectedTicker}'s 10K and 10Q
                        filings
                      </span>
                      <span className="text-xs">
                        {formatTime(result.timestamp)}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Query: "{result.query}"
                      </p>

                      {result.currentYear && (
                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Current Year
                            </p>
                            <p className="font-medium">{result.currentYear}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Previous Year
                            </p>
                            <p className="font-medium">{result.previousYear}</p>
                          </div>
                        </div>
                      )}

                      {result.growth && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground">
                            Growth
                          </p>
                          <p
                            className={`font-medium ${
                              result.growth.startsWith("+")
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {result.growth}
                          </p>
                        </div>
                      )}

                      {result.count && (
                        <div>
                          <p className="text-sm text-muted-foreground">Count</p>
                          <p className="font-medium">{result.count}</p>
                        </div>
                      )}

                      {result.message && <p>{result.message}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] border rounded-lg p-8 bg-muted/50">
                <Search className="h-8 w-8 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground">
                  {selectedTicker
                    ? `No queries yet. Ask a question about ${selectedTicker}'s financial data.`
                    : "Select a ticker first, then ask questions about its financial data."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Mode - Full width with chat history */}
      {mode === "chat" && (
        <div className="w-full">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Chat with AI about Financial Data</CardTitle>
              <CardDescription>
                {selectedTicker
                  ? `Ask anything about ${selectedTicker}'s financial data`
                  : "Select a ticker first to enable chat"}
              </CardDescription>
            </CardHeader>

            {/* Chat messages area with fixed height */}
            <CardContent>
              <div className="h-[400px] overflow-y-auto border rounded-md p-4">
                {selectedTicker ? (
                  chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mb-2" />
                      <p>
                        No messages yet. Start chatting about {selectedTicker}!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`flex gap-3 max-w-[80%] ${
                              message.role === "user" ? "flex-row-reverse" : ""
                            }`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {message.role === "user" ? "U" : "AI"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div
                                className={`rounded-lg px-4 py-2 ${
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p>{message.content}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Invisible element for auto-scrolling */}
                      <div ref={messagesEndRef} />
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Search className="h-8 w-8 mb-2" />
                    <p>
                      Please select a ticker symbol first to start chatting.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fixed chat input at bottom of viewport when in chat mode */}
      {mode === "chat" && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-10">
          <div className="container mx-auto px-4 py-4">
            <form onSubmit={handleChatSubmit} className="flex w-full gap-2">
              <Input
                placeholder={
                  selectedTicker
                    ? `Ask about ${selectedTicker}...`
                    : "Search for a ticker first..."
                }
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={!selectedTicker}
                className="bg-background"
              />
              <Button type="submit" disabled={loading || !selectedTicker}>
                {loading ? "Sending..." : "Send"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
