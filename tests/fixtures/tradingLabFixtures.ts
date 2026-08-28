// Trading Lab fixture data — TEST/STORY USE ONLY.
//
// This file holds the synthetic market-data generators formerly embedded
// directly inside src/components/workspace/AccountViews.tsx (the
// "Trading Lab Preview" feature). They are relocated here, unchanged in
// generation logic, so the fully-populated visual look remains available
// for Storybook and Playwright fixtures without any fabrication path
// living inside shipped production component code.
//
// IMPORTANT: every dataState / dataSource value below is 'fixture', not
// 'live', and is cast via `as unknown as DataState` at the call site so a
// fixture can never satisfy the real, production DataState/live union.
// Do NOT import this file from anything under src/ — the CI guard at
// scripts/qa/verifyLiveDataTruthfulness.mjs fails the build if any of the
// identifiers below (or the literal 'Momentum Breakout') appear under src/.

import type {
  Candle,
  CandidateScore,
  ChartFeedStatus,
  DerivedLevels,
  OrderBook,
  OrderBookSummary,
  SymbolTicker,
  TerminalSettings,
} from '../../src/types';
import type { TradePlan } from '../../src/services/tradePlan';
import type { AccountSnapshot, ConnectionState } from '../../src/services/accountClient';

export function buildTradingLabCandles(startPrice: number, count = 84, intervalMs = 15 * 60 * 1000): Candle[] {
  const start = Date.now() - count * intervalMs;
  let price = startPrice;
  return Array.from({ length: count }, (_, index) => {
    const pulse = Math.sin(index * 1.37) * 18 + Math.sin(index * 0.53) * 13 + Math.cos(index * 0.21) * 9;
    const regime = index < 18
      ? 34
      : index < 36
        ? -6
        : index < 50
          ? 8
          : index < 66
            ? 42
            : index < 75
              ? -9
              : 18;
    const open = price;
    const close = Math.max(1, open + regime + pulse);
    const wickPulse = Math.abs(Math.sin(index * 0.91));
    const high = Math.max(open, close) + 42 + wickPulse * 54;
    const low = Math.min(open, close) - 38 - Math.abs(Math.cos(index * 0.77)) * 48;
    const volumeRegime = index >= 50 && index <= 68 ? 170 : index >= 74 ? 90 : 0;
    const volume = 145 + Math.abs(Math.sin(index / 2.25)) * 180 + volumeRegime;
    price = close;
    return {
      timestamp: start + index * intervalMs,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2)),
    };
  });
}

export function buildTradingLabDepth(lastPrice: number, side: 'bid' | 'ask', count = 12) {
  let cumulative = 0;
  return Array.from({ length: count }, (_, index) => {
    const distance = index + 1;
    const step = 5.5 + index * 1.15;
    const price = side === 'bid' ? lastPrice - distance * step : lastPrice + distance * step;
    const volume = Number((1.15 + distance * 0.2 + Math.abs(Math.sin(distance / 2.2)) * 0.55).toFixed(4));
    cumulative = Number((cumulative + volume).toFixed(4));
    return {
      price: Number(price.toFixed(2)),
      volume,
      cumulative,
      percentage: Math.max(8, 100 - index * 7.4),
    };
  });
}

