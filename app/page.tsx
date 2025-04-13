"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Search, Check } from "lucide-react";
import { GoogleGenAI, Type } from "@google/genai";

import axios from "axios";
const finnhub = require("finnhub");

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
import {
  tickerToCIK,
  ChatMessage,
  Company,
  getMostRecent10KFormTextFromTicker,
  getMostRecent10KURLFromMetadataFromSEC,
  getCIKFormMetadataFromSEC,
  getMetadataObjectFromURL,
  removeStyling,
  cleanSECDocument,
  extractFinancialDataFrom10K,
  extractFinancialDataFrom10KwithTables,
} from "@/lib/resources";

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

export default function FinancialSearch() {
  const [ticker, setTicker] = useState("");
  const [selectedTicker, setSelectedTicker] = useState("");
  const [query, setQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
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
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [tenKText, setTenKText] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_KEY;
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Ref for auto-scrolling chat
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ref for scrolling dropdown
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const fetch10KText = async () => {
      if (selectedTicker) {
        try {
          const text = await getMostRecent10KFormTextFromTicker(selectedTicker);
          const cleanedText = extractFinancialDataFrom10KwithTables(text);
          setTenKText(cleanedText);
          console.log("10-K Text", cleanedText);
        } catch (error) {
          console.error("Error fetching 10-K text:", error);
          setTenKText(null);
        }
      }
    };

    fetch10KText();
  }, [selectedTicker]);

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
    setTicker(ticker.toUpperCase());
    setLoading(false);

    setSelectedTicker(ticker.toUpperCase());
    // handleTickerRequest();
  };

  useEffect(() => {
    if (!selectedTicker) return;

    const fetchTickerData = async () => {
      try {
        // Fetch data from the /quote endpoint
        const quoteResponse = await axios.get(
          "https://finnhub.io/api/v1/quote",
          {
            params: {
              symbol: selectedTicker, // Use the updated selectedTicker
              token: FINNHUB_KEY, // Use your API key
            },
          }
        );

        const quoteData = quoteResponse.data;

        // Fetch data from the /company-profile2 endpoint
        const profileResponse = await axios.get(
          "https://finnhub.io/api/v1/stock/profile2",
          {
            params: {
              symbol: selectedTicker, // Use the updated selectedTicker
              token: FINNHUB_KEY, // Use your API key
            },
          }
        );

        const profileData = profileResponse.data;

        if (quoteData && profileData) {
          setTickerData({
            symbol: selectedTicker,
            companyName: profileData.name || "N/A",
            exchange: profileData.exchange || "N/A",
            industry: profileData.finnhubIndustry || "N/A",
            marketCap: profileData.marketCapitalization
              ? `$${profileData.marketCapitalization.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "N/A",
            todayChange: `${quoteData.d > 0 ? "+" : ""}$${quoteData.d.toFixed(
              2
            )} (${quoteData.dp.toFixed(2)}%)`,
            lastTradingDay: profileData.ipo || "N/A",
            price: `$${quoteData.c.toFixed(2)}`, // Current price
            country: profileData.country || "N/A", // Country
            currency: profileData.currency || "N/A", // Currency
            phone: profileData.phone || "N/A", // Phone number
            website: profileData.weburl || "N/A", // Website URL
            logo: profileData.logo || "", // Company logo
          });
        } else {
          console.error("No data returned from Finnhub API");
          setTickerData(null);
        }
      } catch (error) {
        console.error("Error fetching ticker data:", error);
        setTickerData(null);
      }
    };

    fetchTickerData();
  }, [selectedTicker]);

  const handleInfoQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !query) return;

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
        message: `AI-generated insights about "${query}" for ${ticker} based on recent financial filings`,
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

    try {
      // Initialize Gemini AI
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      // Generate AI response with the 10-K included in the system prompt
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `You are an AI assistant with access to ${selectedTicker}'s most recent 10-K filing. Keep the responses brief as this is a chat, at the end of each response try to ask a 1-3 leading questions to possibly guide the user into asking for help or defining terms. Use said 10-K data to answer questions: "${
          tenKText ||
          "There is no 10-K data available in this instance, do your best."
        }". Now, answer the user's question: "${chatInput}"`,
      });

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.text || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error generating AI response:", error);
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm sorry, there was an error generating a response. Please try again later.",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
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
  const handleSelectCompany = async (option: Company) => {
    setSelectedCompanyName(option.name);
    setTicker(option.symbol);
    setSearchInput(option.symbol); // Update the search input to show the ticker
    setShowDropdown(false);
    setSelectedTicker(option.symbol.toUpperCase());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || tickerOptions.length === 0) return;

    if (e.key === "ArrowDown") {
      // Highlight the first option if none is highlighted
      setHighlightedIndex((prev) => {
        const nextIndex =
          prev === -1 ? 0 : Math.min(prev + 1, tickerOptions.length - 1);
        optionRefs.current[nextIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        return nextIndex;
      });
    } else if (e.key === "ArrowUp") {
      // Prevent the highlight from going below 0
      setHighlightedIndex((prev) => {
        const nextIndex = Math.max(prev - 1, 0);
        optionRefs.current[nextIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        return nextIndex;
      });
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      // Select the highlighted option
      handleSelectCompany(tickerOptions[highlightedIndex]);
      setHighlightedIndex(-1); // Reset the highlighted index
    } else if (e.key === "Escape") {
      // Close the dropdown
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
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
                  className="cursor-pointer"
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
                  <Button
                    type="submit"
                    disabled={loading || !ticker}
                    className="cursor-pointer"
                  >
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
                      setHighlightedIndex(-1);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={handleKeyDown}
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
                            {tickerOptions.map((option, index) => (
                              <button
                                key={`${option.symbol}-${option.name}`}
                                ref={(el) => {
                                  optionRefs.current[index] = el;
                                }}
                                className={`flex w-full justify-start text-left ${
                                  highlightedIndex === index ? "bg-muted" : ""
                                }`}
                                onClick={() => handleSelectCompany(option)}
                                onMouseEnter={() => setHighlightedIndex(index)}
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
                              </button>
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
        <Card className="h-auto flex flex-col">
          {tickerData ? (
            <>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl font-bold">{selectedTicker}</span>
                    <span className="text-lg font-normal text-muted-foreground">
                      {tickerData.companyName}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {tickerData.exchange} • {tickerData.industry}
                  </CardDescription>
                </div>
                {/* Logo */}
                {tickerData.logo && (
                  <img
                    src={tickerData.logo}
                    alt={`${tickerData.companyName} Logo`}
                    className="h-12 w-auto"
                  />
                )}
              </CardHeader>
              <CardContent className="flex-grow flex flex-col items-start">
                <div className="grid grid-cols-2 gap-4 w-full">
                  {/* Current Price */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Current Price
                    </p>
                    <p className="text-lg font-medium">{tickerData.price}</p>
                  </div>

                  {/* Change */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Change</p>
                    <p
                      className={`text-lg font-medium ${
                        tickerData.todayChange.startsWith("$-")
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {tickerData.todayChange}
                    </p>
                  </div>

                  {/* Market Cap */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Market Cap (Millions)
                    </p>
                    <p className="text-lg font-medium">
                      {tickerData.marketCap}
                    </p>
                  </div>

                  {/* IPO Date */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">IPO Date</p>
                    <p className="text-lg font-medium">
                      {tickerData.lastTradingDay}
                    </p>
                  </div>

                  {/* Country */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="text-lg font-medium">{tickerData.country}</p>
                  </div>

                  {/* Currency */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Currency</p>
                    <p className="text-lg font-medium">{tickerData.currency}</p>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-lg font-medium">{`+${tickerData.phone}`}</p>
                  </div>

                  {/* Website */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Website</p>
                    {tickerData.website !== "N/A" ? (
                      <a
                        href={tickerData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        {tickerData.website}
                      </a>
                    ) : (
                      <p className="text-lg font-medium">
                        {tickerData.website}
                      </p>
                    )}
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
                    <Button
                      type="submit"
                      disabled={loading || !selectedTicker}
                      className="cursor-pointer"
                    >
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
