// app/page.tsx
"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { AiOutlinePlus } from 'react-icons/ai';
import { BiTrendingUp, BiTrendingDown } from 'react-icons/bi';
import { FaDollarSign, FaChartBar, FaWallet } from 'react-icons/fa';
import { FiRefreshCw, FiEdit3, FiTrash2, FiActivity, FiSave, FiX, FiShoppingCart, FiPlusCircle, FiSearch } from 'react-icons/fi';
import {
  AssetPosition,
  TradeRecord,
  AllocationData,
  ChartData,
  MarketInfo,
  SearchResult,
  SelectedAction,
  EditingPosition,
  YahooQuote,
  MockPrice,
  loadPortfolioData,
  fetchMarketInfo,
    fetchAssetPrice,
    searchAssets
} from './lib/portfolio-data';


// Fallback Data
const fallbackData = {
  positions: [
    { id: 1, ticker: 'AAPL', companyName: 'Apple Inc.', assetClass: 'equity' as const, quantity: 150, currentPrice: 185.20, averageCost: 180.00, baseCurrency: 'USD' },
    { id: 2, ticker: 'MSFT', companyName: 'Microsoft Corp.', assetClass: 'equity' as const, quantity: 100, currentPrice: 378.85, averageCost: 365.00, baseCurrency: 'USD' },
    { id: 3, ticker: 'USD-CASH', companyName: 'US Dollar Cash', assetClass: 'cash' as const, quantity: 15000, currentPrice: 1.00, averageCost: 1.00, baseCurrency: 'USD' },
  ],
  tradeHistory: [
    { id: 1, tradeType: 'buy' as const, ticker: 'AAPL', quantity: 150, executionPrice: 180.00, tradeDate: '2024-01-15', tradeValue: 27000 },
  ],
  chartData: [
    { period: 'Jan', portfolio: 100, sp500: 100, nasdaq: 100 },
    { period: 'Feb', portfolio: 105, sp500: 103, nasdaq: 106 },
    { period: 'Mar', portfolio: 98, sp500: 97, nasdaq: 95 },
    { period: 'Apr', portfolio: 112, sp500: 108, nasdaq: 115 },
    { period: 'May', portfolio: 118, sp500: 112, nasdaq: 120 },
    { period: 'Jun', portfolio: 125, sp500: 115, nasdaq: 125 }
  ]
};

const fallbackMarketInfo: MarketInfo = {
  lastRefresh: new Date().toISOString(),
  status: 'OPEN' as const,
  marketIndices: {
    sp500: { value: 4567.89, change: 23.45, changePercent: 0.52 },
    nasdaq: { value: 14234.56, change: 67.89, changePercent: 0.48 },
    dow: { value: 34567.12, change: 123.45, changePercent: 0.36 }
  }
};