export function buildTradingLabPreview(settings: TerminalSettings) {
  const now = Date.now();
  const chartCandles = buildTradingLabCandles(114_180);
  const selectedLast = chartCandles.at(-1)?.close ?? 115_000;
  const prev24 = chartCandles.at(-25)?.close ?? selectedLast;
  const change24 = ((selectedLast - prev24) / prev24) * 100;
  const recent = chartCandles.slice(-24);
  const tickers: SymbolTicker[] = [
    {
      symbol: 'BTC-USDT',
      lastPrice: selectedLast,
      turnover24h: 428_650_000,
      priceChange24hPct: change24,
      volume24h: 19_540,
      high24h: Math.max(...recent.map((row) => row.high)),
      low24h: Math.min(...recent.map((row) => row.low)),
      fundingRate: 0.00012,
      openInterest: 1_826_000_000,
      dataState: 'fixture' as unknown as SymbolTicker['dataState'],
      timestamp: now,
      sparkline1h: recent.map((row) => row.close),
    },
    {
      symbol: 'ETH-USDT', lastPrice: 3842.35, turnover24h: 192_300_000, priceChange24hPct: 1.82,
      volume24h: 54_900, high24h: 3868.20, low24h: 3755.60, fundingRate: 0.00009,
      openInterest: 824_000_000, dataState: 'fixture' as unknown as SymbolTicker['dataState'], timestamp: now,
      sparkline1h: [3758, 3765, 3771, 3789, 3796, 3804, 3815, 3809, 3821, 3830, 3836, 3842],
    },
    {
      symbol: 'SOL-USDT', lastPrice: 187.42, turnover24h: 88_400_000, priceChange24hPct: -0.64,
      volume24h: 321_400, high24h: 190.80, low24h: 184.40, fundingRate: 0.00015,
      openInterest: 263_000_000, dataState: 'fixture' as unknown as SymbolTicker['dataState'], timestamp: now,
      sparkline1h: [188.8, 188.1, 187.9, 188.2, 187.7, 187.1, 186.9, 187.2, 187.5, 187.4],
    },
  ];
  const selectedTicker = tickers[0];
  const bids = buildTradingLabDepth(selectedLast, 'bid');
  const asks = buildTradingLabDepth(selectedLast, 'ask');
  const chartOrderBookLevels: OrderBook = { bids, asks, dataSource: 'fixture' as unknown as OrderBook['dataSource'] };
  const chartOrderBook: OrderBookSummary = {
    symbol: selectedTicker.symbol,
    bidDepthUsd: bids.reduce((sum, level) => sum + level.price * level.volume, 0),
    askDepthUsd: asks.reduce((sum, level) => sum + level.price * level.volume, 0),
    imbalancePct: 8.4,
    dataState: 'fixture' as unknown as OrderBookSummary['dataState'],
    qualityState: 'VALID',
  };
  const levels: DerivedLevels = {
    symbol: selectedTicker.symbol,
    entry: selectedLast,
    resistances: [selectedLast + 180, selectedLast + 420, selectedLast + 760],
    supports: [selectedLast - 140, selectedLast - 360, selectedLast - 620],
    method: 'SWING_STRUCTURE',
    atr14: 165,
    confidenceScore: 83,
    evidenceList: [
      { label: 'Trend', tag: 'supports', detail: '15m and 1h structure are aligned in the fixture scenario.' },
      { label: 'Order flow', tag: 'supports', detail: 'Bid depth is modestly dominant around the top of book.' },
      { label: 'Funding', tag: 'neutral', detail: 'Positive funding remains inside a normal intraday range.' },
    ],
    riskReward: { nearestTarget: selectedLast + 180, nearestStop: selectedLast - 140, rMultiple: 1.29, riskPct: 1.12 },
    dataState: 'fixture' as unknown as DerivedLevels['dataState'],
  };
  const longScore: CandidateScore = {
    symbol: selectedTicker.symbol,
    lastPrice: selectedLast,
    priceChange24hPct: change24,
    turnover24h: selectedTicker.turnover24h,
    direction: 'LONG',
    score: 78,
    readinessTier: 'CONFIRMED',
    guardPass: true,
    guardReasons: [],
    momentumScore: 81,
    orderFlowScore: 74,
    fundingScore: 63,
    structureScore: 82,
    liquidityScore: 88,
    timeframeConfluence: true,
    timeframeDetails: { tf15m: 'BULLISH', tf1h: 'BULLISH' },
    timeframeConfluenceState: 'ALIGNED',
    featureCompletenessPct: 96,
    dataState: 'fixture' as unknown as CandidateScore['dataState'],
  };
  const shortScore: CandidateScore = {
    ...longScore,
    direction: 'SHORT',
    score: 39,
    readinessTier: 'CAUTION',
    momentumScore: 34,
    orderFlowScore: 42,
    fundingScore: 48,
    structureScore: 36,
    timeframeConfluence: false,
    timeframeDetails: { tf15m: 'NEUTRAL', tf1h: 'BEARISH' },
    timeframeConfluenceState: 'CONFLICTING',
  };
  const baseSizing = {
    positionSizeBase: 3,
    positionSizeUsd: selectedLast * 3,
    riskUsd: 1_250,
    expectedRMultiple: 1.84,
    liquidationPrice: selectedLast - 3_820,
    summaryText: 'Fixture sizing: 3 contracts at controlled demo risk.',
  };
  const tradePlanLong: TradePlan = {
    version: 'trade_plan_v1', id: 'FIXTURE-BTC-LONG-01', symbol: selectedTicker.symbol, direction: 'LONG',
    decisionRef: { score: longScore.score, readinessTier: longScore.readinessTier, engineVersion: 'fixture_preview_v1', createdAt: now },
    entryType: 'LIMIT', entryPrice: selectedLast - 22, entryRange: [selectedLast - 36, selectedLast + 18], stopLoss: selectedLast - 140,
    takeProfitTargets: [selectedLast + 180, selectedLast + 420, selectedLast + 760], quantity: 3, leverage: settings.defaultLeverage,
    riskAmountUsd: 1_250, expectedFeesUsd: 41.48, expectedFundingUsd: 6.32, expectedSpreadUsd: 18.60,
    expectedSlippageUsd: 9.30, expectedMarketImpactUsd: 5.80, expectedNetEdgeUsd: 642.85,
    costQuality: { spread: 'VALID', funding: 'VALID' }, netRiskReward: 1.84, grossRiskReward: 2.12,
    expiresAt: now + 90_000, createdAt: now, validationErrors: [], valid: true, sizing: baseSizing,
  };
  const tradePlanShort: TradePlan = {
    ...tradePlanLong,
    id: 'FIXTURE-BTC-SHORT-01', direction: 'SHORT',
    decisionRef: { score: shortScore.score, readinessTier: shortScore.readinessTier, engineVersion: 'fixture_preview_v1', createdAt: now },
    entryPrice: selectedLast + 18, entryRange: [selectedLast - 12, selectedLast + 42], stopLoss: selectedLast + 165,
    takeProfitTargets: [selectedLast - 140, selectedLast - 355, selectedLast - 610], expectedNetEdgeUsd: 188.24,
    netRiskReward: 0.92, grossRiskReward: 1.18,
  };
  const connection: ConnectionState = {
    status: 'demo', mode: 'demo', exchange: 'kucoin', environment: 'DEMO',
    profile: { id: 'fixture-preview', name: 'APEX Fixture Preview', accountType: 'DEMO' },
    connectedAt: new Date(now - 86_400_000).toISOString(), expiresAt: new Date(now + 30 * 86_400_000).toISOString(),
    portfolioState: 'available', executionState: 'unlocked', requiresOrderPreview: true, requiresExplicitConfirmation: true,
    maxOrderNotionalUsd: 25_000, startingBalanceUsd: 125_000, liveAvailable: false,
  };
  const snapshot: AccountSnapshot = {
    account: {
      currency: 'USDT', accountEquity: 124_850.42, equity: 124_850.42,
      availableBalance: 87_320.18, availableMargin: 87_320.18, positionMargin: 22_145.75,
      orderMargin: 3_240.50, maintenanceMargin: 4_965.32, maintMarginTotal: 4_965.32,
      unrealisedPnl: 733.30, unrealizedPnl: 733.30,
    },
    positions: [
      { id: 'pos-btc', symbol: 'BTC-USDT', currentQty: 3, avgEntryPrice: selectedLast - 95, markPrice: selectedLast, unrealisedPnl: 286.50, realLeverage: 6, liquidationPrice: selectedLast - 3_820, posInit: 5_725.40, isOpen: true },
      { id: 'pos-eth', symbol: 'ETH-USDT', currentQty: -8, avgEntryPrice: 3_898.20, markPrice: 3_842.35, unrealisedPnl: 446.80, realLeverage: 4, liquidationPrice: 4_126.80, posInit: 6_120.35, isOpen: true },
    ],
    openOrders: [
      { id: 'ord-1', symbol: 'BTC-USDT', side: 'buy', type: 'limit', size: 2, createdAt: now - 11 * 60_000 },
      { id: 'ord-2', symbol: 'BTC-USDT', side: 'sell', type: 'take-profit', size: 1, createdAt: now - 9 * 60_000 },
      { id: 'ord-3', symbol: 'ETH-USDT', side: 'sell', type: 'limit', size: 4, createdAt: now - 4 * 60_000 },
    ],
    recentOrders: [{ id: 'ro-1', symbol: 'BTC-USDT', side: 'buy', type: 'limit', size: 1, createdAt: now - 32 * 60_000 }],
    recentTrades: [
      { id: 'tr-1', symbol: 'BTC-USDT', side: 'buy', type: 'maker fill', dealSize: 1, tradeTime: now - 28 * 60_000 },
      { id: 'tr-2', symbol: 'ETH-USDT', side: 'sell', type: 'taker fill', dealSize: 2, tradeTime: now - 18 * 60_000 },
      { id: 'tr-3', symbol: 'SOL-USDT', side: 'buy', type: 'maker fill', dealSize: 20, tradeTime: now - 7 * 60_000 },
    ],
    positionHistory: [{ id: 'ph-1', symbol: 'BTC-USDT', side: 'buy', type: 'closed', size: 1, createdAt: now - 2 * 86_400_000 }],
    serverTime: now,
    syncedAt: new Date(now).toISOString(),
  };
  const chartFeed: ChartFeedStatus = {
    loading: false,
    dataState: 'fixture' as unknown as ChartFeedStatus['dataState'],
    source: 'FIXTURE_PREVIEW',
    stale: false,
    ageMs: 640,
    error: null,
  };
  return { tickers, selectedTicker, levels, longScore, shortScore, tradePlanLong, tradePlanShort, chartCandles, chartOrderBook, chartOrderBookLevels, connection, snapshot, chartFeed };
}
