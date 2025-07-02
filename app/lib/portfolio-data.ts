// app/lib/portfolio-data.ts

// Interfaces
export interface AssetPosition {
  id: number;
  ticker: string;
  companyName: string;
  assetClass: 'equity' | 'bond' | 'cryptocurrency' | 'cash';
  quantity: number;
  currentPrice: number;
  averageCost: number;
  baseCurrency: string;
}

export interface TradeRecord {
  id: number;
  tradeType: 'buy' | 'sell' | 'deposit' | 'add';
  ticker: string;
  quantity: number;
  executionPrice: number;
  tradeDate: string;
  tradeValue: number;
}

export interface AllocationData {
  category: string;
  percentage: number;
  marketValue: number;
  themeColor: string;
}

export interface ChartData {
  period: string;
  portfolio: number;
  sp500: number;
  nasdaq: number;
}

export interface MarketIndex {
    value: number;
    change: number;
    changePercent: number;
}

export interface MarketInfo {
    lastRefresh: string;
    status: 'OPEN' | 'CLOSED';
    marketIndices: {
        sp500: MarketIndex;
        nasdaq: MarketIndex;
        dow: MarketIndex;
    };
}

export interface SearchResult {
    ticker: string;
    name: string;
    type: string;
    exchange: string;
}

export interface SelectedAction {
    position: AssetPosition;
    actionType: string;
}

export interface EditingPosition extends AssetPosition {
    newQuantity: string;
    newPrice: string;
}

// Helper types for API responses
export interface YahooQuote {
    symbol: string;
    shortname?: string;
    longname?: string;
    typeDisp?: string;
    exchange: string;
}

export interface MockPrice {
    price: number;
    change: number;
    changePercent: number;
}


// Mock Data Loading Functions
export const loadPortfolioData = async (): Promise<{
  positions: AssetPosition[];
  tradeHistory: TradeRecord[];
  chartData: ChartData[];
}> => {
  await new Promise(resolve => setTimeout(resolve, 150));

  const positions: AssetPosition[] = [
    { id: 1, ticker: 'AAPL', companyName: 'Apple Inc.', assetClass: 'equity', quantity: 150, currentPrice: 185.20, averageCost: 180.00, baseCurrency: 'USD' },
    { id: 2, ticker: 'MSFT', companyName: 'Microsoft Corp.', assetClass: 'equity', quantity: 100, currentPrice: 378.85, averageCost: 365.00, baseCurrency: 'USD' },
    { id: 3, ticker: 'GOOGL', companyName: 'Alphabet Inc.', assetClass: 'equity', quantity: 50, currentPrice: 142.56, averageCost: 135.00, baseCurrency: 'USD' },
    { id: 4, ticker: 'TSLA', companyName: 'Tesla Inc.', assetClass: 'equity', quantity: 25, currentPrice: 248.50, averageCost: 220.00, baseCurrency: 'USD' },
    { id: 5, ticker: 'NVDA', companyName: 'NVIDIA Corp.', assetClass: 'equity', quantity: 75, currentPrice: 195.40, averageCost: 180.00, baseCurrency: 'USD' },
    { id: 6, ticker: 'TLT', companyName: 'iShares 20+ Year Bond ETF', assetClass: 'bond', quantity: 500, currentPrice: 95.40, averageCost: 98.00, baseCurrency: 'USD' },
    { id: 7, ticker: 'VGIT', companyName: 'Vanguard Intermediate Bond ETF', assetClass: 'bond', quantity: 800, currentPrice: 62.15, averageCost: 64.00, baseCurrency: 'USD' },
    { id: 8, ticker: 'HYG', companyName: 'iShares High Yield Bond ETF', assetClass: 'bond', quantity: 300, currentPrice: 78.90, averageCost: 80.50, baseCurrency: 'USD' },
    { id: 9, ticker: 'BTC', companyName: 'Bitcoin', assetClass: 'cryptocurrency', quantity: 0.5, currentPrice: 67500.00, averageCost: 55000.00, baseCurrency: 'USD' },
    { id: 10, ticker: 'ETH', companyName: 'Ethereum', assetClass: 'cryptocurrency', quantity: 4.2, currentPrice: 3850.00, averageCost: 3200.00, baseCurrency: 'USD' },
    { id: 11, ticker: 'USD-CASH', companyName: 'US Dollar Cash', assetClass: 'cash', quantity: 15000, currentPrice: 1.00, averageCost: 1.00, baseCurrency: 'USD' },
    { id: 12, ticker: 'EUR-CASH', companyName: 'Euro Cash', assetClass: 'cash', quantity: 8000, currentPrice: 1.09, averageCost: 1.09, baseCurrency: 'EUR' },
    { id: 13, ticker: 'PLN-CASH', companyName: 'Polish Zloty Cash', assetClass: 'cash', quantity: 20000, currentPrice: 0.25, averageCost: 0.25, baseCurrency: 'PLN' }
  ];

  const tradeHistory: TradeRecord[] = [
    { id: 1, tradeType: 'buy', ticker: 'AAPL', quantity: 150, executionPrice: 180.00, tradeDate: '2024-01-15', tradeValue: 27000 },
    { id: 2, tradeType: 'buy', ticker: 'MSFT', quantity: 100, executionPrice: 365.00, tradeDate: '2024-02-01', tradeValue: 36500 },
    { id: 3, tradeType: 'deposit', ticker: 'USD-CASH', quantity: 15000, executionPrice: 1.00, tradeDate: '2024-01-01', tradeValue: 15000 },
  ];

  const chartData: ChartData[] = [
    { period: 'Jan', portfolio: 100, sp500: 100, nasdaq: 100 },
    { period: 'Feb', portfolio: 105, sp500: 103, nasdaq: 106 },
    { period: 'Mar', portfolio: 98, sp500: 97, nasdaq: 95 },
    { period: 'Apr', portfolio: 112, sp500: 108, nasdaq: 115 },
    { period: 'May', portfolio: 118, sp500: 112, nasdaq: 120 },
    { period: 'Jun', portfolio: 125, sp500: 115, nasdaq: 125 }
  ];

  return {
    positions,
    tradeHistory,
    chartData
  };
};