// Component
export default function InvestmentPortfolioManager({
  initialPositions,
  initialTrades,
  performanceMetrics,
  marketInfo,
  preloaded = false
}: {
  initialPositions?: AssetPosition[];
  initialTrades?: TradeRecord[];
  performanceMetrics?: ChartData[];
  marketInfo?: MarketInfo;
  preloaded?: boolean;
} = {}) {
  const [portfolioPositions, setPortfolioPositions] = useState<AssetPosition[]>(
    initialPositions || fallbackData.positions
  );
  const [transactionLog, setTransactionLog] = useState<TradeRecord[]>(
    initialTrades || fallbackData.tradeHistory
  );
  const [performanceChartData] = useState<ChartData[]>(
    performanceMetrics || fallbackData.chartData
  );
  const [currentMarketInfo, setCurrentMarketInfo] = useState<MarketInfo>(
    marketInfo || fallbackMarketInfo
  );

  const [selectedTab, setSelectedTab] = useState(0);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showNewAssetModal, setShowNewAssetModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<SelectedAction | null>(null);
  const [detailViewActive, setDetailViewActive] = useState<string | null>(null);
  const [editingPosition, setEditingPosition] = useState<EditingPosition | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchInProgress, setSearchInProgress] = useState(false);
  const [chosenAsset, setChosenAsset] = useState<SearchResult | null>(null);
  const [priceUpdateInProgress, setPriceUpdateInProgress] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toISOString());
  const [initialLoading, setInitialLoading] = useState(!initialPositions && !preloaded);

  // Touch gesture states
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [swipeStartPos, setSwipeStartPos] = useState(0);

  const [tradeFormData, setTradeFormData] = useState({
    action: 'buy',
    ticker: '',
    quantity: '',
    price: '',
    validationError: ''
  });

  const [depositFormData, setDepositFormData] = useState({
    currency: 'USD',
    amount: '',
    validationError: ''
  });

  const [newAssetFormData, setNewAssetFormData] = useState({
    ticker: '',
    name: '',
    type: 'equity',
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    validationError: ''
  });

  const [gestureStart, setGestureStart] = useState<number | null>(null);
  const [gestureEnd, setGestureEnd] = useState<number | null>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const searchDelayRef = useRef<NodeJS.Timeout | null>(null);

  const navigationTabs = ['Dashboard', 'Allocation', 'Assets', 'History'];

  const currencyRates: Record<string, number> = {
    USD: 1.00,
    EUR: 1.09,
    PLN: 0.25,
    RUB: 0.011
  };

  // Disable browser pull-to-refresh
  useEffect(() => {
    const disableRefresh = (e: TouchEvent) => {
      if (e.touches.length > 1) return;

      const touch = e.touches[0];
      const target = e.target as Element;

      if (window.scrollY === 0 &&
          touch.clientY > swipeStartPos &&
          !target.closest('input, textarea, select')) {
        e.preventDefault();
      }
    };

    const preventBrowserRefresh = (e: TouchEvent) => {
      if (window.scrollY === 0 && e.touches[0].clientY > swipeStartPos) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', disableRefresh, { passive: false });
    document.addEventListener('touchmove', preventBrowserRefresh, { passive: false });

    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.removeEventListener('touchstart', disableRefresh);
      document.removeEventListener('touchmove', preventBrowserRefresh);
      document.body.style.overscrollBehavior = 'auto';
    };
  }, [swipeStartPos]);

  // Touch gesture handlers
  const handleGestureStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setSwipeStartPos(e.touches[0].clientY);
      setIsSwipeActive(true);
    }

    setGestureEnd(null);
    setGestureStart(e.targetTouches[0].clientX);
  };

  const handleGestureMove = (e: React.TouchEvent) => {
    if (isSwipeActive && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - swipeStartPos);

      if (distance > 0) {
        setSwipeDistance(Math.min(distance * 0.5, 80));
        e.preventDefault();
      }
    }

    setGestureEnd(e.targetTouches[0].clientX);
  };

  const handleGestureEnd = async () => {
    if (isSwipeActive) {
      if (swipeDistance > 50) {
        await refreshPortfolioData();
      }

      setIsSwipeActive(false);
      setSwipeDistance(0);
      setSwipeStartPos(0);
    }

    if (!gestureStart || !gestureEnd) return;
    const distance = gestureStart - gestureEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && selectedTab < navigationTabs.length - 1) {
      setSelectedTab(selectedTab + 1);
    }
    if (isRightSwipe && selectedTab > 0) {
      setSelectedTab(selectedTab - 1);
    }
  };

  useEffect(() => {
    if (!initialPositions && !preloaded) {
      const initializeData = async () => {
        setInitialLoading(true);
        try {
          await new Promise(resolve => setTimeout(resolve, 600));
          setLastSyncTime(new Date().toISOString());
        } catch (error) {
          console.error('Data initialization failed:', error);
        } finally {
          setInitialLoading(false);
        }
      };

      initializeData();
    }
  }, [initialPositions, preloaded]);

  useEffect(() => {
    if (preloaded && initialPositions) {
      console.log('Portfolio data was pre-rendered at:', lastSyncTime);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('investment-preload', 'true');
      }
    }
  }, [preloaded, initialPositions, lastSyncTime]);

  useEffect(() => {
    const syncMarketData = async () => {
      try {
        const updatedInfo = await fetchMarketInfo();
        setCurrentMarketInfo(updatedInfo);
        setLastSyncTime(new Date().toISOString());
      } catch (error) {
        console.error('Market data sync failed:', error);
      }
    };

    const interval = setInterval(syncMarketData, 35000);
    return () => clearInterval(interval);
  }, []);

  const performAssetSearch = useCallback(async (searchTerm: string) => {
    if (searchDelayRef.current) {
      clearTimeout(searchDelayRef.current);
    }

    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchInProgress(true);

    searchDelayRef.current = setTimeout(async () => {
      try {
        const results = await searchAssets(searchTerm);
        setSearchResults(results);
      } catch (error) {
        console.error('Asset search failed:', error);
        setSearchResults([]);
      } finally {
        setSearchInProgress(false);
      }
    }, 350);
  }, []);

  const retrieveAssetPrice = useCallback(async (symbol: string) => {
    if (!symbol) return null;

    setPriceUpdateInProgress(true);
    try {
      const priceInfo = await fetchAssetPrice(symbol);
      return priceInfo;
    } catch (error) {
      console.error('Price retrieval failed:', error);
      return null;
    } finally {
      setPriceUpdateInProgress(false);
    }
  }, []);

  const selectAsset = async (asset: SearchResult) => {
    setChosenAsset(asset);
    setSearchResults([]);

    if (showTradeModal) {
      setTradeFormData(prev => ({
        ...prev,
        ticker: asset.ticker,
        validationError: ''
      }));
    } else if (showNewAssetModal) {
      setNewAssetFormData(prev => ({
        ...prev,
        ticker: asset.ticker,
        name: asset.name,
        type: asset.type === 'etf' ? 'equity' : asset.type,
        validationError: ''
      }));
    }

    const priceInfo = await retrieveAssetPrice(asset.ticker);
    if (priceInfo) {
      if (showTradeModal) {
        setTradeFormData(prev => ({
          ...prev,
          price: priceInfo.price.toString()
        }));
      } else if (showNewAssetModal) {
        setNewAssetFormData(prev => ({
          ...prev,
          price: priceInfo.price.toString()
        }));
      }
    }
  };

  const convertCurrency = (amount: number, currency: string) => {
    return amount * (currencyRates[currency as keyof typeof currencyRates] || 1);
  };

  const calculateMetrics = () => {
    const portfolioValue = portfolioPositions.reduce((sum, position) => {
      const valueInUSD = convertCurrency(position.quantity * position.currentPrice, position.baseCurrency);
      return sum + valueInUSD;
    }, 0);

    const portfolioCost = portfolioPositions.reduce((sum, position) => {
      const costInUSD = convertCurrency(position.quantity * position.averageCost, position.baseCurrency);
      return sum + costInUSD;
    }, 0);

    const unrealizedGain = portfolioValue - portfolioCost;
    const unrealizedGainPercent = portfolioCost === 0 ? 0 : (unrealizedGain / portfolioCost) * 100;

    const assetAllocation: Record<string, { value: number; count: number }> = portfolioPositions.reduce((acc, position) => {
      const valueInUSD = convertCurrency(position.quantity * position.currentPrice, position.baseCurrency);
      if (!acc[position.assetClass]) {
        acc[position.assetClass] = { value: 0, count: 0 };
      }
      acc[position.assetClass].value += valueInUSD;
      acc[position.assetClass].count += 1;
      return acc;
    }, {} as Record<string, { value: number; count: number }>);

    const allocationData: AllocationData[] = Object.entries(assetAllocation).map(([assetType, data]) => {
      const typeLabels: Record<string, string> = {
        equity: 'Equities',
        bond: 'Bonds',
        cryptocurrency: 'Cryptocurrency',
        cash: 'Cash'
      };
      const typeColors: Record<string, string> = {
        equity: '#3B82F6',
        bond: '#10B981',
        cryptocurrency: '#F59E0B',
        cash: '#6B7280'
      };

      return {
        category: typeLabels[assetType] || assetType,
        percentage: portfolioValue === 0 ? 0 : (data.value / portfolioValue) * 100,
        marketValue: data.value,
        themeColor: typeColors[assetType] || '#6B7280'
      };
    });

    return { portfolioValue, unrealizedGain, unrealizedGainPercent, allocationData };
  };

  const { portfolioValue, unrealizedGain, unrealizedGainPercent, allocationData } = calculateMetrics();

  const LoadingScreen = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <FiRefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading Portfolio</h1>
        <p className="text-gray-600">Synchronizing investment data...</p>
      </div>
    </div>
  );

  const refreshPortfolioData = useCallback(async () => {
    setIsDataRefreshing(true);

    try {
      const priceUpdates = await Promise.all(
        portfolioPositions
          .filter(position => position.assetClass !== 'cash')
          .map(async (position) => {
            const priceInfo = await fetchAssetPrice(position.ticker);
            return {
              id: position.id,
              updatedPrice: priceInfo?.price || position.currentPrice
            };
          })
      );

      setPortfolioPositions(prev => prev.map(position => {
        if (position.assetClass === 'cash') return position;

        const update = priceUpdates.find(u => u.id === position.id);
        return update ? { ...position, currentPrice: update.updatedPrice } : position;
      }));

      const updatedMarketInfo = await fetchMarketInfo();
      setCurrentMarketInfo(updatedMarketInfo);
      setLastSyncTime(new Date().toISOString());

    } catch (error) {
      console.error('Portfolio refresh failed:', error);
    } finally {
      setIsDataRefreshing(false);
    }
  }, [portfolioPositions]);

  const openDetailView = (chartType: string) => {
    setDetailViewActive(chartType);
  };

  const closeDetailView = () => {
    setDetailViewActive(null);
  };

  const calculateLiquidity = () => {
    const cashPositions = portfolioPositions.filter(p => p.assetClass === 'cash');
    const totalLiquidityUSD = cashPositions.reduce((sum, cash) => {
      return sum + convertCurrency(cash.quantity, cash.baseCurrency);
    }, 0);
    return { totalLiquidityUSD, cashPositions };
  };

  const { totalLiquidityUSD, cashPositions } = calculateLiquidity();

  const validateFunds = (quantity: number, price: number) => {
    const totalCost = quantity * price;
    return totalLiquidityUSD >= totalCost;
  };

  const processDeposit = () => {
    const { currency, amount } = depositFormData;

    if (!amount || parseFloat(amount) <= 0) {
      setDepositFormData(prev => ({ ...prev, validationError: 'Please enter a valid amount' }));
      return;
    }

    const depositAmount = parseFloat(amount);
    const cashTicker = `${currency}-CASH`;

    const existingCashIdx = portfolioPositions.findIndex(p => p.ticker === cashTicker);

    if (existingCashIdx >= 0) {
      setPortfolioPositions(prev => prev.map((position, index) =>
        index === existingCashIdx
          ? { ...position, quantity: position.quantity + depositAmount }
          : position
      ));
    } else {
      const newCashPosition: AssetPosition = {
        id: Date.now(),
        ticker: cashTicker,
        companyName: `${currency} Cash`,
        assetClass: 'cash',
        quantity: depositAmount,
        currentPrice: currencyRates[currency as keyof typeof currencyRates],
        averageCost: currencyRates[currency as keyof typeof currencyRates],
        baseCurrency: currency
      };
      setPortfolioPositions(prev => [...prev, newCashPosition]);
    }

    const newDeposit: TradeRecord = {
      id: Date.now(),
      tradeType: 'deposit',
      ticker: cashTicker,
      quantity: depositAmount,
      executionPrice: currencyRates[currency as keyof typeof currencyRates],
      tradeDate: new Date().toISOString().split('T')[0],
      tradeValue: depositAmount * currencyRates[currency as keyof typeof currencyRates]
    };

    setTransactionLog(prev => [newDeposit, ...prev]);
    setDepositFormData({ currency: 'USD', amount: '', validationError: '' });
    setShowDepositModal(false);
  };

  const processNewAsset = () => {
    const { ticker, name, type, quantity, price, date, currency } = newAssetFormData;

    if (!ticker || !name || !quantity || !price) {
      setNewAssetFormData(prev => ({ ...prev, validationError: 'All fields are required' }));
      return;
    }

    const shareCount = parseFloat(quantity);
    const priceValue = parseFloat(price);

    if (shareCount <= 0 || priceValue <= 0) {
      setNewAssetFormData(prev => ({ ...prev, validationError: 'Quantity and price must be positive' }));
      return;
    }

    const newPosition: AssetPosition = {
      id: Date.now(),
      ticker: ticker.toUpperCase(),
      companyName: name,
      assetClass: type as 'equity' | 'bond' | 'cryptocurrency' | 'cash',
      quantity: shareCount,
      currentPrice: priceValue,
      averageCost: priceValue,
      baseCurrency: currency
    };

    setPortfolioPositions(prev => [...prev, newPosition]);

    const newRecord: TradeRecord = {
      id: Date.now(),
      tradeType: 'add',
      ticker: ticker.toUpperCase(),
      quantity: shareCount,
      executionPrice: priceValue,
      tradeDate: date,
      tradeValue: shareCount * priceValue
    };

    setTransactionLog(prev => [newRecord, ...prev]);
    setNewAssetFormData({
      ticker: '',
      name: '',
      type: 'equity',
      quantity: '',
      price: '',
      date: new Date().toISOString().split('T')[0],
      currency: 'USD',
      validationError: ''
    });
    setChosenAsset(null);
    setShowNewAssetModal(false);
  };

  const handlePositionAction = (position: AssetPosition, actionType: string) => {
    setSelectedAction({ position, actionType });
    setTradeFormData({
      action: actionType,
      ticker: position.ticker,
      quantity: '',
      price: position.currentPrice.toString(),
      validationError: ''
    });
    setShowTradeModal(true);
  };

  const executeTrade = () => {
    const { action, ticker, quantity, price } = tradeFormData;

    if (!ticker || !quantity || !price) {
      setTradeFormData(prev => ({ ...prev, validationError: 'All fields are required' }));
      return;
    }

    const shareCount = parseFloat(quantity);
    const priceValue = parseFloat(price);

    if (shareCount <= 0 || priceValue <= 0) {
      setTradeFormData(prev => ({ ...prev, validationError: 'Quantity and price must be positive' }));
      return;
    }

    if (action === 'buy') {
      if (!validateFunds(shareCount, priceValue)) {
        setTradeFormData(prev => ({
          ...prev,
          validationError: `Insufficient funds. Available: $${totalLiquidityUSD.toLocaleString()}, Required: $${(shareCount * priceValue).toLocaleString()}`
        }));
        return;
      }
    }

    if (action === 'sell') {
      const existingPosition = portfolioPositions.find(p => p.ticker.toLowerCase() === ticker.toLowerCase());
      if (!existingPosition) {
        setTradeFormData(prev => ({ ...prev, validationError: 'You do not own this asset' }));
        return;
      }
      if (existingPosition.quantity < shareCount) {
        setTradeFormData(prev => ({ ...prev, validationError: `You only own ${existingPosition.quantity} shares` }));
        return;
      }
    }

    const newTrade: TradeRecord = {
      id: Date.now(),
      tradeType: action as 'buy' | 'sell',
      ticker: ticker.toUpperCase(),
      quantity: shareCount,
      executionPrice: priceValue,
      tradeDate: new Date().toISOString().split('T')[0],
      tradeValue: shareCount * priceValue
    };

    setTransactionLog(prev => [newTrade, ...prev]);

    setPortfolioPositions(prev => {
      const existingIdx = prev.findIndex(p => p.ticker.toLowerCase() === ticker.toLowerCase());
      let updatedPositions = [...prev];

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const newQuantity = action === 'buy'
          ? existing.quantity + shareCount
          : existing.quantity - shareCount;

        if (newQuantity <= 0) {
          updatedPositions = prev.filter((_, index) => index !== existingIdx);
        } else {
          const newAvgCost = action === 'buy'
            ? ((existing.quantity * existing.averageCost) + (shareCount * priceValue)) / newQuantity
            : existing.averageCost;

          updatedPositions = prev.map((position, index) =>
            index === existingIdx
              ? { ...position, quantity: newQuantity, averageCost: newAvgCost, currentPrice: priceValue }
              : position
          );
        }
      } else if (action === 'buy') {
        const newPosition: AssetPosition = {
          id: Date.now(),
          ticker: ticker.toUpperCase(),
          companyName: chosenAsset?.name || `${ticker.toUpperCase()} Holdings`,
          assetClass: (chosenAsset?.type || 'equity') as 'equity' | 'bond' | 'cryptocurrency' | 'cash',
          quantity: shareCount,
          currentPrice: priceValue,
          averageCost: priceValue,
          baseCurrency: 'USD'
        };
        updatedPositions = [...prev, newPosition];
      }

      // Handle cash flow
      if (action === 'buy') {
        const transactionCost = shareCount * priceValue;
        const usdCashIdx = updatedPositions.findIndex(p => p.ticker === 'USD-CASH');

        if (usdCashIdx >= 0) {
          updatedPositions[usdCashIdx] = {
            ...updatedPositions[usdCashIdx],
            quantity: updatedPositions[usdCashIdx].quantity - transactionCost
          };
        }
      } else if (action === 'sell') {
        const saleProceeds = shareCount * priceValue;
        const usdCashIdx = updatedPositions.findIndex(p => p.ticker === 'USD-CASH');

        if (usdCashIdx >= 0) {
          updatedPositions[usdCashIdx] = {
            ...updatedPositions[usdCashIdx],
            quantity: updatedPositions[usdCashIdx].quantity + saleProceeds
          };
        } else {
          updatedPositions.push({
            id: Date.now() + 1,
            ticker: 'USD-CASH',
            companyName: 'US Dollar Cash',
            assetClass: 'cash',
            quantity: saleProceeds,
            currentPrice: 1.00,
            averageCost: 1.00,
            baseCurrency: 'USD'
          });
        }
      }

      return updatedPositions;
    });

    setTradeFormData({ action: 'buy', ticker: '', quantity: '', price: '', validationError: '' });
    setSelectedAction(null);
    setChosenAsset(null);
    setSearchResults([]);
    setShowTradeModal(false);
  };

  const validateSellQuantity = (quantity: string, ticker: string) => {
    if (!quantity || !ticker) return '';

    const shareCount = parseFloat(quantity);
    if (isNaN(shareCount) || shareCount <= 0) return '';

    const existingPosition = portfolioPositions.find(p => p.ticker.toLowerCase() === ticker.toLowerCase());
    if (!existingPosition) return 'You do not own this asset';

    if (existingPosition.quantity < shareCount) {
      return `You only own ${existingPosition.quantity} shares (trying to sell ${shareCount})`;
    }

    if (existingPosition.quantity === shareCount) {
      return 'This will sell all your shares in this asset';
    }

    return `You will have ${(existingPosition.quantity - shareCount).toFixed(2)} shares remaining`;
  };

  const beginPositionEdit = (position: AssetPosition) => {
    setEditingPosition({
      ...position,
      newQuantity: position.quantity.toString(),
      newPrice: position.currentPrice.toString()
    });
  };

  const savePositionEdit = () => {
      if (!editingPosition) return;

    const { id, newQuantity, newPrice } = editingPosition;
    const quantity = parseFloat(newQuantity);
    const price = parseFloat(newPrice);

    if (quantity <= 0 || price <= 0) return;

    setPortfolioPositions(prev => prev.map(position =>
      position.id === id
        ? { ...position, quantity, currentPrice: price }
        : position
    ));

    setEditingPosition(null);
  };

  const removePosition = (id: number) => {
    setPortfolioPositions(prev => prev.filter(position => position.id !== id));
  };

  const MetricCard = ({ icon: Icon, title, value, change, changePercent }: {
    icon: React.ElementType;
    title: string;
    value: string;
    change: number;
    changePercent: number;
  }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-blue-600" />
        <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
        </span>
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );

  const AssetSearchField = ({ value, onChange, placeholder, onSelect }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    onSelect: (asset: SearchResult) => void;
  }) => (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            performAssetSearch(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full p-4 pl-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        {searchInProgress && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <FiRefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      {searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((asset, index) => (
            <button
              key={index}
              onClick={() => onSelect(asset)}
              className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{asset.ticker}</div>
                  <div className="text-sm text-gray-600 truncate">{asset.name}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs px-2 py-1 rounded ${
                    asset.type === 'equity' ? 'bg-blue-100 text-blue-700' :
                    asset.type === 'etf' ? 'bg-green-100 text-green-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {asset.type?.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{asset.exchange}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {preloaded && initialPositions && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-700 text-sm flex items-center">
            <FiActivity className="w-4 h-4 mr-2" />
            Portfolio pre-loaded • Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600">Market Status</h3>
            <p className={`text-lg font-bold ${
              currentMarketInfo.status === 'OPEN' ? 'text-green-600' : 'text-red-600'
            }`}>
              {currentMarketInfo.status}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">S&P 500</p>
            <p className="text-lg font-bold text-gray-900">
              {currentMarketInfo.marketIndices.sp500.value.toLocaleString()}
            </p>
            <p className={`text-sm font-medium ${
              currentMarketInfo.marketIndices.sp500.change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {currentMarketInfo.marketIndices.sp500.change >= 0 ? '+' : ''}
              {currentMarketInfo.marketIndices.sp500.change.toFixed(2)} ({currentMarketInfo.marketIndices.sp500.changePercent.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>

      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-gray-900">${portfolioValue.toLocaleString()}</h1>
        <p className="text-gray-600">Total Portfolio Value</p>
        <div className="flex items-center justify-center mt-2">
          <BiTrendingUp className={`w-4 h-4 mr-1 ${unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          <span className={`font-medium ${unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {unrealizedGain >= 0 ? '+' : ''}${unrealizedGain.toLocaleString()} ({unrealizedGainPercent.toFixed(2)}%)
          </span>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm text-gray-600">Available Cash</p>
              <p className="text-xl font-bold text-gray-900">${totalLiquidityUSD.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Currencies</p>
              <div className="flex flex-wrap gap-1 justify-end">
                {cashPositions.map((cash, index) => (
                  <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {cash.baseCurrency}: {cash.quantity.toLocaleString()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          icon={FaDollarSign}
          title="Daily P&L"
          value="$2,845"
          change={2845}
          changePercent={0.57}
        />
        <MetricCard
          icon={FiActivity}
          title="Total Return"
          value={`${unrealizedGain.toLocaleString()}`}
          change={unrealizedGain}
          changePercent={unrealizedGainPercent}
        />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
        <div
          className="h-64"
          onDoubleClick={() => openDetailView('pie')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="percentage"
                animationBegin={0}
                animationDuration={800}
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.themeColor} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const assetType = allocationData.find(item => item.category === name);
                  const holdingsCount = portfolioPositions.filter(p => {
                    const typeMapping: Record<string, string> = { equity: 'Equities', bond: 'Bonds', cryptocurrency: 'Cryptocurrency', cash: 'Cash' };
                    return typeMapping[p.assetClass] === name;
                  }).length;

                  return [
                    <div key="tooltip" className="text-left">
                      <div className="font-semibold">{name}</div>
                      <div>${assetType?.marketValue.toLocaleString()}</div>
                      <div>{(value as number).toFixed(1)}% of portfolio</div>
                      <div className="text-sm text-gray-600">{holdingsCount} {holdingsCount === 1 ? 'asset' : 'assets'}</div>
                    </div>,
                      name
                  ];
                }}
                labelFormatter={() => ''}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {allocationData.map((item, index) => (
            <div key={index} className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: item.themeColor }}
              />
              <span className="text-sm text-gray-600">{item.category}</span>
              <span className="text-sm font-medium ml-auto">{item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Performance vs Indices</h3>
        <div
          className="h-64"
          onDoubleClick={() => openDetailView('line')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceChartData}>
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="portfolio"
                stroke="#3B82F6"
                strokeWidth={3}
                name="Portfolio"
                animationDuration={1000}
              />
              <Line
                type="monotone"
                dataKey="sp500"
                stroke="#10B981"
                strokeWidth={2}
                name="S&P 500"
                animationDuration={1200}
              />
              <Line
                type="monotone"
                dataKey="nasdaq"
                stroke="#F59E0B"
                strokeWidth={2}
                name="NASDAQ"
                animationDuration={1400}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-600">6M Return</p>
          <p className="text-xl font-bold text-blue-600">+25.0%</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-600">S&P 500</p>
          <p className="text-xl font-bold text-green-600">+15.0%</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-600">NASDAQ</p>
          <p className="text-xl font-bold text-yellow-600">+25.0%</p>
        </div>
      </div>
    </div>
  );

  const renderAllocation = () => (
    <div className="space-y-4">
      {allocationData.map((asset, index) => (
        <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded-full mr-3 flex items-center justify-center"
                style={{ backgroundColor: asset.themeColor + '20' }}
              >
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: asset.themeColor }}
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{asset.category}</h3>
                <p className="text-sm text-gray-600">{asset.percentage.toFixed(1)}% allocation</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">${asset.marketValue.toLocaleString()}</p>
              <p className="text-sm text-green-600">+2.4%</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAssets = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setShowDepositModal(true)}
          className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-center space-x-2 hover:bg-green-100 transition-colors"
        >
          <FaWallet className="w-5 h-5 text-green-600" />
          <span className="text-green-700 font-medium">Add Cash</span>
        </button>
        <button
          onClick={() => setShowNewAssetModal(true)}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-center space-x-2 hover:bg-blue-100 transition-colors"
        >
          <FiPlusCircle className="w-5 h-5 text-blue-600" />
          <span className="text-blue-700 font-medium">Add Asset</span>
        </button>
      </div>

      {portfolioPositions.map((position) => (
        <div key={position.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          {editingPosition?.id === position.id ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{position.ticker}</h3>
                <div className="flex space-x-2">
                  <button onClick={savePositionEdit} className="text-green-600">
                    <FiSave className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingPosition(null)} className="text-gray-600">
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={editingPosition.newQuantity}
                  onChange={(e) => setEditingPosition(prev => ({ ...prev!, newQuantity: e.target.value }))}
                  className="p-2 border rounded text-sm"
                  placeholder="Quantity"
                />
                <input
                  type="number"
                  value={editingPosition.newPrice}
                  onChange={(e) => setEditingPosition(prev => ({ ...prev!, newPrice: e.target.value }))}
                  className="p-2 border rounded text-sm"
                  placeholder="Price"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center">
                    <h3 className="font-semibold text-gray-900">{position.ticker}</h3>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      position.assetClass === 'equity' ? 'bg-blue-100 text-blue-700' :
                      position.assetClass === 'bond' ? 'bg-green-100 text-green-700' :
                      position.assetClass === 'cryptocurrency' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {position.assetClass}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">{position.baseCurrency}</span>
                  </div>
                  <p className="text-sm text-gray-600">{position.companyName}</p>
                  <p className="text-sm text-gray-500">
                    {position.quantity} {position.assetClass === 'cash' ? position.baseCurrency : 'shares'} @ {position.baseCurrency === 'USD' ? '$' : ''}{position.currentPrice.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-2">
                    <button
                      onClick={() => beginPositionEdit(position)}
                      className="text-blue-600"
                    >
                      <FiEdit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removePosition(position.id)}
                      className="text-red-600"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-semibold text-gray-900">
                    ${convertCurrency(position.quantity * position.currentPrice, position.baseCurrency).toLocaleString()}
                  </p>
                  <p className={`text-sm font-medium ${
                    position.currentPrice >= position.averageCost ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {position.currentPrice >= position.averageCost ? '+' : ''}
                    ${convertCurrency((position.currentPrice - position.averageCost) * position.quantity, position.baseCurrency).toLocaleString()}
                  </p>
                </div>
              </div>

              {position.assetClass !== 'cash' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePositionAction(position, 'buy')}
                    className="flex-1 bg-green-50 border border-green-200 text-green-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center space-x-1"
                  >
                    <FiShoppingCart className="w-4 h-4" />
                    <span>Buy More</span>
                  </button>
                  <button
                    onClick={() => handlePositionAction(position, 'sell')}
                    className="flex-1 bg-red-50 border border-red-200 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center space-x-1"
                  >
                    <BiTrendingDown className="w-4 h-4" />
                    <span>Sell</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      {transactionLog.map((record) => (
        <div key={record.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full mr-3 flex items-center justify-center ${
                record.tradeType === 'buy' ? 'bg-green-100' :
                record.tradeType === 'sell' ? 'bg-red-100' :
                record.tradeType === 'deposit' ? 'bg-blue-100' :
                'bg-purple-100'
              }`}>
                <span className={`text-sm font-bold ${
                  record.tradeType === 'buy' ? 'text-green-600' :
                  record.tradeType === 'sell' ? 'text-red-600' :
                  record.tradeType === 'deposit' ? 'text-blue-600' :
                  'text-purple-600'
                }`}>
                  {record.tradeType === 'buy' ? 'B' :
                   record.tradeType === 'sell' ? 'S' :
                   record.tradeType === 'deposit' ? 'D' : 'A'}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {record.tradeType.toUpperCase()} {record.ticker}
                </h3>
                <p className="text-sm text-gray-600">{record.tradeDate}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                {record.quantity} {record.ticker.includes('CASH') ? record.ticker.split('-')[0] : 'shares'}
              </p>
              <p className="text-sm text-gray-600">@ ${record.executionPrice}</p>
              <p className="text-sm font-medium text-gray-900">
                ${record.tradeValue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
      {transactionLog.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No transactions yet. Use the + button to add your first trade!
        </div>
      )}
    </div>
  );

  const displayContent = () => {
    switch (selectedTab) {
      case 0: return renderDashboard();
      case 1: return renderAllocation();
      case 2: return renderAssets();
      case 3: return renderHistory();
      default: return renderDashboard();
    }
  };

  if (initialLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Pull indicator */}
      {isSwipeActive && swipeDistance > 0 && (
        <div
          className="fixed top-0 left-0 right-0 bg-blue-50 flex items-center justify-center transition-all duration-100 ease-out z-50"
          style={{ height: `${swipeDistance}px` }}
        >
          <div className="flex items-center space-x-2">
            <FiRefreshCw className={`w-5 h-5 text-blue-600 ${swipeDistance > 50 ? 'animate-spin' : ''}`} />
            <span className="text-blue-600 text-sm">
              {swipeDistance > 50 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FaChartBar className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Investment Manager</h1>
          </div>
          <button
            onClick={refreshPortfolioData}
            className={`p-2 rounded-full ${isDataRefreshing ? 'animate-spin' : ''}`}
          >
            <FiRefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex overflow-x-auto scrollbar-hide">
          {navigationTabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setSelectedTab(index)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === index
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        ref={mainContainerRef}
        className="p-4 pb-20"
        onTouchStart={handleGestureStart}
        onTouchMove={handleGestureMove}
        onTouchEnd={handleGestureEnd}
      >
        {isDataRefreshing && (
          <div className="flex items-center justify-center py-4">
            <FiRefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-blue-600">Updating prices...</span>
          </div>
        )}

        {detailViewActive && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeDetailView}
          >
            <div className="bg-white rounded-xl p-6 m-4 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {detailViewActive === 'pie' ? 'Asset Allocation Details' : 'Performance Analysis'}
                </h3>
                <button onClick={closeDetailView} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {detailViewActive === 'pie' ? (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">${portfolioValue.toLocaleString()}</p>
                    <p className="text-gray-600">Total Portfolio Value</p>
                  </div>

                  <div className="space-y-3">
                    {allocationData.map((asset, index) => {
                      const holdingsCount = portfolioPositions.filter(p => {
                        const typeMapping: Record<string, string> = { equity: 'Equities', bond: 'Bonds', cryptocurrency: 'Cryptocurrency', cash: 'Cash' };
                        return typeMapping[p.assetClass] === asset.category;
                      }).length;

                      const avgGain = portfolioPositions
                        .filter(p => {
                          const typeMapping: Record<string, string> = { equity: 'Equities', bond: 'Bonds', cryptocurrency: 'Cryptocurrency', cash: 'Cash' };
                          return typeMapping[p.assetClass] === asset.category;
                        })
                        .reduce((acc, p) => {
                          const gain = p.averageCost === 0 ? 0 : ((p.currentPrice - p.averageCost) / p.averageCost) * 100;
                          return acc + (isNaN(gain) ? 0 : gain);
                        }, 0) / Math.max(holdingsCount, 1);

                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div
                              className="w-4 h-4 rounded-full mr-3"
                              style={{ backgroundColor: asset.themeColor }}
                            />
                            <div>
                              <p className="font-semibold text-gray-900">{asset.category}</p>
                              <p className="text-sm text-gray-600">{holdingsCount} {holdingsCount === 1 ? 'asset' : 'assets'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">${asset.marketValue.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">{asset.percentage.toFixed(1)}%</p>
                            <p className={`text-xs font-medium ${avgGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {avgGain >= 0 ? '+' : ''}{avgGain.toFixed(1)}% avg
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">+25.0%</p>
                      <p className="text-sm text-blue-700">Portfolio</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">+15.0%</p>
                      <p className="text-sm text-green-700">S&P 500</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-lg font-bold text-yellow-600">+25.0%</p>
                      <p className="text-sm text-yellow-700">NASDAQ</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Outperformance vs S&P 500:</span>
                      <span className="font-semibold text-green-600">+10.0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Volatility:</span>
                      <span className="font-semibold text-gray-900">12.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sharpe Ratio:</span>
                      <span className="font-semibold text-gray-900">1.85</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Drawdown:</span>
                      <span className="font-semibold text-red-600">-8.2%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="transition-all duration-300 ease-in-out">
          {displayContent()}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center space-x-4">
          <span>© 2025 Investment Manager</span>
          <span>•</span>
          <span>Made with ❤️</span>
          <span>•</span>
          <span>v2.1</span>
        </div>
      </footer>

      {/* FAB */}
      <button
        onClick={() => setShowTradeModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors z-40"
      >
        <AiOutlinePlus className="w-6 h-6" />
      </button>

      {/* Trade Modal */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-xl w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedAction ?
                  `${selectedAction.actionType === 'buy' ? 'Buy More' : 'Sell'} ${selectedAction.position.ticker}` :
                  'Quick Trade'
                }
              </h2>
              <button
                onClick={() => {
                  setShowTradeModal(false);
                  setSelectedAction(null);
                  setChosenAsset(null);
                  setSearchResults([]);
                  setTradeFormData({ action: 'buy', ticker: '', quantity: '', price: '', validationError: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {tradeFormData.validationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{tradeFormData.validationError}</p>
                </div>
              )}

              {selectedAction && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-700 text-sm">
                    You currently own {selectedAction.position.quantity} shares of {selectedAction.position.ticker}
                  </p>
                </div>
              )}

              {priceUpdateInProgress && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700 text-sm flex items-center">
                    <FiRefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Fetching current price...
                  </p>
                </div>
              )}

              {tradeFormData.action === 'sell' && tradeFormData.quantity && tradeFormData.ticker && (
                <div className={`border rounded-lg p-3 ${
                  validateSellQuantity(tradeFormData.quantity, tradeFormData.ticker).includes('only own') ||
                  validateSellQuantity(tradeFormData.quantity, tradeFormData.ticker).includes('do not own')
                    ? 'bg-red-50 border-red-200'
                    : validateSellQuantity(tradeFormData.quantity, tradeFormData.ticker).includes('all your shares')
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <p className={`text-sm ${
                    validateSellQuantity(tradeFormData.quantity, tradeFormData.ticker).includes('only own') ||
                    validateSellQuantity(tradeFormData.quantity, tradeFormData.ticker).includes('do not own')
                      ? 'text-red-700'
                      : validateSellQuantity(tradeFormData.quantity, tradeFormData.ticker).includes('all your shares')
                      ? 'text-yellow-700'
                      : 'text-green-700'
                  }`}>
                    {validateSellQuantity(tradeFormData.quantity, tradeFormData.ticker)}
                  </p>
                </div>
              )}

              {tradeFormData.action === 'buy' && tradeFormData.quantity && tradeFormData.price && (
                <div className={`border rounded-lg p-3 ${
                  validateFunds(parseFloat(tradeFormData.quantity), parseFloat(tradeFormData.price))
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-sm ${
                    validateFunds(parseFloat(tradeFormData.quantity), parseFloat(tradeFormData.price))
                      ? `✓ Sufficient funds. Cost: $${(parseFloat(tradeFormData.quantity) * parseFloat(tradeFormData.price)).toLocaleString()}`
                      : `✗ Insufficient funds. Available: $${totalLiquidityUSD.toLocaleString()}, Required: $${(parseFloat(tradeFormData.quantity) * parseFloat(tradeFormData.price)).toLocaleString()}`
                    }`}>
                    {validateFunds(parseFloat(tradeFormData.quantity), parseFloat(tradeFormData.price))
                      ? `✓ Sufficient funds. Cost: $${(parseFloat(tradeFormData.quantity) * parseFloat(tradeFormData.price)).toLocaleString()}`
                      : `✗ Insufficient funds. Available: $${totalLiquidityUSD.toLocaleString()}, Required: $${(parseFloat(tradeFormData.quantity) * parseFloat(tradeFormData.price)).toLocaleString()}`
                    }
                  </p>
                </div>
              )}

              {!selectedAction && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTradeFormData(prev => ({ ...prev, action: 'buy', validationError: '' }))}
                    className={`p-4 rounded-xl font-medium ${
                      tradeFormData.action === 'buy'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-50 text-green-700'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeFormData(prev => ({ ...prev, action: 'sell', validationError: '' }))}
                    className={`p-4 rounded-xl font-medium ${
                      tradeFormData.action === 'sell'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    Sell
                  </button>
                </div>
              )}

              {!selectedAction && (
                <AssetSearchField
                  value={tradeFormData.ticker}
                  onChange={(value) => setTradeFormData(prev => ({ ...prev, ticker: value, validationError: '' }))}
                  placeholder="Search stocks (e.g., AAPL, Apple)"
                  onSelect={selectAsset}
                />
              )}

              <input
                type="number"
                value={tradeFormData.quantity}
                onChange={(e) => setTradeFormData(prev => ({ ...prev, quantity: e.target.value, validationError: '' }))}
                placeholder="Number of shares"
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />

              <input
                type="number"
                value={tradeFormData.price}
                onChange={(e) => setTradeFormData(prev => ({ ...prev, price: e.target.value, validationError: '' }))}
                placeholder="Price per share"
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />

              {tradeFormData.action === 'sell' && tradeFormData.quantity && tradeFormData.price && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-700 text-sm">
                    Sale proceeds: ${(parseFloat(tradeFormData.quantity || '0') * parseFloat(tradeFormData.price || '0')).toLocaleString()} will be added to your USD cash
                  </p>
                </div>
              )}

              <button
                onClick={executeTrade}
                className="w-full bg-blue-600 text-white p-4 rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Execute Trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-xl w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Cash Deposit</h2>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setDepositFormData({ currency: 'USD', amount: '', validationError: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {depositFormData.validationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{depositFormData.validationError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={depositFormData.currency}
                  onChange={(e) => setDepositFormData(prev => ({ ...prev, currency: e.target.value, validationError: '' }))}
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="PLN">PLN - Polish Zloty</option>
                  <option value="RUB">RUB - Russian Ruble</option>
                </select>
              </div>

              <input
                type="number"
                value={depositFormData.amount}
                onChange={(e) => setDepositFormData(prev => ({ ...prev, amount: e.target.value, validationError: '' }))}
                placeholder="Amount"
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />

              <button
                onClick={processDeposit}
                className="w-full bg-green-600 text-white p-4 rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                Add Cash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {showNewAssetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-xl w-full p-6 animate-slide-up max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Existing Asset</h2>
              <button
                onClick={() => {
                  setShowNewAssetModal(false);
                  setChosenAsset(null);
                  setSearchResults([]);
                  setNewAssetFormData({
                    ticker: '',
                    name: '',
                    type: 'equity',
                    quantity: '',
                    price: '',
                    date: new Date().toISOString().split('T')[0],
                    currency: 'USD',
                    validationError: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {newAssetFormData.validationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{newAssetFormData.validationError}</p>
                </div>
              )}

              {priceUpdateInProgress && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700 text-sm flex items-center">
                    <FiRefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Fetching current price...
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <AssetSearchField
                  value={newAssetFormData.ticker}
                  onChange={(value) => setNewAssetFormData(prev => ({ ...prev, ticker: value, validationError: '' }))}
                  placeholder="Search symbol"
                  onSelect={selectAsset}
                />
                <select
                  value={newAssetFormData.type}
                  onChange={(e) => setNewAssetFormData(prev => ({ ...prev, type: e.target.value, validationError: '' }))}
                  className="p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="equity">Equity</option>
                  <option value="bond">Bond</option>
                  <option value="cryptocurrency">Cryptocurrency</option>
                </select>
              </div>

              <input
                type="text"
                value={newAssetFormData.name}
                onChange={(e) => setNewAssetFormData(prev => ({ ...prev, name: e.target.value, validationError: '' }))}
                placeholder="Asset name"
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={newAssetFormData.quantity}
                  onChange={(e) => setNewAssetFormData(prev => ({ ...prev, quantity: e.target.value, validationError: '' }))}
                  placeholder="Number of shares"
                  className="p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <input
                  type="number"
                  value={newAssetFormData.price}
                  onChange={(e) => setNewAssetFormData(prev => ({ ...prev, price: e.target.value, validationError: '' }))}
                  placeholder="Purchase price"
                  className="p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={newAssetFormData.date}
                  onChange={(e) => setNewAssetFormData(prev => ({ ...prev, date: e.target.value, validationError: '' }))}
                  className="p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <select
                  value={newAssetFormData.currency}
                  onChange={(e) => setNewAssetFormData(prev => ({ ...prev, currency: e.target.value, validationError: '' }))}
                  className="p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="PLN">PLN</option>
                  <option value="RUB">RUB</option>
                </select>
              </div>

              <button
                onClick={processNewAsset}
                className="w-full bg-purple-600 text-white p-4 rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Add Asset
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Oswald:wght@200..700&display=swap');
        h1, h2, h3, h4, h5, h6 {
          font-family: "Oswald", sans-serif;
        }
        body {
          font-family: "Open Sans", sans-serif;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}