export const fetchMarketInfo = async (): Promise<MarketInfo> => {
  await new Promise(resolve => setTimeout(resolve, 75));

  return {
    lastRefresh: new Date().toISOString(),
    status: 'OPEN' as const,
    marketIndices: {
      sp500: { value: 4567.89, change: 23.45, changePercent: 0.52 },
      nasdaq: { value: 14234.56, change: 67.89, changePercent: 0.48 },
      dow: { value: 34567.12, change: 123.45, changePercent: 0.36 }
    }
  };
};

export const fetchAssetPrice = async (symbol: string) => {
    try {
      const apiEndpoints = [
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`,
      ];

      const response = await fetch(apiEndpoints[0]);

      if (response.ok) {
        const data = await response.json();
        const chart = data.chart?.result?.[0];
        if (chart) {
          const metadata = chart.meta;
          const latestPrice = metadata.regularMarketPrice || metadata.previousClose;
          const prevClose = metadata.previousClose;
          const priceChange = latestPrice - prevClose;
          const percentChange = (priceChange / prevClose) * 100;

          return {
            symbol: symbol,
            price: latestPrice,
            change: priceChange,
            changePercent: percentChange,
            currency: metadata.currency || 'USD',
            name: metadata.longName || symbol,
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      console.log('Price API unavailable, using mock pricing', error);
    }

    const mockPricing: Record<string, MockPrice> = {
      'AAPL': { price: 185.20, change: 2.15, changePercent: 1.17 },
      'MSFT': { price: 378.85, change: -1.25, changePercent: -0.33 },
      'GOOGL': { price: 142.56, change: 0.85, changePercent: 0.60 },
      'AMZN': { price: 153.45, change: 3.22, changePercent: 2.14 },
      'TSLA': { price: 248.50, change: 5.20, changePercent: 2.13 },
      'NVDA': { price: 195.40, change: 8.75, changePercent: 4.69 },
      'META': { price: 325.60, change: -2.40, changePercent: -0.73 },
      'NFLX': { price: 485.75, change: 12.30, changePercent: 2.60 },
      'AMD': { price: 115.80, change: 4.55, changePercent: 4.09 },
      'INTC': { price: 35.20, change: -0.85, changePercent: -2.36 },
      'SPY': { price: 445.20, change: 1.80, changePercent: 0.41 },
      'QQQ': { price: 378.90, change: 2.15, changePercent: 0.57 },
      'VTI': { price: 240.85, change: 1.25, changePercent: 0.52 },
      'BTC-USD': { price: 67500.00, change: 1250.00, changePercent: 1.89 },
      'ETH-USD': { price: 3850.00, change: 125.50, changePercent: 3.37 }
    };

    const mockData = mockPricing[symbol] || {
      price: 100 + Math.random() * 200,
      change: Math.random() * 10 - 5,
      changePercent: Math.random() * 4 - 2
    };

    return {
      symbol: symbol,
      price: mockData.price,
      change: mockData.change,
      changePercent: mockData.changePercent,
      currency: 'USD',
      name: symbol,
      timestamp: new Date().toISOString()
    };
  };

export const searchAssets = async (searchTerm: string): Promise<SearchResult[]> => {
    if (!searchTerm || searchTerm.length < 2) return [];

    try {
      const apiEndpoints = [
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchTerm)}&quotesCount=10&newsCount=0`,
      ];

      const response = await fetch(apiEndpoints[0], {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.quotes?.slice(0, 5).map((quote: YahooQuote) => ({
          ticker: quote.symbol,
          name: quote.shortname || quote.longname,
          type: quote.typeDisp?.toLowerCase() || 'equity',
          exchange: quote.exchange
        })) || [];
      }
    } catch (error) {
      console.log('Yahoo Finance unavailable, using fallback', error);
    }

    const mockAssets: SearchResult[] = [
      { ticker: 'AAPL', name: 'Apple Inc.', type: 'equity', exchange: 'NASDAQ' },
      { ticker: 'MSFT', name: 'Microsoft Corporation', type: 'equity', exchange: 'NASDAQ' },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', type: 'equity', exchange: 'NASDAQ' },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', type: 'equity', exchange: 'NASDAQ' },
      { ticker: 'TSLA', name: 'Tesla Inc.', type: 'equity', exchange: 'NASDAQ' },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', type: 'equity', exchange: 'NASDAQ' },
      { ticker: 'META', name: 'Meta Platforms Inc.', type: 'equity', exchange: 'NASDAQ' },
      { ticker: 'NFLX', name: 'Netflix Inc.', type: 'equity', exchange: 'NASDAQ' },
      { ticker: 'AMD', name: 'Advanced Micro Devices', type: 'equity', exchange: 'NASDAQ' },
      { ticker: 'INTC', name: 'Intel Corporation', type: 'equity', exchange: 'NASDAQ' },
      { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'etf', exchange: 'NYSE' },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf', exchange: 'NASDAQ' },
      { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'etf', exchange: 'NYSE' },
      { ticker: 'BTC-USD', name: 'Bitcoin USD', type: 'cryptocurrency', exchange: 'CCC' },
      { ticker: 'ETH-USD', name: 'Ethereum USD', type: 'cryptocurrency', exchange: 'CCC' }
    ];

    return mockAssets.filter(asset =>
      asset.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  };