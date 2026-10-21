import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Menu, 
  Power, 
  Play, 
  Pause,
  Square,
  Check,
  Plus,
  Minus,
  MousePointer2,
  Pencil,
  Ruler,
  Maximize2,
  Settings,
  Layers,
  Eye,
  EyeOff,
  Type,
  Layout,
  LineChart as LineChartIcon,
  ArrowUp, 
  ArrowDown,
  RefreshCcw, 
  Bell, 
  Trash2, 
  ChevronDown, 
  Home, 
  PlusCircle, 
  Activity, 
  Wallet, 
  MessageCircle,
  Inbox,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart2,
  X,
  CheckCircle2,
  AlertTriangle,
  Instagram,
  Music2,
  LifeBuoy,
  Briefcase,
  ExternalLink,
  Youtube,
  PlayCircle,
  Calculator,
  Target,
  PieChart,
  Calendar,
  History,
  Headphones,
  Download,
  Upload,
  ArrowLeftRight,
  Filter,
  FileText,
  Cpu,
  Search,
  Code2,
  Save,
  ChevronRight,
  Zap,
  Pen,
  Clock,
  Box,
  Wifi,
  ArrowRight,
  XCircle,
  AlertCircle,
  LogOut,
  Terminal,
  GitBranch,
  FolderOpen,
  FileCode,
  MoveRight,
  Grid3X3,
  Paintbrush,
  Eraser,
  Lock,
  Magnet,
  Crosshair,
  Triangle,
  Waves,
  CircleDashed,
  Shield,
  Users,
  User,
  CreditCard,
  ShieldAlert,
  UserPlus,
  Phone,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell
} from 'recharts';
import { createChart, ColorType, LineStyle, IChartApi, ISeriesApi, SeriesMarker, Time, CrosshairMode } from 'lightweight-charts';
import { useDeriv, TickData, useDerivCandles, useDerivMultiTicks, useDerivConnection, ConnectionStatus } from './hooks/useDeriv';
import { derivService } from './services/derivService';
import { useDerivAuth } from './contexts/DerivContext';
import { useRobot, Strategy } from './hooks/useRobot';
import { useFirebaseSync } from './hooks/useFirebaseSync';

// Utility to count days remaining (timezone-safe, comparing purely day/month/year)
const getDaysRemaining = (expDateStr: string) => {
  if (!expDateStr) return 0;
  const parts = expDateStr.split('-');
  if (parts.length !== 3) return 0;
  
  const expYear = parseInt(parts[0], 10);
  const expMonth = parseInt(parts[1], 10) - 1; // 0-based month in JS Date
  const expDay = parseInt(parts[2], 10);
  
  const expDate = new Date(expYear, expMonth, expDay, 0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Shared Audio Context to bypass modern browser autoplay blocking on async actions
let sharedAudioCtx: AudioContext | null = null;
const initAudio = () => {
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
  } catch (e) {
    console.error('Failed to init/resume audio context', e);
  }
};
if (typeof window !== 'undefined') {
  window.addEventListener('click', initAudio, { once: true });
  window.addEventListener('touchstart', initAudio, { once: true });
}

// Sound Utility
const playNotificationSound = (type: 'signal' | 'win' | 'loss' | 'success' | 'alert') => {
  if ((window as any).isMuted) return;
  try {
    const audioCtx = sharedAudioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      try {
        audioCtx.resume();
      } catch (e) {}
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'alert') {
      // Elegant futuristic, high-end double chime notification sound
      oscillator.type = 'sine';
      
      // High-pitched pleasant bell chime (C5 -> A5 rapid arpeggio)
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
      oscillator.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12);
      
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.12);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.6);
      return;
    }

    if (type === 'signal') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
      return;
    } else if (type === 'win' || type === 'success') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5
      oscillator.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.1); // E6
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
      return;
    } else {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
      return;
    }
  } catch (e) {
    console.warn('Audio context failed', e);
  }
};

const getEMA = (data: number[], period: number) => {
  const k = 2 / (period + 1);
  const emaArr = [data[0]];
  for (let i = 1; i < data.length; i++) {
    emaArr.push(data[i] * k + emaArr[i - 1] * (1 - k));
  }
  return emaArr;
};

const getRSI = (data: number[], period: number = 14) => {
  if (data.length <= period) return Array(data.length).fill(50);
  
  const rsiArr = Array(data.length).fill(50);
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsiArr[period] = 100 - (100 / (1 + (avgGain / (avgLoss || 0.00001))));
  
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
    rsiArr[i] = 100 - (100 / (1 + (avgGain / (avgLoss || 0.00001))));
  }
  return rsiArr;
};

const getATR = (candles: any[], period: number = 14) => {
    if (candles.length <= period) return Array(candles.length).fill(0);
    const atrArr = Array(candles.length).fill(0);
    
    // Initial TR and first ATR
    let sumTR = 0;
    for (let i = 1; i <= period; i++) {
        const h = candles[i].high;
        const l = candles[i].low;
        const pc = candles[i-1].close;
        const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
        sumTR += tr;
    }
    atrArr[period] = sumTR / period;
    
    for (let i = period + 1; i < candles.length; i++) {
        const h = candles[i].high;
        const l = candles[i].low;
        const pc = candles[i-1].close;
        const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
        atrArr[i] = (atrArr[i-1] * (period - 1) + tr) / period;
    }
    return atrArr;
};

const TechnicalChart = ({ symbol, onSignal, onSignalChange, onAddTrade }: { 
  symbol: string, 
  onSignal?: (signal: {type: 'CALL' | 'PUT', time: number, asset: string}) => void, 
  onSignalChange?: (signal: any) => void,
  onAddTrade?: (trade: any) => void
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<{
    main: ISeriesApi<"Candlestick"> | ISeriesApi<"Area">;
    fvg: ISeriesApi<"Candlestick">;
    ob: ISeriesApi<"Candlestick">;
    zone: ISeriesApi<"Candlestick"> | null;
    fib: ISeriesApi<"Candlestick"> | null;
    ema: ISeriesApi<"Line"> | null;
    bbUpper: ISeriesApi<"Line"> | null;
    bbLower: ISeriesApi<"Line"> | null;
  } | null>(null);
  
  const { account } = useDerivAuth();
  const { executeTrade } = useDeriv(symbol, account?.loginid);
  const [stake, setStake] = useState('10');
  const [isTrading, setIsTrading] = useState(false);
  
  const [tradeError, setTradeError] = useState('');

  const handleTrade = async (type: 'CALL' | 'PUT') => {
    if (!account) {
      setTradeError('Faça login para operar');
      setTimeout(() => setTradeError(''), 3000);
      return;
    }
    
    const val = parseFloat(stake);
    if (isNaN(val) || val <= 0) {
      setTradeError('Valor inválido');
      setTimeout(() => setTradeError(''), 3000);
      return;
    }

    try {
      setIsTrading(true);
      setTradeError('');
      const result = await executeTrade(type, val);
      if (onAddTrade && result) {
        onAddTrade({
          id: String(result.contract_id || Date.now()),
          time: new Date().toLocaleTimeString('pt-BR'),
          type,
          entry: result.entry_tick_display_value || '0',
          exit: result.exit_tick_display_value || '0',
          price: val.toString(),
          result: Number(result.profit || 0).toFixed(2),
          isWin: result.status === 'won',
          market: symbol
        });
      }
    } catch (err: any) {
      console.error(err);
      setTradeError(err.message || 'Erro na operação');
      setTimeout(() => setTradeError(''), 5000);
    } finally {
      setIsTrading(false);
    }
  };

  const [granularity, setGranularity] = useState(60);
  const [chartType, setChartType] = useState<'candle' | 'area'>('candle');
  const [isAutoFit, setIsAutoFit] = useState(true);
  const [activeTool, setActiveTool] = useState('cursor');
  
  const { candles, isLoading } = useDerivCandles(symbol, granularity);
  
  const [indicators, setIndicators] = useState(() => {
    try {
      const saved = localStorage.getItem('chart_indicators');
      return saved ? JSON.parse(saved) : { ema: true, bb: true, rsi: true, fvg: true, ob: true, zones: true, fib: true, sensitivity: 2.0 };
    } catch (e) {
      console.error('Failed to parse indicators', e);
      return { ema: true, bb: true, rsi: true, fvg: true, ob: true, zones: true, fib: true, sensitivity: 2.0 };
    }
  });
  
  const [lastSignal, setLastSignal] = useState<{type: 'CALL' | 'PUT', time: number, asset?: string, isConfirmed?: boolean} | null>(null);
  
  useEffect(() => {
    if (onSignalChange) onSignalChange(lastSignal);
  }, [lastSignal, onSignalChange]);

  const [signalHistory, setSignalHistory] = useState<{type: 'CALL' | 'PUT', time: number, asset: string, isConfirmed?: boolean}[]>([]);
  const lastDataTimeRef = useRef<number>(0);
  const [lastSymbol, setLastSymbol] = useState(symbol);
  const [lastGranularity, setLastGranularity] = useState(granularity);

  const TIMEFRAMES = [
    { label: '1m', value: 60 },
    { label: '5m', value: 300 },
    { label: '15m', value: 900 },
    { label: '1h', value: 3600 },
    { label: '4h', value: 14400 },
    { label: '1d', value: 86400 },
  ];
  
  const currentRsi = useMemo(() => {
    if (candles.length < 15) return 50;
    let gains = 0, losses = 0;
    const data = candles.slice(-15);
    for (let i = 1; i < data.length; i++) {
      const diff = data[i].close - data[i-1].close;
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    return Math.round(100 - (100 / (1 + (gains / (losses || 1)))));
  }, [candles]);

  useEffect(() => {
    localStorage.setItem('chart_indicators', JSON.stringify(indicators));
  }, [indicators]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        timeScale: {
          shiftVisibleRangeOnNewBar: isAutoFit,
        }
      });
    }
  }, [isAutoFit]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'var(--color-bg-primary)' },
        textColor: '#6B7280',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        shiftVisibleRangeOnNewBar: isAutoFit, 
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        autoScale: true, 
      },
      handleScroll: true,
      handleScale: true,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { 
          color: 'rgba(59, 130, 246, 0.5)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1E40AF',
        },
        horzLine: {
          color: 'rgba(59, 130, 246, 0.5)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1E40AF',
        },
      },
    });

    const mainSeries = chartType === 'candle' 
      ? chart.addCandlestickSeries({
          upColor: 'var(--color-accent)',
          downColor: '#EF4444',
          borderVisible: false,
          wickUpColor: 'var(--color-accent)',
          wickDownColor: '#EF4444',
        })
      : chart.addAreaSeries({
          lineColor: '#3B82F6',
          topColor: 'rgba(59, 130, 246, 0.4)',
          bottomColor: 'rgba(59, 130, 246, 0.05)',
          lineWidth: 2,
        });

    const fvgSeries = chart.addCandlestickSeries({
      upColor: 'rgba(0, 209, 143, 0.04)',
      downColor: 'rgba(239, 68, 68, 0.04)',
      borderVisible: true,
      borderColor: 'rgba(0, 209, 143, 0.1)',
      borderUpColor: 'rgba(0, 209, 143, 0.1)',
      borderDownColor: 'rgba(239, 68, 68, 0.1)',
      wickVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const obSeries = chart.addCandlestickSeries({
      upColor: 'rgba(59, 130, 246, 0.04)',
      downColor: 'rgba(139, 92, 246, 0.04)',
      borderVisible: true,
      borderColor: 'rgba(59, 130, 246, 0.1)',
      borderUpColor: 'rgba(59, 130, 246, 0.1)',
      borderDownColor: 'rgba(139, 92, 246, 0.1)',
      wickVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const zoneSeries = chart.addLineSeries({
      color: 'rgba(251, 146, 60, 0.6)',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const fibSeries = chart.addCandlestickSeries({
      upColor: 'rgba(234, 179, 8, 0.4)',
      downColor: 'rgba(234, 179, 8, 0.4)',
      borderVisible: false,
      wickVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    seriesRef.current = {
      main: mainSeries,
      fvg: fvgSeries,
      ob: obSeries,
      zone: zoneSeries,
      fib: null, // We'll use PriceLines for Fib instead
      ema: null,
      bbUpper: null,
      bbLower: null,
    };

    chartRef.current = chart;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    if (isAutoFit && candles.length > 0) {
      chart.timeScale().scrollToPosition(0, true);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, granularity, chartType, isAutoFit]);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || candles.length === 0) return;

    // Filter out potential non-chronological or duplicate timestamps just in case to prevent library crash
    const sanitizedCandles = candles.filter((c, i, self) => i === 0 || (c.time as number) > (self[i-1].time as number));
    if (sanitizedCandles.length === 0) return;

    const { main, fvg, ob } = seriesRef.current;
    const isArea = chartType === 'area';
    
    try {
      const lastCandle = sanitizedCandles[sanitizedCandles.length - 1];
      if (typeof lastCandle.time === 'object' || isNaN(lastCandle.time as number)) {
        console.warn('Invalid candle time detected');
        return;
      }

      const formattedCandles = isArea 
        ? sanitizedCandles.map(c => ({ time: c.time, value: c.close }))
        : sanitizedCandles;

      const formattedLastCandle = isArea
        ? { time: lastCandle.time, value: lastCandle.close }
        : lastCandle;

      if (lastCandle.time === lastDataTimeRef.current && symbol === lastSymbol && granularity === lastGranularity) {
        main.update(formattedLastCandle as any);
      } else {
        main.setData(formattedCandles as any);
        lastDataTimeRef.current = lastCandle.time as number;
        setLastSymbol(symbol);
        setLastGranularity(granularity);
        if (isAutoFit) {
          chartRef.current.timeScale().scrollToRealTime();
        }
      }
    } catch (err) {
      console.error('Lightweight Chart error:', err);
      // Fallback
      try { main.setData(sanitizedCandles as any); } catch(e) {}
    }

    const fvgMap = new Map<number, any>();
    const obMap = new Map<number, any>();
    const zoneMap = new Map<number, any>();
    const markers: SeriesMarker<Time>[] = [];
    
    // Optimized indicator data preparation
    const prices = candles.map(x => x.close);
    const highs = candles.map(x => x.high);
    const lows = candles.map(x => x.low);
    const rsiValues = getRSI(prices, 14); 
    const atrValues = getATR(candles, 14);
    
    const ema20Arr = getEMA(prices, 20);
    const bbData = candles.map((c, i) => {
        if (i < 19) return null;
        const slice = prices.slice(i - 19, i + 1);
        const ma = slice.reduce((a, b) => a + b, 0) / 20;
        const variance = slice.reduce((a, b) => a + Math.pow(b - ma, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        return { time: c.time, upper: ma + (stdDev * 2), lower: ma - (stdDev * 2), middle: ma };
    });

    // Fibonacci Calculation
    let fibLevels: { price: number, label: string, isGolden?: boolean }[] = [];
    if (indicators.fib && candles.length > 50) {
      const recentHigh = Math.max(...highs.slice(-100));
      const recentLow = Math.min(...lows.slice(-100));
      const diff = recentHigh - recentLow;
      
      const ratios = [
        { r: 0.382, l: '38.2%', g: false },
        { r: 0.5, l: '50.0%', g: true },
        { r: 0.618, l: '61.8%', g: true },
        { r: 0.786, l: '78.6%', g: true },
      ];
      
      fibLevels = ratios.map(ratio => ({
        price: recentHigh - (diff * ratio.r),
        label: `FIB ${ratio.l} ${ratio.g ? '🔥' : ''}`,
        isGolden: ratio.g
      }));
    }

    // Helper to project zones forward
    const projectZone = (map: Map<number, any>, startIndex: number, top: number, bottom: number, maxProject: number = 20) => {
      for (let j = 0; j < maxProject; j++) {
        const idx = startIndex + j;
        if (candles[idx]) {
          const time = candles[idx].time as number;
          map.set(time, { time, open: top, high: top, low: bottom, close: bottom });
        }
      }
    };

    const setDataSafely = (series: ISeriesApi<any> | null, data: any[]) => {
      if (!series || data.length === 0) return;
      const sorted = [...data].sort((a, b) => a.time - b.time);
      const unique = sorted.filter((item, i, self) => i === 0 || item.time > self[i-1].time);
      series.setData(unique);
    };

    for (let i = 25; i < candles.length; i++) {
        const current = candles[i];
        const prev1 = candles[i-1];
        const prev2 = candles[i-2];
        const atr = atrValues[i] || 0;
        const bodySize = Math.abs(current.close - current.open);
        
        // FVG Projection - Refined with ATR threshold
        if (indicators.fvg) {
          const gapBull = current.low - prev2.high;
          const gapBear = prev2.low - current.high;
          const minGapThreshold = atr * 0.15;

          if (gapBull > minGapThreshold) projectZone(fvgMap, i, current.low, prev2.high, 6); 
          else if (gapBear > minGapThreshold) projectZone(fvgMap, i, prev2.low, current.high, 6);
        }

        // OB Projection - Refined for "Strong" displacement
        if (indicators.ob && i > 5) {
          const body = Math.abs(current.close - current.open);
          const pBody = Math.abs(prev1.close - prev1.open);
          const isStrongDisplacement = body > pBody * 2.5 && body > atr * 0.5;

          if (current.close > prev1.high && prev1.close < prev1.open && isStrongDisplacement) {
            projectZone(obMap, i, prev1.high, prev1.low, 10);
          } else if (current.close < prev1.low && prev1.close > prev1.open && isStrongDisplacement) {
            projectZone(obMap, i, prev1.high, prev1.low, 10);
          }
        }
        
        // Reversal Zones / Regions detection (Swing Highs/Lows)
        if (indicators.zones && i > 3 && i < candles.length - 3) {
            const isSwingHigh = highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i-3] && highs[i] > highs[i+1] && highs[i] > highs[i+2] && highs[i] > highs[i+3];
            const isSwingLow = lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i-3] && lows[i] < lows[i+1] && lows[i] < lows[i+2] && lows[i] < lows[i+3];

            if (isSwingHigh) {
                const duration = 20;
                for (let j = 0; j < duration; j++) {
                    const idx = i + j;
                    if (candles[idx]) {
                      const time = candles[idx].time as number;
                      zoneMap.set(time, { time, value: current.high, type: 'resistance' });
                    }
                }
            }
            if (isSwingLow) {
                const duration = 20;
                for (let j = 0; j < duration; j++) {
                    const idx = i + j;
                    if (candles[idx]) {
                      const time = candles[idx].time as number;
                      zoneMap.set(time, { time, value: current.low, type: 'support' });
                    }
                }
            }
        }
        
        const bb = bbData[i];
        const upperBB = bb?.upper || 0;
        const lowerBB = bb?.lower || 0;

        const v5 = prices.slice(Math.max(0, i - 4), i + 1);
        const velocity = v5.length > 1 ? (v5[v5.length - 1] - v5[0]) / v5[0] * 1000 : 0;

        const lowerWick = current.open > current.close ? current.close - current.low : current.open - current.low;
        const upperWick = current.open > current.close ? current.high - current.open : current.high - current.close;
        
        // Confluence Detection
        const currentZone = Array.from(zoneMap.values()).find(z => z.time === current.time && Math.abs(current.close - z.value) < atr * 0.15);
        const nearFib = fibLevels.some(l => Math.abs(current.close - l.price) < atr * 0.1);
        
        const isBullishRejection = lowerWick > bodySize * 1.5 && (current.low <= lowerBB * 1.0005 || currentZone?.type === 'support' || nearFib);
        const isBearishRejection = upperWick > bodySize * 1.5 && (current.high >= upperBB * 0.9995 || currentZone?.type === 'resistance' || nearFib);

        const isBullishCore = (current.close <= lowerBB * 1.0003 || rsiValues[i] < 30) && (currentZone?.type === 'support' || nearFib);
        const isBearishCore = (current.close >= upperBB * 0.9997 || rsiValues[i] > 70) && (currentZone?.type === 'resistance' || nearFib);
        
        // Pullback Logic
        const wasAboveZone = prev1.low > (currentZone?.value || 0);
        const wasBelowZone = prev1.high < (currentZone?.value || 0);
        const isPullbackCall = wasAboveZone && current.low <= (currentZone?.value || 0) && currentZone?.type === 'support';
        const isPullbackPut = wasBelowZone && current.high >= (currentZone?.value || 0) && currentZone?.type === 'resistance';

        const timeStr = new Date((current.time as number) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Prevent markers duplicate or too close
        const lastMarkerTime = markers.length > 0 ? (markers[markers.length - 1].time as number) : 0;
        const currentTicks = current.time as number;
        const canPlaceMarker = (currentTicks - lastMarkerTime) > 60; 

        // Early signal detection (lower threshold for "Prepare")
        const velocityAbs = Math.abs(velocity);
        const isPreSignalPossible = velocityAbs > 0.0004;

        if ((isBullishCore || isBullishRejection || isPullbackCall) && velocity > 0.0008 && canPlaceMarker) {
          markers.push({ 
            time: current.time as Time, 
            position: 'belowBar', 
            color: 'var(--color-accent)', 
            shape: 'arrowUp', 
            text: `CALL` 
          });
          if (i === candles.length - 1 && (!lastSignal || lastSignal.time !== current.time || !lastSignal.isConfirmed)) {
             const signalData = { type: 'CALL' as const, time: current.time as number, asset: symbol, isConfirmed: true };
             setLastSignal(signalData);
             setSignalHistory(prev => [...prev, signalData].slice(-10));
             playNotificationSound('signal');
             if (onSignal) onSignal(signalData);
          }
        } else if ((isBearishCore || isBearishRejection || isPullbackPut) && velocity < -0.0008 && canPlaceMarker) {
          markers.push({ 
            time: current.time as Time, 
            position: 'aboveBar', 
            color: '#EF4444', 
            shape: 'arrowDown', 
            text: `PUT` 
          });
          if (i === candles.length - 1 && (!lastSignal || lastSignal.time !== current.time || !lastSignal.isConfirmed)) {
             const signalData = { type: 'PUT' as const, time: current.time as number, asset: symbol, isConfirmed: true };
             setLastSignal(signalData);
             setSignalHistory(prev => [...prev, signalData].slice(-10));
             playNotificationSound('signal');
             if (onSignal) onSignal(signalData);
          }
        } else if (i === candles.length - 1 && isPreSignalPossible && canPlaceMarker && !lastSignal) {
           // Anticipated signal (Prepare) - show alert when trend starts forming
           const signalType = velocity > 0 ? 'CALL' : 'PUT';
           const signalData = { type: signalType as any, time: current.time as number, asset: symbol, isConfirmed: false };
           setLastSignal(signalData);
        }
    }
    
    main.setMarkers(markers);
    setDataSafely(fvg, Array.from(fvgMap.values()));
    setDataSafely(ob, Array.from(obMap.values()));
    setDataSafely(seriesRef.current.zone, Array.from(zoneMap.values()));

    // PriceLines for Fibonacci
    if (seriesRef.current.main && indicators.fib) {
      // Manage persistent price lines
      (seriesRef.current.main as any)._fibLines = (seriesRef.current.main as any)._fibLines || [];
      const oldLines = (seriesRef.current.main as any)._fibLines;
      oldLines.forEach((l: any) => seriesRef.current!.main.removePriceLine(l));
      
      const newLines = fibLevels.map(lvl => seriesRef.current!.main.createPriceLine({
        price: lvl.price,
        color: lvl.isGolden ? 'rgba(234, 179, 8, 0.7)' : 'rgba(255, 255, 255, 0.2)',
        lineWidth: lvl.isGolden ? 2 : 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: lvl.label,
      }));
      (seriesRef.current.main as any)._fibLines = newLines;
    } else if (seriesRef.current.main && (seriesRef.current.main as any)._fibLines) {
      (seriesRef.current.main as any)._fibLines.forEach((l: any) => seriesRef.current!.main.removePriceLine(l));
      (seriesRef.current.main as any)._fibLines = [];
    }

    // Horizontal S/R Lines
    if (seriesRef.current.main && indicators.zones) {
      (seriesRef.current.main as any)._zoneLines = (seriesRef.current.main as any)._zoneLines || [];
      const oldLines = (seriesRef.current.main as any)._zoneLines;
      oldLines.forEach((l: any) => seriesRef.current!.main.removePriceLine(l));

      const detectedLevels = new Set<number>();
      for (const z of Array.from(zoneMap.values())) {
        detectedLevels.add(z.value);
      }

      const newLines = Array.from(detectedLevels).slice(-6).map(price => seriesRef.current!.main.createPriceLine({
        price,
        color: 'rgba(59, 130, 246, 0.4)',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'S/R LVL',
      }));
      (seriesRef.current.main as any)._zoneLines = newLines;
    } else if (seriesRef.current.main && (seriesRef.current.main as any)._zoneLines) {
      (seriesRef.current.main as any)._zoneLines.forEach((l: any) => seriesRef.current!.main.removePriceLine(l));
      (seriesRef.current.main as any)._zoneLines = [];
    }

    // Dynamic series management
    if (indicators.ema) {
      if (!seriesRef.current.ema) {
        seriesRef.current.ema = chartRef.current!.addLineSeries({ color: 'rgba(59, 130, 246, 0.5)', lineWidth: 1, title: 'EMA 20' });
      }
      const emaData = getEMA(prices, 20).map((val, i) => i >= 20 ? { time: candles[i].time, value: val } : null).filter(Boolean) as any;
      setDataSafely(seriesRef.current.ema, emaData);
    } else if (seriesRef.current.ema) {
      chartRef.current!.removeSeries(seriesRef.current.ema);
      seriesRef.current.ema = null;
    }

    if (indicators.bb) {
      if (!seriesRef.current.bbUpper) {
        seriesRef.current.bbUpper = chartRef.current!.addLineSeries({ color: 'rgba(59, 130, 246, 0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, crosshairMarkerVisible: false });
        seriesRef.current.bbLower = chartRef.current!.addLineSeries({ color: 'rgba(59, 130, 246, 0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, crosshairMarkerVisible: false });
        seriesRef.current.ema = chartRef.current!.addLineSeries({ color: 'rgba(59, 130, 246, 0.2)', lineWidth: 1, crosshairMarkerVisible: false });
      }
      const bbData = candles.map((c, i) => {
        if (i < 19) return null; // Need 20 candles
        const slice = candles.slice(i - 19, i + 1).map(x => x.close);
        const ma = slice.reduce((a, b) => a + b, 0) / 20;
        const variance = slice.reduce((a, b) => a + Math.pow(b - ma, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        return { 
          time: c.time, 
          upper: ma + (stdDev * 2), 
          lower: ma - (stdDev * 2),
          middle: ma
        };
      }).filter(Boolean) as any[];
      
      setDataSafely(seriesRef.current.bbUpper, bbData.map(d => ({ time: d.time, value: d.upper })));
      setDataSafely(seriesRef.current.bbLower, bbData.map(d => ({ time: d.time, value: d.lower })));
      setDataSafely(seriesRef.current.ema, bbData.map(d => ({ time: d.time, value: d.middle })));
    } else {
      if (seriesRef.current.bbUpper) {
        chartRef.current!.removeSeries(seriesRef.current.bbUpper);
        seriesRef.current.bbUpper = null;
      }
      if (seriesRef.current.bbLower) {
        chartRef.current!.removeSeries(seriesRef.current.bbLower);
        seriesRef.current.bbLower = null;
      }
      if (seriesRef.current.ema) {
        chartRef.current!.removeSeries(seriesRef.current.ema);
        seriesRef.current.ema = null;
      }
    }
  }, [candles, indicators, lastSignal, onSignal, isAutoFit]);

  return (
    <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-white/5 overflow-hidden relative flex flex-col h-[800px]">
      {/* Top Navigation Bar (TradingView Style) */}
      <div className="h-12 border-b border-white/5 flex items-center px-2 bg-[var(--color-bg-primary)] shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 border-r border-white/5 pr-2 mr-2">
          <div className="px-3 py-1 bg-[var(--color-accent)]/10 rounded border border-[var(--color-accent)]/20 flex items-center gap-2">
            <TrendingUp size={14} className="text-[var(--color-accent)]" />
            <span className="text-xs font-bold text-white uppercase">{symbol.replace('R_', 'V')}</span>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 border-r border-white/5 pr-2 mr-2">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setGranularity(tf.value)}
              className={`px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                granularity === tf.value ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Chart Type Selector */}
        <div className="flex items-center gap-1 border-r border-white/5 pr-2 mr-2">
          <button 
            onClick={() => setChartType('candle')}
            className={`p-1.5 rounded ${chartType === 'candle' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Candles"
          >
            <BarChart2 size={16} />
          </button>
          <button 
            onClick={() => setChartType('area')}
            className={`p-1.5 rounded ${chartType === 'area' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Area"
          >
            <LineChartIcon size={16} />
          </button>
        </div>

        {/* Indicators Overlay */}
        <div className="flex-1 flex justify-center overflow-hidden px-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {signalHistory.length > 0 ? (
              signalHistory.slice(-3).reverse().map((sig, idx) => (
                <div key={`${sig.time}-${idx}`} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-lg animate-fade-in shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${sig.type === 'CALL' ? 'bg-[var(--color-accent)]' : 'bg-red-500'} animate-pulse`} />
                  <span className="text-[10px] font-black text-white italic">{sig.asset.replace('R_', 'V')}</span>
                  <span className={`text-[10px] font-black ${sig.type === 'CALL' ? 'text-[var(--color-accent)]' : 'text-red-500'}`}>{sig.type}</span>
                  <span className="text-[8px] font-mono text-white/30">{new Date(sig.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-white/20">
                <Shield size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest italic">Analisando Mercado em Tempo Real...</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
            <button 
              onClick={() => setIndicators({...indicators, zones: !indicators.zones})}
              className={`px-2 py-1 text-[9px] font-black rounded border transition-all flex items-center gap-1.5 ${ indicators.zones ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/10 text-white/20'}`}
              title="Suporte e Resistência"
            >
              <Layers size={10} />
              <span className="hidden sm:inline">ZONAS</span>
            </button>
            <button 
              onClick={() => setIndicators({...indicators, fvg: !indicators.fvg})}
              className={`px-2 py-1 text-[9px] font-black rounded border transition-all flex items-center gap-1.5 ${ indicators.fvg ? 'bg-green-600/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white/20'}`}
              title="Fair Value Gaps"
            >
              <Zap size={10} />
              <span className="hidden sm:inline">FVG</span>
            </button>
            <button 
              onClick={() => setIndicators({...indicators, ob: !indicators.ob})}
              className={`px-2 py-1 text-[9px] font-black rounded border transition-all flex items-center gap-1.5 ${ indicators.ob ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-white/20'}`}
              title="Order Blocks"
            >
              <Box size={10} />
              <span className="hidden sm:inline">OB</span>
            </button>
            <button 
              onClick={() => setIndicators({...indicators, fib: !indicators.fib})}
              className={`px-2 py-1 text-[9px] font-black rounded border transition-all flex items-center gap-1.5 ${indicators.fib ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-400' : 'bg-white/5 border-white/10 text-white/20'}`}
            >
              <Triangle size={10} />
              <span className="hidden sm:inline">FIB</span>
            </button>
            <button 
              onClick={() => setIndicators({...indicators, bb: !indicators.bb})}
              className={`px-2 py-1 text-[9px] font-black rounded border transition-all flex items-center gap-1.5 ${indicators.bb ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-white/20'}`}
            >
              <CircleDashed size={10} />
              <span className="hidden sm:inline">BB</span>
            </button>
            <button 
              onClick={() => setIndicators({...indicators, rsi: !indicators.rsi})}
              className={`px-2 py-1 text-[9px] font-black rounded border transition-all flex items-center gap-1.5 ${indicators.rsi ? 'bg-[var(--color-accent)]/20 border-[var(--color-accent)]/50 text-[var(--color-accent)]' : 'bg-white/5 border-white/10 text-white/20'}`}
            >
              <Waves size={10} />
              <span className="hidden sm:inline">RSI {indicators.rsi && `(${currentRsi})`}</span>
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
           <button 
            onClick={() => setIsAutoFit(!isAutoFit)}
            className={`p-1.5 rounded transition-all ${isAutoFit ? 'text-orange-500' : 'text-gray-400 hover:text-white'}`}
            title="Auto-Scroll"
          >
            <RefreshCcw size={16} className={isAutoFit ? 'animate-spin-slow' : ''} />
          </button>
           <button className="p-1.5 text-gray-400 hover:text-white transition-colors">
            <Settings size={16} />
          </button>
        </div>
      </div>


      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Side Toolbar (TradingView Style) */}
        <div className="w-12 border-r border-white/5 bg-[var(--color-bg-primary)] flex flex-col items-center py-4 gap-4 shrink-0 overflow-y-auto no-scrollbar">
          <button 
            onClick={() => setActiveTool('cursor')}
            className={`p-2 rounded-lg transition-colors ${activeTool === 'cursor' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            title="Cursor"
          >
            <MousePointer2 size={18} />
          </button>
          <button 
            onClick={() => setActiveTool('crosshair')}
            className={`p-2 rounded-lg transition-colors ${activeTool === 'crosshair' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            title="Crosshair"
          >
            <Crosshair size={18} />
          </button>
          <div className="w-8 h-px bg-white/5" />
          <button 
            onClick={() => setActiveTool('trend')}
            className={`p-2 rounded-lg transition-colors ${activeTool === 'trend' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            title="Trend Line"
          >
            <MoveRight size={18} />
          </button>
          <button 
            onClick={() => setActiveTool('pencil')}
            className={`p-2 rounded-lg transition-colors ${activeTool === 'pencil' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            title="Pencil"
          >
            <Pencil size={18} />
          </button>
          <button 
            onClick={() => setActiveTool('fib')}
            className={`p-2 rounded-lg transition-colors ${activeTool === 'fib' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            title="Fibonacci"
          >
            <Grid3X3 size={18} />
          </button>
          <button 
            onClick={() => setActiveTool('brush')}
            className={`p-2 rounded-lg transition-colors ${activeTool === 'brush' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            title="Brush"
          >
            <Paintbrush size={18} />
          </button>
          <button 
            onClick={() => setActiveTool('shape')}
            className={`p-2 rounded-lg transition-colors ${activeTool === 'shape' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            title="Shapes"
          >
            <Layout size={18} />
          </button>
          <button 
            onClick={() => setActiveTool('type')}
            className={`p-2 rounded-lg transition-colors ${activeTool === 'type' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            title="Text"
          >
            <Type size={18} />
          </button>
          <button 
             onClick={() => setActiveTool('ruler')}
             className={`p-2 rounded-lg transition-colors ${activeTool === 'ruler' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
             title="Measure"
          >
            <Ruler size={18} />
          </button>
          
          <div className="mt-auto border-t border-white/5 pt-4 w-full flex flex-col items-center gap-4">
            <button className="text-gray-500 hover:text-white transition-colors" title="Lock All">
              <Lock size={18} />
            </button>
            <button className="text-gray-500 hover:text-white transition-colors" title="Magnet Mode">
              <Magnet size={18} />
            </button>
            <button className="text-gray-500 hover:text-white transition-colors" title="Show/Hide">
              <Eye size={18} />
            </button>
            <button className="text-gray-500 hover:text-white transition-colors" title="Remove All">
              <Eraser size={18} />
            </button>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 min-w-0 relative">
          {/* Trade Buttons Floating Bottom Overlay */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-[95%] sm:max-w-md px-2 sm:px-4">
            <div className="flex bg-black/90 backdrop-blur-2xl rounded-2xl border border-white/10 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] items-stretch">
               <div className="flex flex-col px-2 sm:px-3 justify-center border-r border-white/10">
                <span className="text-[6px] sm:text-[7px] font-black text-white/40 uppercase leading-none mb-1 tracking-tighter">Stake (USD)</span>
                <input 
                  type="text" 
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="w-10 sm:w-12 bg-transparent text-[11px] sm:text-[13px] font-black text-center text-[var(--color-accent)] border-none focus:ring-0 p-0"
                />
              </div>
              
              <div className="flex-1 flex gap-1 sm:gap-1.5 ml-1 sm:ml-1.5">
                <button 
                  onClick={() => handleTrade('CALL')}
                  disabled={isTrading || !account}
                  className={`flex-1 py-2 sm:py-3 font-black text-[9px] sm:text-[11px] rounded-xl uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 ${
                    isTrading ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-[var(--color-accent)] text-black hover:brightness-110 active:scale-95 shadow-[var(--color-accent)]/20'
                  }`}
                >
                  {isTrading ? <RefreshCcw size={12} className="animate-spin" /> : <TrendingUp size={12} className="sm:size-[14px]" />}
                  COMPRA
                </button>
                
                <button 
                  onClick={() => handleTrade('PUT')}
                  disabled={isTrading || !account}
                  className={`flex-1 py-2 sm:py-3 font-black text-[9px] sm:text-[11px] rounded-xl uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 ${
                    isTrading ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-red-500 text-white hover:brightness-110 active:scale-95 shadow-red-500/20'
                  }`}
                >
                  {isTrading ? <RefreshCcw size={12} className="animate-spin" /> : <TrendingDown size={12} className="sm:size-[14px]" />}
                  VENDA
                </button>
              </div>
            </div>
          </div>

          {/* Trade Error Overlay */}
          <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
            {tradeError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500 text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-xl border border-red-400/20 uppercase tracking-wider"
              >
                {tradeError}
              </motion.div>
            )}
          </div>

          {isLoading && (
            <div className="absolute inset-0 z-50 bg-[var(--color-bg-primary)]/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-[var(--color-accent)]/10 border-t-[var(--color-accent)] animate-spin mb-4" />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Sincronizando...</span>
            </div>
          )}
          <div ref={chartContainerRef} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
};

const RobotPanel = ({ onAddBot, selectedVol, onAddTrade }: { onAddBot: (bot: any) => void, selectedVol: string, onAddTrade?: (trade: any) => void }) => {
  const [stake, setStake] = useState('0.35');
  const [gale, setGale] = useState('2.2');
  const [galeQty, setGaleQty] = useState('3');
  const [stopLoss, setStopLoss] = useState('0');
  const [stopWin, setStopWin] = useState('0');
  const [isActive, setIsActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [botCode, setBotCode] = useState('');
  const [showBotImport, setShowBotImport] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeToView, setCodeToView] = useState('');
  const [profiles, setProfiles] = useState<{id: string, name: string, stake: string, gale: string, galeQty: string, stopLoss: string, stopWin: string}[]>([]);
  const [showProfiles, setShowProfiles] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { account } = useDerivAuth();

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const parseBotCode = (code: string) => {
    try {
      const stakeMatch = code.match(/<field name="AMOUNT">([\d.]+)<\/field>/i) || code.match(/"amount":\s*([\d.]+)/i);
      const stopLossMatch = code.match(/<field name="LOSS_THRESHOLD">([\d.]+)<\/field>/i) || code.match(/"stop_loss":\s*([\d.]+)/i);
      const stopWinMatch = code.match(/<field name="WIN_THRESHOLD">([\d.]+)<\/field>/i) || code.match(/"stop_win":\s*([\d.]+)/i);
      
      if (stakeMatch) setStake(stakeMatch[1]);
      if (stopLossMatch) setStopLoss(stopLossMatch[1]);
      if (stopWinMatch) setStopWin(stopWinMatch[1]);
    } catch (e) {
      console.warn("Could not parse config from bot code", e);
    }
  };

  useEffect(() => {
    const savedProfiles = localStorage.getItem('robot_profiles');
    if (savedProfiles) {
      try {
        setProfiles(JSON.parse(savedProfiles));
      } catch (e) {
        console.error('Failed to parse profiles', e);
      }
    }
  }, []);

  const saveProfile = () => {
    if (!newProfileName.trim()) return;
    const newProfile = {
      id: Date.now().toString(),
      name: newProfileName,
      stake,
      gale,
      galeQty,
      stopLoss,
      stopWin
    };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('robot_profiles', JSON.stringify(updated));
    setNewProfileName('');
    
    // Play sound or notification if available in context
    playNotificationSound('signal');
  };

  const loadProfile = (p: any) => {
    setStake(p.stake);
    setGale(p.gale);
    setGaleQty(p.galeQty);
    setStopLoss(p.stopLoss);
    setStopWin(p.stopWin);
    setShowProfiles(false);
    playNotificationSound('signal');
  };

  const deleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    localStorage.setItem('robot_profiles', JSON.stringify(updated));
  };

  const toggleBot = () => {
    if (!isActive) {
      // Validate inputs
      const s = parseFloat(stake);
      const g = parseFloat(gale);
      const q = parseInt(galeQty);
      
      if (isNaN(s) || s <= 0) {
        setErrorMsg('Stake deve ser um número maior que 0');
        setTimeout(() => setErrorMsg(''), 3000);
        return;
      }
      if (isNaN(g) || g < 1) {
        setErrorMsg('Gale deve ser >= 1');
        setTimeout(() => setErrorMsg(''), 3000);
        return;
      }
      if (isNaN(q) || q < 0) {
        setErrorMsg('Qtd Gale inválida');
        setTimeout(() => setErrorMsg(''), 3000);
        return;
      }
      setErrorMsg('');
    }
    setIsActive(!isActive);
  };

  const strategy: Strategy = {
    id: '3832',
    name: '4 pra 1',
    sequence: ['I', 'I', 'I', 'I'],
    result: 'P'
  };

  const { logs, isTrading, stats, isPaused, resume } = useRobot(
    selectedVol, 
    strategy, 
    parseFloat(stake), 
    isActive, 
    playNotificationSound,
    (trade) => {
      if (onAddTrade) {
        onAddTrade({
          ...trade,
          market: selectedVol
        });
      }
    },
    { stopLoss: parseFloat(stopLoss), stopWin: parseFloat(stopWin) }
  );

  const handleImportBot = () => {
    if (!botCode.trim() || isImporting) return;
    
    setIsImporting(true);
    
    // Simulate some "processing" time for better UX
    setTimeout(() => {
      parseBotCode(botCode);
      
      // Create a new bot object
      const newBot = {
        id: `custom-${Date.now()}`,
        name: `Bot Importado #${Math.floor(Math.random() * 1000)}`,
        tag: 'Importado',
        color: '#A855F7', // Purple for custom bots
        icon: <Code2 size={20} />,
        code: botCode
      };

      onAddBot(newBot);
      setShowBotImport(false);
      setBotCode('');
      setIsImporting(false);
    }, 1500);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      
      setBotCode(content);
      parseBotCode(content);
      
      const newBot = {
        id: `file-${Date.now()}`,
        name: fileName || `Bot Uploaded`,
        tag: 'Upload',
        color: '#10B981',
        icon: <Cpu size={20} />,
        code: content
      };
      
      onAddBot(newBot);
      setShowBotImport(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Bot Registration / Import */}
      <div className="bg-[var(--color-bg-secondary)]/30 border border-white/10 rounded-xl p-3">
        <button 
          onClick={() => setShowBotImport(!showBotImport)}
          className="w-full flex items-center justify-between text-[11px] font-bold text-white/70 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code2 size={14} className="text-blue-400" />
            <span>Cadastrar / Importar Bot Deriv</span>
          </div>
          <PlusCircle size={14} className={`transition-transform ${showBotImport ? 'rotate-45' : ''}`} />
        </button>
        
        <AnimatePresence>
          {showBotImport && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-3 overflow-hidden"
            >
              <p className="text-[9px] text-white/40 italic">Cole o XML do Binary Bot ou JSON do Deriv Bot abaixo:</p>
              <textarea 
                value={botCode}
                onChange={(e) => setBotCode(e.target.value)}
                placeholder="Cole o código do bot aqui..."
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-[10px] font-mono text-white/80 h-24 focus:outline-none focus:border-blue-500/30 transition-all custom-scrollbar"
              />
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold rounded-lg border border-white/10 transition-all flex items-center justify-center gap-1.5 uppercase"
                  >
                    <Upload size={12} />
                    Arquivo
                  </button>
                  <button 
                    onClick={() => {
                      if (botCode.trim()) {
                        setCodeToView(botCode);
                        setShowCodeModal(true);
                      }
                    }}
                    disabled={!botCode.trim()}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold rounded-lg border border-white/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-20 uppercase"
                  >
                    <Eye size={12} />
                    Ver Código
                  </button>
                  <button 
                    onClick={() => {
                      if (botCode.trim()) {
                        const isXml = botCode.trim().startsWith('<xml');
                        downloadFile(
                          botCode, 
                          `smarti-bot-${Date.now()}.${isXml ? 'xml' : 'json'}`, 
                          isXml ? 'text/xml' : 'application/json'
                        );
                      }
                    }}
                    disabled={!botCode.trim()}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold rounded-lg border border-white/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-20 uppercase"
                  >
                    <Download size={12} />
                    Baixar
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".xml,.json"
                />
                <button 
                  onClick={handleImportBot}
                  disabled={!botCode.trim() || isImporting}
                  className="w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-black rounded-lg border border-blue-600/30 transition-all font-sans uppercase flex items-center justify-center gap-2 disabled:opacity-20 relative overflow-hidden"
                >
                  {isImporting ? (
                    <>
                      <div className="absolute inset-0 bg-blue-400/10 animate-pulse" />
                      <RefreshCcw size={14} className="animate-spin" />
                      <span>Processando XML...</span>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.5 }}
                        className="absolute bottom-0 left-0 h-[2px] bg-blue-400"
                      />
                    </>
                  ) : (
                    <>
                      <PlusCircle size={14} />
                      Importar e Configurar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Profile Management */}
      <div className="bg-[var(--color-bg-secondary)]/30 border border-white/10 rounded-xl p-3">
        <button 
          onClick={() => setShowProfiles(!showProfiles)}
          className="w-full flex items-center justify-between text-[11px] font-bold text-white/70 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-[var(--color-accent)]" />
            <span>Meus Perfis de Configuração</span>
          </div>
          <ChevronDown size={14} className={`transition-transform ${showProfiles ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showProfiles && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-3 overflow-hidden text-left"
            >
              <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
                {profiles.length === 0 && <p className="text-[9px] text-white/20 italic p-2">Nenhum perfil salvo.</p>}
                {profiles.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => loadProfile(p)}
                    className="group flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 cursor-pointer transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white/80">{p.name}</span>
                      <span className="text-[8px] text-white/30">Stake: {p.stake} | Gale: {p.gale}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(
                            JSON.stringify(p, null, 2),
                            `bot-config-${p.name.replace(/\s+/g, '-').toLowerCase()}.json`,
                            'application/json'
                          );
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-500/20 rounded-md text-blue-400/50 hover:text-blue-400 transition-all"
                        title="Baixar Configuração"
                      >
                        <Download size={12} />
                      </button>
                      <button 
                        onClick={(e) => deleteProfile(p.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-md text-red-400/50 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                      <ChevronRight size={12} className="text-white/20" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/5 flex gap-2">
                <input 
                  type="text" 
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Nome do novo perfil..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none focus:border-[var(--color-accent)]/30 transition-all"
                />
                <button 
                  onClick={saveProfile}
                  disabled={!newProfileName.trim()}
                  className="px-3 py-2 bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/30 text-[var(--color-accent)] text-[10px] font-black rounded-lg border border-[var(--color-accent)]/30 transition-all disabled:opacity-20 flex items-center gap-2"
                >
                  <Save size={12} />
                  SALVAR
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className="bg-[#76D130]/10 border border-[#76D130]/20 rounded-xl p-2 text-center">
          <p className="text-[8px] font-bold text-[#76D130] uppercase mb-1">Wins</p>
          <p className="text-lg font-black text-[#76D130]">{stats.wins}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2 text-center">
          <p className="text-[8px] font-bold text-red-500 uppercase mb-1">Losses</p>
          <p className="text-lg font-black text-red-500">{stats.losses}</p>
        </div>
        <div className={`border rounded-xl p-2 text-center ${stats.profit >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
          <p className={`text-[8px] font-bold uppercase mb-1 ${stats.profit >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>Saldo</p>
          <p className={`text-lg font-black ${stats.profit >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {Number(stats.profit || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {isPaused && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
          <p className="text-[10px] text-red-400 font-bold">ALERTA: Limite Atingido!</p>
          <button onClick={resume} className="px-3 py-1 bg-red-500 text-white text-[9px] font-bold rounded-lg transform active:scale-95 transition-all">REINICIAR</button>
        </div>
      )}

      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 mb-2">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={12} className="text-blue-400" />
          <span className="text-[10px] font-bold text-blue-400 uppercase">Otimização IA</span>
        </div>
        <p className="text-[10px] text-white/50 leading-relaxed italic">
          "Otimização de Tendência Ativa: O robô agora valida se a porcentagem do dígito alvo está favorável (&gt;= 50%) antes de realizar a entrada, aumentando a assertividade."
        </p>
      </div>

      <div>
        <label className="text-[11px] font-bold text-white/80 block mb-2">Entrada</label>
        <input 
          type="text" 
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-blue-500/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-white/80 block mb-2">Qtd Gale's</label>
          <input 
            type="text" 
            value={galeQty}
            onChange={(e) => setGaleQty(e.target.value)}
            className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-white/80 block mb-2">Multiplicador Gale</label>
          <input 
            type="text" 
            value={gale}
            onChange={(e) => setGale(e.target.value)}
            className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-white/80 block mb-2">Valor Stop Loss</label>
          <input 
            type="text" 
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-white/80 block mb-2">Valor Stop Win</label>
          <input 
            type="text" 
            value={stopWin}
            onChange={(e) => setStopWin(e.target.value)}
            className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      <button 
        onClick={toggleBot}
        disabled={!account}
        className={`w-full py-3 rounded-lg font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg ${
          isActive 
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-900/20' 
            : 'bg-[#1e40af] hover:bg-blue-700 text-white shadow-blue-900/20'
        }`}
      >
        {isActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        {isActive ? 'PARAR ROBÔ' : 'INICIAR ROBÔ'}
      </button>

      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-[10px] font-bold"
          >
            <AlertCircle size={14} />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-black/40 border border-white/10 rounded-xl p-3 max-h-[200px] overflow-y-auto no-scrollbar">
        <h4 className="text-[10px] font-bold text-white/40 uppercase mb-2">Log de Atividades</h4>
        <div className="space-y-1">
          {logs.length === 0 && <p className="text-[10px] text-white/20 italic">Aguardando sinais...</p>}
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2 text-[10px]">
              <span className="text-white/20 font-mono">[{log.time}]</span>
              <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-[#76D130]' : 'text-white/60'}>
                {log.msg}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Code Modal */}
      <AnimatePresence>
        {showCodeModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[var(--color-bg-tertiary)] border border-white/10 rounded-[2rem] flex flex-col shadow-2xl overflow-hidden max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                    <Code2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tighter">Revisão de Código</h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">XML / JSON do Robô</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCodeModal(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-black/40">
                <pre className="text-[10px] font-mono text-white/60 leading-relaxed whitespace-pre-wrap break-all">
                  {codeToView}
                </pre>
              </div>
              
              <div className="p-4 border-t border-white/5 bg-[var(--color-bg-tertiary)] flex justify-end gap-3">
                <button 
                  onClick={() => setShowCodeModal(false)}
                  className="px-6 py-2.5 text-xs font-bold text-white/40 hover:text-white transition-all uppercase tracking-widest"
                >
                  Fechar
                </button>
                <button 
                  onClick={() => {
                    setShowCodeModal(false);
                    handleImportBot();
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-tighter"
                >
                  Confirmar Importação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DEFAULT_DERIV_TOKEN = 'pat_1b06e6bbe215d57536779feeba540c170075f9ec19e08df5108afb8cb0c20f9f';

const TokenLinkOverlay = ({ onConnect, onOpenRegister, onEnterDemoMode }: { onConnect: (token: string) => Promise<void>, onOpenRegister: () => void, onEnterDemoMode?: () => void }) => {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('deriv_api_token') || localStorage.getItem('deriv_token') || DEFAULT_DERIV_TOKEN;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorVisible, setErrorVisible] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [appId, setAppId] = useState(() => derivService.getAppId());
  const [isTesting, setIsTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  const { status: connStatus, isConnected } = useDerivConnection();

  useEffect(() => {
    const savedToken = localStorage.getItem('deriv_api_token') || localStorage.getItem('deriv_token') || DEFAULT_DERIV_TOKEN;
    if (savedToken) {
      setToken(savedToken);
      setIsSaved(true);
    }
  }, []);

  const handleSaveToken = () => {
    if (token.trim()) {
      localStorage.setItem('deriv_api_token', token.trim());
      localStorage.setItem('deriv_token', token.trim());
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleRestoreDefaultToken = () => {
    setToken(DEFAULT_DERIV_TOKEN);
    localStorage.setItem('deriv_api_token', DEFAULT_DERIV_TOKEN);
    localStorage.setItem('deriv_token', DEFAULT_DERIV_TOKEN);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAppIdSelect = (newId: string) => {
    setAppId(newId);
    derivService.setAppId(newId);
    setTestFeedback(`App ID alterado para ${newId}. Reconectando...`);
    setTimeout(() => setTestFeedback(null), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestFeedback(null);
    try {
      await derivService.connect();
      setTestFeedback('✓ Conectado aos servidores da Deriv com sucesso!');
    } catch (err: any) {
      setTestFeedback(`✗ ${err?.message || 'Falha na conexão'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) return;
    setLoading(true);
    setErrorVisible('');
    try {
      localStorage.setItem('deriv_api_token', cleanToken);
      localStorage.setItem('deriv_token', cleanToken);
      await onConnect(cleanToken);
    } catch (err: any) {
      setErrorVisible(err?.message || 'Token inválido ou expirado. Verifique as permissões de Leitura e Negociação na Deriv.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[var(--color-bg-primary)]/90 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md bg-[var(--color-bg-tertiary)] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden my-auto"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-accent)]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[var(--color-accent)] to-[#00A370] rounded-3xl flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/20 mb-4 sm:mb-6 rotate-3">
             <Cpu size={36} className="text-[var(--color-bg-primary)]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tighter mb-1.5 uppercase">Vincular Deriv</h2>
          <p className="text-[11px] sm:text-xs font-medium text-white/40 uppercase tracking-widest leading-relaxed mb-4">
            Insira o seu Token da Deriv para desbloquear o acesso total aos robôs e operações.
          </p>

          {/* Connection Status indicator */}
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4 text-[10px] font-mono">
            <div className={`w-2 h-2 rounded-full ${
              connStatus === ConnectionStatus.CONNECTED ? 'bg-[#00E69D] shadow-[0_0_8px_#00E69D]' :
              connStatus === ConnectionStatus.CONNECTING || connStatus === ConnectionStatus.RECONNECTING ? 'bg-amber-400 animate-ping' :
              'bg-red-500'
            }`} />
            <span className="text-white/70">
              {connStatus === ConnectionStatus.CONNECTED ? 'Servidor Deriv: Conectado' :
               connStatus === ConnectionStatus.CONNECTING ? 'Servidor Deriv: Conectando...' :
               connStatus === ConnectionStatus.RECONNECTING ? 'Servidor Deriv: Reconectando...' :
               'Servidor Deriv: Aguardando Conexão'}
            </span>
            <button 
              type="button" 
              onClick={handleTestConnection}
              disabled={isTesting}
              className="text-[9px] text-[var(--color-accent)] hover:underline ml-1 font-bold disabled:opacity-50"
            >
              {isTesting ? 'Testando...' : 'Reconectar'}
            </button>
          </div>

          {testFeedback && (
            <div className={`text-[10px] font-mono mb-3 px-3 py-1.5 rounded-lg border w-full text-left ${
              testFeedback.startsWith('✓') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              {testFeedback}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-3.5">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between ml-2 mr-1">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Token de Acesso Deriv</label>
                {token !== DEFAULT_DERIV_TOKEN && (
                  <button 
                    type="button" 
                    onClick={handleRestoreDefaultToken}
                    className="text-[9px] text-[var(--color-accent)] hover:underline uppercase font-bold"
                  >
                    Usar Token Configurado (pat_...)
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (isSaved) setIsSaved(false);
                  }}
                  placeholder="pat_... ou token de API da Deriv"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-4 sm:pl-5 pr-20 py-3.5 sm:py-4 text-xs font-mono text-[var(--color-accent)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all placeholder:text-white/20 select-all"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-white/30 hover:text-white/70 rounded-lg transition-colors"
                    title={showPassword ? "Ocultar Token" : "Mostrar Token"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveToken}
                    className={`p-1.5 rounded-lg transition-all ${isSaved ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'text-white/20 hover:text-white/60 hover:bg-white/5'}`}
                    title="Salvar Token"
                  >
                    {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                  </button>
                  <div className={`w-2 h-2 rounded-full ${token.length >= 8 ? 'bg-[var(--color-accent)]' : 'bg-white/10'}`} />
                </div>
              </div>
              <div className="flex justify-between items-center px-1 pt-1">
                <span className="text-[9px] text-white/40 font-medium">
                  {token.startsWith('pat_') ? '✓ Token Pessoal (PAT) detectado' : 'Compatível com tokens pat_... e API Tokens'}
                </span>
                <a 
                  href="https://app.deriv.com/account/api-token?lang=PT" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[9px] text-[var(--color-accent)]/70 hover:text-[var(--color-accent)] uppercase tracking-widest font-bold transition-colors"
                >
                  Obter token no Deriv
                </a>
              </div>
            </div>

            {/* Expandable Advanced Options (App ID) */}
            <div className="text-left border-t border-white/5 pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] text-white/40 hover:text-white/70 font-semibold flex items-center gap-1 py-1"
              >
                <span>⚙ Opções Avançadas (App ID: {appId})</span>
                <span className="text-[9px]">{showAdvanced ? '▲' : '▼'}</span>
              </button>

              {showAdvanced && (
                <div className="bg-black/30 border border-white/10 rounded-xl p-3 mt-1.5 space-y-2.5">
                  <div className="text-[9px] text-white/50 leading-relaxed">
                    Selecione um App ID da Deriv ou utilize o seu App ID registrado:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: '1089', label: '1089 (App ID de Teste)' },
                      { id: '01a14b32-5d76-7aab-97c5-8f62bd561632', label: 'App ID Registrado' },
                      { id: '62953', label: '62953 (Bot Oficial)' },
                      { id: '36544', label: '36544 (SmartTrader)' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAppIdSelect(item.id)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold transition-all ${
                          appId === item.id 
                            ? 'bg-[var(--color-accent)] text-black shadow-sm' 
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                        title={item.id}
                      >
                        {item.id.length > 10 ? `${item.id.slice(0, 8)}... (${item.label})` : item.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-[9px] text-white/40 font-medium">App ID Ativo (UUID ou Número):</span>
                    <input
                      type="text"
                      value={appId}
                      onChange={(e) => handleAppIdSelect(e.target.value)}
                      placeholder="Ex: 01a14b32-5d76-7aab-97c5-8f62bd561632"
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {errorVisible && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-left space-y-1.5"
              >
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold text-xs mt-0.5">⚠</span>
                  <div className="text-[10px] text-red-300 font-medium leading-relaxed">
                    {errorVisible}
                  </div>
                </div>
                <div className="text-[9px] text-white/40 pt-1 border-t border-red-500/10 flex justify-between items-center">
                  <span>Dica: Tente clicar em "Reconectar" ou trocar o App ID para 62953.</span>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    className="text-[var(--color-accent)] font-bold uppercase underline"
                  >
                    Testar
                  </button>
                </div>
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={loading || !token.trim()}
              className="w-full bg-[var(--color-accent)] hover:bg-[#00E69D] disabled:opacity-30 disabled:grayscale text-[var(--color-bg-primary)] font-black py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-[var(--color-accent)]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-tighter text-xs sm:text-sm cursor-pointer"
            >
              {loading ? <RefreshCcw size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
              {loading ? 'Vinculando com Deriv...' : 'Liberar e Conectar Sistema'}
            </button>

            {onEnterDemoMode && (
              <button 
                type="button"
                onClick={onEnterDemoMode}
                className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-tight text-xs cursor-pointer shadow-lg shadow-emerald-950/20"
              >
                <span>🧪</span>
                <span>Entrar em Modo Teste / Simulação (Sem App ID)</span>
              </button>
            )}
          </form>

          <div className="flex items-center gap-4 py-4">
            <div className="h-[1px] flex-1 bg-white/5" />
            <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">NÃO TEM CONTA?</span>
            <div className="h-[1px] flex-1 bg-white/5" />
          </div>

          <button 
            type="button"
            onClick={onOpenRegister}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-tighter text-sm mb-4"
          >
            Cadastrar na Corretora
          </button>

          <div className="mt-4 space-y-3">
             <div className="flex items-center gap-2 justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest">Conexão Segura SSL/WSS</p>
             </div>
             <p className="text-[9px] text-white/20 italic leading-snug max-w-[200px] mx-auto">
               Seus dados são processados localmente e nunca armazenados em nossos servidores.
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const RegisterModal = ({ isOpen, onClose, setNotifications }: { isOpen: boolean, onClose: () => void, setNotifications: React.Dispatch<React.SetStateAction<any[]>> }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [residence, setResidence] = useState('br');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyEmail, createVirtualAccount } = useDerivAuth();

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyEmail(email);
      setNotifications(prev => [{
        id: Date.now().toString(),
        msg: "Código de verificação enviado! Verifique sua caixa de entrada e spam.",
        time: new Date().toLocaleTimeString(),
        type: "success"
      }, ...prev]);
      setStep(2);
    } catch (err: any) {
      console.error('Deriv Registration Error:', err);
      setNotifications(prev => [{
        id: Date.now().toString(),
        msg: err.message || "Erro ao enviar email. Verifique se o App ID está correto.",
        time: new Date().toLocaleTimeString(),
        type: "error"
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createVirtualAccount({
        verification_code: verificationCode,
        client_password: password,
        residence,
        email
      });
      
      setNotifications(prev => [{
        id: Date.now().toString(),
        msg: "Conta criada com sucesso! Agora você pode se conectar.",
        time: new Date().toLocaleTimeString(),
        type: "success"
      }, ...prev]);
      
      onClose();
    } catch (err: any) {
      setNotifications(prev => [{
        id: Date.now().toString(),
        msg: err.message || "Erro ao criar conta. Verifique o código enviado ao seu email.",
        time: new Date().toLocaleTimeString(),
        type: "error"
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--color-bg-primary)] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">
              {step === 1 ? 'Criar Conta Gratuita' : 'Finalizar Cadastro'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X size={20} className="text-white/40" />
            </button>
          </div>
          
          {step === 1 ? (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Email</label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu melhor email..."
                  className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-all font-mono"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--color-accent)] hover:brightness-110 disabled:opacity-50 text-[var(--color-bg-primary)] font-black py-4 rounded-xl shadow-lg shadow-[var(--color-accent)]/20 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                {loading ? 'ENVIANDO...' : 'RECEBER CÓDIGO POR EMAIL'}
              </button>
              <p className="text-[9px] text-white/20 text-center uppercase tracking-widest font-bold">Respeitamos sua privacidade</p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Código Verificador (6 caracteres)</label>
                <input 
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Código enviado ao seu email..."
                  className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-all font-mono"
                  required
                />
                <p className="text-[9px] text-white/30 uppercase tracking-widest font-medium">Não recebeu? Verifique a pasta de SPAM.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Senha de Negociação</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres..."
                  className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">País</label>
                <select 
                  value={residence}
                  onChange={(e) => setResidence(e.target.value)}
                  className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                >
                  <option value="br">Brasil</option>
                  <option value="pt">Portugal</option>
                  <option value="ao">Angola</option>
                  <option value="mz">Moçambique</option>
                  <option value="cv">Cabo Verde</option>
                  <option value="gw">Guiné-Bissau</option>
                  <option value="st">São Tomé e Príncipe</option>
                  <option value="gq">Guiné Equatorial</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all text-xs"
                >
                  VOLTAR
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-[var(--color-accent)] hover:brightness-110 disabled:opacity-50 text-[var(--color-bg-primary)] font-black py-4 rounded-xl shadow-lg shadow-[var(--color-accent)]/20 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                >
                  {loading ? 'CRIANDO...' : 'CRIAR MINHA CONTA'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const LoginModal = ({ isOpen, onClose, onOpenRegister, setNotifications }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onOpenRegister: () => void,
  setNotifications: React.Dispatch<React.SetStateAction<any[]>> 
}) => {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('deriv_api_token') || localStorage.getItem('deriv_token') || DEFAULT_DERIV_TOKEN;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [appId, setAppId] = useState(() => derivService.getAppId());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { login, logining, error, loginDemoAccount } = useDerivAuth();

  useEffect(() => {
    if (isOpen) {
      const savedToken = localStorage.getItem('deriv_api_token') || localStorage.getItem('deriv_token') || DEFAULT_DERIV_TOKEN;
      if (savedToken) {
        setToken(savedToken);
        setIsSaved(true);
      }
    }
  }, [isOpen]);

  const handleSaveToken = () => {
    if (token.trim()) {
      localStorage.setItem('deriv_api_token', token.trim());
      localStorage.setItem('deriv_token', token.trim());
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleRestoreDefaultToken = () => {
    setToken(DEFAULT_DERIV_TOKEN);
    localStorage.setItem('deriv_api_token', DEFAULT_DERIV_TOKEN);
    localStorage.setItem('deriv_token', DEFAULT_DERIV_TOKEN);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = token.trim();
    
    if (!cleanToken) {
      setNotifications(prev => [{
        id: Date.now().toString(),
        msg: "Por favor, insira o seu Token da Deriv.",
        time: new Date().toLocaleTimeString(),
        type: "warning"
      }, ...prev]);
      return;
    }

    // Accepts Deriv tokens including Personal Access Tokens (pat_...)
    const tokenRegex = /^[a-zA-Z0-9_\-]{8,}$/;
    if (!tokenRegex.test(cleanToken)) {
      setNotifications(prev => [{
        id: Date.now().toString(),
        msg: "Formato de token inválido. O token da Deriv deve ter pelo menos 8 caracteres.",
        time: new Date().toLocaleTimeString(),
        type: "error"
      }, ...prev]);
      return;
    }

    try {
      localStorage.setItem('deriv_api_token', cleanToken);
      localStorage.setItem('deriv_token', cleanToken);
      await login(cleanToken);
      onClose();
    } catch (err) {
      // Error is handled by context
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--color-bg-primary)] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-white">Conectar Conta Deriv</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X size={20} className="text-white/40" />
            </button>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
             <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Token de Acesso Deriv</label>
                {token !== DEFAULT_DERIV_TOKEN && (
                  <button 
                    type="button" 
                    onClick={handleRestoreDefaultToken}
                    className="text-[9px] text-[var(--color-accent)] hover:underline uppercase font-bold"
                  >
                    Usar Token Configurado
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (isSaved) setIsSaved(false);
                  }}
                  placeholder="pat_... ou token da Deriv"
                  className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-xl pl-4 pr-20 py-3 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50 transition-all select-all"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-white/30 hover:text-white/70 rounded-lg transition-colors"
                    title={showPassword ? "Ocultar Token" : "Mostrar Token"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveToken}
                    className={`p-1.5 rounded-lg transition-all ${isSaved ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'text-white/20 hover:text-white/60 hover:bg-white/5'}`}
                    title="Salvar Token"
                  >
                    {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-white/40 italic">
                {token.startsWith('pat_') ? '✓ Token Pessoal Deriv (PAT) pronto para autenticação.' : 'Compatível com tokens pat_... e tokens de API da Deriv.'}
              </p>
            </div>

            {/* App ID Selector in LoginModal */}
            <div className="text-left border-t border-white/5 pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] text-white/40 hover:text-white/70 font-semibold flex items-center justify-between w-full py-1"
              >
                <span>⚙ App ID: <span className="text-[var(--color-accent)] font-mono">{appId.length > 10 ? `${appId.slice(0, 8)}...` : appId}</span></span>
                <span className="text-[9px]">{showAdvanced ? '▲ Fechar' : '▼ Alterar'}</span>
              </button>

              {showAdvanced && (
                <div className="bg-black/30 border border-white/10 rounded-xl p-3 mt-1.5 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: '1089', label: '1089 (App ID de Teste)' },
                      { id: '01a14b32-5d76-7aab-97c5-8f62bd561632', label: 'App ID Registrado' },
                      { id: '62953', label: '62953 (Oficial)' },
                      { id: '36544', label: '36544 (Bot)' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setAppId(item.id);
                          derivService.setAppId(item.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold transition-all ${
                          appId === item.id 
                            ? 'bg-[var(--color-accent)] text-black shadow-sm' 
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                        title={item.id}
                      >
                        {item.id.length > 10 ? `${item.id.slice(0, 8)}... (${item.label})` : item.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-[9px] text-white/40 font-medium">App ID Personalizado:</span>
                    <input
                      type="text"
                      value={appId}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setAppId(val);
                        derivService.setAppId(val);
                      }}
                      placeholder="01a14b32-5d76-7aab-97c5-8f62bd561632"
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-[11px] text-red-400 font-medium">{error}</p>
              </div>
            )}

            <div className="pt-2">
              <button 
                type="submit"
                disabled={logining}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {logining ? (
                  <>
                    <RefreshCcw size={18} className="animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    <ExternalLink size={18} />
                    Conectar Agora
                  </>
                )}
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  loginDemoAccount();
                  onClose();
                  setNotifications(prev => [{
                    id: Math.random().toString(),
                    msg: 'Modo de Teste / Demonstração ativado com sucesso!',
                    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    type: 'success'
                  }, ...prev]);
                }}
                className="w-full mt-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-xs"
              >
                <span>🧪</span>
                <span>Usar Conta Demo Simulada ($10,000 USD)</span>
              </button>
              
              <div className="mt-4 text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                  Não possui uma conta? {' '}
                  <button 
                    type="button"
                    onClick={() => {
                        onClose();
                        onOpenRegister();
                    }}
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    Criar conta gratuita
                  </button>
                </p>
              </div>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
            <p className="text-[11px] text-blue-400 leading-relaxed">
              <strong>Como obter o token?</strong><br />
              1. Acesse sua conta Deriv<br />
              2. Vá em Configurações &gt; Token de API<br />
              3. Crie um token com permissões de 'Leitura' e 'Negociação'.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const EditLinksModal = ({ 
  isOpen, 
  onClose, 
  instagram, 
  tiktok, 
  whatsapp, 
  suporte,
  onSave 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  instagram: string, 
  tiktok: string, 
  whatsapp: string, 
  suporte: string,
  onSave: (links: { instagram: string, tiktok: string, whatsapp: string, suporte: string }) => void 
}) => {
  const [inst, setInst] = useState(instagram);
  const [tik, setTik] = useState(tiktok);
  const [whats, setWhats] = useState(whatsapp);
  const [sup, setSup] = useState(suporte);

  useEffect(() => {
    if (isOpen) {
      setInst(instagram);
      setTik(tiktok);
      setWhats(whatsapp);
      setSup(suporte);
    }
  }, [isOpen, instagram, tiktok, whatsapp, suporte]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      instagram: inst.trim(),
      tiktok: tik.trim(),
      whatsapp: whats.trim(),
      suporte: sup.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--color-bg-primary)] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-white">Editar Links do Painel</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer">
              <X size={20} className="text-white/40" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Instagram size={14} className="text-[#E4405F]" />
                Instagram
              </label>
              <input 
                type="text"
                value={inst}
                onChange={(e) => setInst(e.target.value)}
                placeholder="https://instagram.com/seu_perfil"
                className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-accent)] transition-all"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Music2 size={14} className="text-[#FF0050]" />
                TikTok
              </label>
              <input 
                type="text"
                value={tik}
                onChange={(e) => setTik(e.target.value)}
                placeholder="https://tiktok.com/@seu_perfil"
                className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-accent)] transition-all"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <MessageCircle size={14} className="text-[#25D366]" />
                WhatsApp
              </label>
              <input 
                type="text"
                value={whats}
                onChange={(e) => setWhats(e.target.value)}
                placeholder="https://wa.me/55..."
                className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-accent)] transition-all"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <LifeBuoy size={14} className="text-indigo-400" />
                Suporte
              </label>
              <input 
                type="text"
                value={sup}
                onChange={(e) => setSup(e.target.value)}
                placeholder="http://t.me/... ou link suporte"
                className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-accent)] transition-all"
              />
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-1 bg-[var(--color-accent)] hover:brightness-110 text-[var(--color-bg-primary)] font-bold py-3 rounded-xl transition-all text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Salvar Links
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const CreateNotificationModal = ({
  isOpen,
  onClose,
  onSend
}: {
  isOpen: boolean,
  onClose: () => void,
  onSend: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
}) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const templates = [
    { text: '⚙️ Nova atualização disponível! Novas funções e desempenho aprimorados.', type: 'info' },
    { text: '🔥 Novo Bot Sniper liberado na aba Bots! Aproveite os lucros hoje.', type: 'success' },
    { text: '⚠️ Atenção: Mercado financeiro instável devido a notícias de impacto. Opere com cautela!', type: 'warning' },
    { text: '🚀 Servidor atualizado para Modo de Alto Desempenho e velocidade de ticks ultrarrápida.', type: 'success' },
    { text: '🛑 Aviso de Manutenção: Hoje às 23:59h faremos uma manutenção rápida programada.', type: 'error' }
  ];

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setType('info');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSend(message.trim(), type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--color-bg-primary)] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 text-yellow-400">
                <Bell size={20} />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-black text-white leading-tight">Enviar Novo Aviso</h2>
                <p className="text-xs text-white/40">Crie avisos instantâneos para os usuários</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer">
              <X size={20} className="text-white/40" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block">Mensagem do Aviso</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva a mensagem do anúncio aqui..."
                rows={4}
                required
                className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 focus:border-[var(--color-accent)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-white/20 resize-none font-medium"
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-1">Escolha o Tipo de Aviso</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setType('info')}
                  className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    type === 'info' 
                      ? 'bg-blue-500/15 border-blue-500 text-blue-400' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  Info (Azul)
                </button>
                <button
                  type="button"
                  onClick={() => setType('success')}
                  className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    type === 'success' 
                      ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)] text-[var(--color-accent)]' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                  Sucesso (Verde)
                </button>
                <button
                  type="button"
                  onClick={() => setType('warning')}
                  className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    type === 'warning' 
                      ? 'bg-yellow-500/15 border-yellow-500 text-yellow-400' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  Alerta (Amarelo)
                </button>
                <button
                  type="button"
                  onClick={() => setType('error')}
                  className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    type === 'error' 
                      ? 'bg-red-500/15 border-red-500 text-red-400' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Crítico (Vermelho)
                </button>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block font-sans">Templates Rápidos</label>
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar bg-black/30 p-2.5 rounded-xl border border-white/5">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setMessage(tpl.text);
                      setType(tpl.type as any);
                    }}
                    className="text-left text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 p-2.5 rounded-lg transition-all border border-transparent hover:border-white/5 break-words whitespace-normal leading-relaxed cursor-pointer"
                  >
                    {tpl.text}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-1 bg-yellow-500 hover:brightness-110 text-[var(--color-bg-primary)] font-black py-3.5 rounded-xl transition-all text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Enviar Aviso
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const TradingLifecycleStepper = ({ 
  isBotRunning, 
  status 
}: { 
  isBotRunning: boolean; 
  status: 'analyzing' | 'buying' | 'selling'; 
}) => {
  const isStep1Active = isBotRunning && status === 'analyzing';
  const isStep1Done = isBotRunning && (status === 'buying' || status === 'selling');

  const isStep2Active = isBotRunning && status === 'buying';
  const isStep2Done = isBotRunning && status === 'selling';

  const isStep3Active = isBotRunning && status === 'selling';

  return (
    <div className="bg-[#0b0f19]/90 border border-white/10 rounded-2xl p-2.5 sm:p-4 relative overflow-hidden backdrop-blur-md shadow-xl">
      {/* Background glow when running */}
      {isBotRunning && (
        <div className={`absolute top-0 right-1/4 w-40 h-20 blur-3xl opacity-20 pointer-events-none transition-all ${
          isStep3Active ? 'bg-amber-400' : isStep2Active ? 'bg-blue-400' : 'bg-[var(--color-accent)]'
        }`} />
      )}

      {/* Header status badge for clear sequence tracking */}
      <div className="flex items-center justify-between pb-2 mb-2 sm:pb-2.5 sm:mb-2.5 border-b border-white/5">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className={`w-2 h-2 rounded-full ${
            !isBotRunning 
              ? 'bg-white/20' 
              : isStep3Active 
                ? 'bg-amber-400 animate-ping' 
                : isStep2Active 
                  ? 'bg-blue-400 animate-ping' 
                  : 'bg-[var(--color-accent)] animate-pulse'
          }`} />
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white/50">
            Sequência Operacional
          </span>
        </div>
        <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider sm:tracking-widest px-2 py-0.5 rounded-full border ${
          !isBotRunning 
            ? 'bg-white/5 border-white/10 text-white/40' 
            : isStep3Active 
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse' 
              : isStep2Active 
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 animate-pulse' 
                : 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
        }`}>
          {!isBotRunning ? 'Aguardando Início' : isStep3Active ? '3. Vendendo • Verificando Ganhos' : isStep2Active ? '2. Comprando • Entrada Enviada' : '1. Analisando • Sinais de Mercado'}
        </span>
      </div>

      {/* 3 Step columns with connecting visual flow */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 relative items-stretch">
        {/* Step 1: Analisando */}
        <div className={`flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1.5 sm:gap-3 p-2 rounded-xl transition-all duration-300 relative ${
          isStep1Active 
            ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/40 shadow-[0_0_15px_rgba(0,209,143,0.15)]' 
            : isStep1Done 
              ? 'bg-emerald-500/5 border border-emerald-500/20 opacity-90' 
              : 'opacity-40 border border-white/5 bg-black/20'
        }`}>
          <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-all ${
            isStep1Done
              ? 'bg-[var(--color-accent)] text-black font-black shadow-[0_0_8px_var(--color-accent)]'
              : isStep1Active 
                ? 'bg-[var(--color-accent)]/20 border border-[var(--color-accent)] text-[var(--color-accent)] shadow-[0_0_10px_var(--color-accent)]' 
                : 'bg-white/5 border border-white/10 text-white/40'
          }`}>
            {isStep1Done ? (
              <CheckCircle2 size={15} className="text-black stroke-[3]" />
            ) : (
              <Activity size={15} className={isStep1Active ? 'animate-pulse text-[var(--color-accent)]' : ''} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-[10px] sm:text-xs font-bold leading-tight truncate ${isStep1Active ? 'text-[var(--color-accent)]' : isStep1Done ? 'text-white' : 'text-white/60'}`}>
              Analisando
            </span>
            <span className="text-[7px] sm:text-[9px] font-semibold text-white/40 uppercase tracking-tight leading-tight truncate">
              {isStep1Done ? 'Sinal ✓' : isStep1Active ? 'Buscando' : 'Sinais'}
            </span>
          </div>
        </div>

        {/* Step 2: Comprando */}
        <div className={`flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1.5 sm:gap-3 p-2 rounded-xl transition-all duration-300 relative ${
          isStep2Active 
            ? 'bg-blue-500/15 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.25)]' 
            : isStep2Done 
              ? 'bg-blue-500/5 border border-blue-500/20 opacity-90' 
              : 'opacity-40 border border-white/5 bg-black/20'
        }`}>
          <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-all ${
            isStep2Done
              ? 'bg-blue-400 text-black font-black shadow-[0_0_8px_rgba(59,130,246,0.6)]'
              : isStep2Active 
                ? 'bg-blue-500/25 border border-blue-400 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.6)]' 
                : 'bg-white/5 border border-white/10 text-white/40'
          }`}>
            {isStep2Done ? (
              <CheckCircle2 size={15} className="text-black stroke-[3]" />
            ) : (
              <Clock size={15} className={isStep2Active ? 'animate-spin-slow text-blue-300' : ''} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-[10px] sm:text-xs font-bold leading-tight truncate ${isStep2Active ? 'text-blue-400' : isStep2Done ? 'text-white' : 'text-white/60'}`}>
              Comprando
            </span>
            <span className="text-[7px] sm:text-[9px] font-semibold text-white/40 uppercase tracking-tight leading-tight truncate">
              {isStep2Done ? 'Aberta ✓' : isStep2Active ? 'Executando' : 'Entrada'}
            </span>
          </div>
        </div>

        {/* Step 3: Vendendo */}
        <div className={`flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1.5 sm:gap-3 p-2 rounded-xl transition-all duration-300 relative ${
          isStep3Active 
            ? 'bg-amber-500/15 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
            : 'opacity-40 border border-white/5 bg-black/20'
        }`}>
          <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-all ${
            isStep3Active 
              ? 'bg-amber-500/25 border border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.6)]' 
              : 'bg-white/5 border border-white/10 text-white/40'
          }`}>
            <DollarSign size={15} className={isStep3Active ? 'animate-bounce text-amber-300' : ''} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-[10px] sm:text-xs font-bold leading-tight truncate ${isStep3Active ? 'text-amber-400' : 'text-white/60'}`}>
              Vendendo
            </span>
            <span className="text-[7px] sm:text-[9px] font-semibold text-white/40 uppercase tracking-tight leading-tight truncate">
              {isStep3Active ? 'Verificando' : 'Ganhos'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const FOREX_SYMBOLS = [
  { id: 'R_10', name: 'Volatility 10', cat: 'Sintéticos' },
  { id: 'R_25', name: 'Volatility 25', cat: 'Sintéticos' },
  { id: 'R_50', name: 'Volatility 50', cat: 'Sintéticos' },
  { id: 'R_75', name: 'Volatility 75', cat: 'Sintéticos' },
  { id: 'R_100', name: 'Volatility 100', cat: 'Sintéticos' },
  { id: '1HZ10V', name: 'V10 (1s)', cat: 'Sintéticos' },
  { id: '1HZ25V', name: 'V25 (1s)', cat: 'Sintéticos' },
  { id: '1HZ50V', name: 'V50 (1s)', cat: 'Sintéticos' },
  { id: '1HZ75V', name: 'V75 (1s)', cat: 'Sintéticos' },
  { id: '1HZ100V', name: 'V100 (1s)', cat: 'Sintéticos' },
  { id: 'frxEURUSD', name: 'EUR/USD', cat: 'Forex' },
  { id: 'frxGBPUSD', name: 'GBP/USD', cat: 'Forex' },
  { id: 'frxUSDJPY', name: 'USD/JPY', cat: 'Forex' },
  { id: 'frxAUDUSD', name: 'AUD/USD', cat: 'Forex' },
  { id: 'BTCUSD', name: 'BTC/USD', cat: 'Cripto' },
  { id: 'ETHUSD', name: 'ETH/USD', cat: 'Cripto' },
];

const AssetSelector = ({ selectedId, onSelect }: { selectedId: string, onSelect: (id: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = FOREX_SYMBOLS.find(s => s.id === selectedId) || FOREX_SYMBOLS[0];
  const categories = Array.from(new Set(FOREX_SYMBOLS.map(s => s.cat)));

  return (
    <div className="relative w-full h-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-black/40 border border-white/5 px-4 h-full rounded-2xl hover:bg-white/10 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center border border-[var(--color-accent)]/20">
            <TrendingUp size={18} className="text-[var(--color-accent)]" />
          </div>
          <div className="text-left">
            <p className="text-[9px] text-white/30 uppercase font-black tracking-[0.2em] leading-none mb-1">{selected.cat}</p>
            <p className="text-sm font-black text-white tracking-widest leading-none">{selected.name}</p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-white/20 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[150]" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-bg-tertiary)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[160] max-h-[400px] overflow-y-auto custom-scrollbar"
            >
              {categories.map(cat => (
                <div key={cat} className="p-2">
                  <p className="px-3 py-1.5 text-[10px] font-black text-white/20 uppercase tracking-widest">{cat}</p>
                  <div className="grid grid-cols-1 gap-1">
                    {FOREX_SYMBOLS.filter(s => s.cat === cat).map(symbol => (
                      <button
                        key={symbol.id}
                        onClick={() => {
                          onSelect(symbol.id);
                          setIsOpen(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${selectedId === symbol.id ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                      >
                        <span className="text-xs font-bold font-mono">{symbol.name}</span>
                        {selectedId === symbol.id && <Check size={14} className="text-[var(--color-accent)]" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const BotSelector = ({ 
  selectedBot, 
  onSelect, 
  isOpen, 
  setIsOpen,
  bots
}: { 
  selectedBot: any, 
  onSelect: (id: string) => void, 
  isOpen: boolean, 
  setIsOpen: (open: boolean) => void,
  bots: any[]
}) => {
  return (
    <div className="flex items-center gap-2 sm:gap-3 w-full">
      <div className="p-2 sm:p-3 rounded-xl shrink-0" style={{ backgroundColor: `${selectedBot.color}15`, color: selectedBot.color }}>
        {React.isValidElement(selectedBot.icon) ? React.cloneElement(selectedBot.icon as any, { size: 24, className: 'sm:w-6 sm:h-6 w-5 h-5' }) : <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 max-w-full">
          <h2 className="font-bold text-sm sm:text-[16px] leading-tight truncate">{selectedBot.name}</h2>
          <div className="relative shrink-0 ml-1">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 bg-[#374151] hover:bg-[#4B5563] px-2 py-1.5 rounded-md text-[9px] sm:text-[10px] font-bold transition-all border border-white/5 shadow-sm active:scale-95"
            >
              <Settings size={12} />
              Trocar
            </button>

            <AnimatePresence>
              {isOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[140]" 
                    onClick={() => setIsOpen(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.9 }}
                    transition={{ 
                      type: 'spring', 
                      stiffness: 400, 
                      damping: 18,
                      mass: 0.8
                    }}
                    className="absolute right-0 top-full mt-2 w-[280px] sm:w-64 bg-[var(--color-bg-tertiary)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[150]"
                  >
                    <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      <p className="px-3 py-2 text-[9px] font-bold text-white/30 uppercase tracking-widest">Selecione o Robô</p>
                      {bots.map((bot) => (
                        <button
                          key={bot.id}
                          onClick={() => {
                            onSelect(bot.id);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${selectedBot.id === bot.id ? 'bg-white/5' : 'hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${bot.color}15`, color: bot.color }}>
                            {React.isValidElement(bot.icon) ? React.cloneElement(bot.icon as React.ReactElement, { size: 16 }) : <TrendingUp size={16} />}
                          </div>
                          <div className="flex flex-col items-start min-w-0 flex-1 text-left">
                            <span className="text-sm font-bold text-white truncate w-full">{bot.name}</span>
                            <span className="text-[10px] tracking-widest uppercase font-bold truncate w-full" style={{ color: bot.color }}>{bot.tag}</span>
                          </div>
                          {selectedBot.id === bot.id && <Check size={14} className="text-[var(--color-accent)] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase truncate mt-0.5" style={{ color: selectedBot.color }}>{selectedBot.tag}</div>
      </div>
    </div>
  );
};

const PredictionOverlay = ({ symbol }: { symbol: string }) => {
  const { candles } = useDerivCandles(symbol, 60);
  const [scanStatus, setScanStatus] = useState<'SCANNING' | 'READY'>('SCANNING');
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setScanStatus(scanStatus === 'SCANNING' ? 'READY' : 'SCANNING');
          return scanStatus === 'SCANNING' ? 15 : 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [scanStatus]);

  const analysis = React.useMemo(() => {
    if (candles.length < 40) return null;
    
    const prices = candles.map(c => c.close);
    const last = prices[prices.length - 1];
    
    // 1. Precise Indicator Calculation Helpers (Now using top-level helpers)
    
    // 2. Compute Indicators
    const ema12Arr = getEMA(prices, 12);
    const ema26Arr = getEMA(prices, 26);
    const macdLine = ema12Arr.map((v, i) => v - ema26Arr[i]);
    const signalLineArr = getEMA(macdLine, 9);
    
    const currentMACD = macdLine[macdLine.length - 1];
    const currentSignal = signalLineArr[signalLineArr.length - 1];
    const prevMACD = macdLine[macdLine.length - 2];
    const prevSignal = signalLineArr[signalLineArr.length - 2];
    const histogram = currentMACD - currentSignal;
    const prevHistogram = prevMACD - prevSignal;

    // Bollinger Bands (20, 2)
    const ma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const stdDev = Math.sqrt(prices.slice(-20).map(x => Math.pow(x - ma20, 2)).reduce((a, b) => a + b, 0) / 20);
    const upperBB = ma20 + (stdDev * 2.0); 
    const lowerBB = ma20 - (stdDev * 2.0);
    const bbRange = upperBB - lowerBB;

    const rsi = getRSI(prices, 14);
    const lastRsi = Array.isArray(rsi) ? rsi[rsi.length - 1] : rsi;
    const atrArr = getATR(candles, 14);
    const atr = atrArr[atrArr.length - 1] || (last * 0.001); // Fallback

    // Flow Analysis (Velocity & Acceleration)
    const last5 = prices.slice(-5);
    const prevLast5 = prices.slice(-10, -5);
    const velocity = (last5[4] - last5[0]) / last5[0] * 1000;
    const prevVelocity = (prevLast5[4] - prevLast5[0]) / prevLast5[0] * 1000;
    const acceleration = velocity - prevVelocity;
    
    // SIGNAL LOGIC (Enhanced Precision Matrix v6.5)
    const currentPrice = last;
    
    // 1. Price Action Refinement
    const candle = candles[candles.length - 1];
    const bodySize = Math.abs(candle.close - candle.open);
    const lowerWick = candle.open > candle.close ? candle.close - candle.low : candle.open - candle.low;
    const upperWick = candle.open > candle.close ? candle.high - candle.open : candle.high - candle.close;
    
    const isBullishRejection = lowerWick > bodySize * 1.5 && currentPrice < lowerBB * 1.001;
    const isBearishRejection = upperWick > bodySize * 1.5 && currentPrice > upperBB * 0.999;

    // 2. Momentum & Oscillator Confirmation
    const rsiVal = lastRsi;
    const prevRSI = Array.isArray(rsi) ? rsi[rsi.length - 2] : rsi;
    const rsiHookUp = (prevRSI < 35 && rsiVal > prevRSI + 0.3) || rsiVal < 25;
    const rsiHookDown = (prevRSI > 65 && rsiVal < prevRSI - 0.3) || rsiVal > 75;

    // 3. MACD Precision
    const macdSlope = histogram - prevHistogram;
    const isMacdStrong = Math.abs(macdSlope) > Math.abs(prevHistogram) * 0.12;
    const macdCross = (prevHistogram <= 0 && histogram > 0) || (prevHistogram >= 0 && histogram < 0);

    // 4. Integrated Confluence Logic
    const isBullishCore = (currentPrice <= lowerBB * 1.0003) || (rsiVal < 30);
    const isBullishConfirmation = (macdSlope > 0) && (velocity > 0.03) && (rsiHookUp || isBullishRejection || acceleration > 0);
    const isBullish = isBullishCore && isBullishConfirmation && (isMacdStrong || macdCross || velocity > 0.12);

    const isBearishCore = (currentPrice >= upperBB * 0.9997) || (rsiVal > 70);
    const isBearishConfirmation = (macdSlope < 0) && (velocity < -0.03) && (rsiHookDown || isBearishRejection || acceleration < 0);
    const isBearish = isBearishCore && isBearishConfirmation && (isMacdStrong || macdCross || velocity < -0.12);
    
    // FVG Detection for AI - Refined with ATR
    const c0 = candles[candles.length - 1]; 
    const c2 = candles[candles.length - 3]; 
    const gapSizeBull = c0.low - c2.high;
    const gapSizeBear = c2.low - c0.high;
    const minGap = atr * 0.15;
    
    const hasBullishFVG = gapSizeBull > minGap;
    const hasBearishFVG = gapSizeBear > minGap;
    
    // OB Detection for AI - Refined with ATR
    const strongMoveLimit = atr * 1.5;
    const prevCandle = candles[candles.length - 2];
    const currentMove = Math.abs(c0.close - c0.open);

    const isBullishOB = c0.close > prevCandle.high && currentMove > strongMoveLimit && prevCandle.close < prevCandle.open;
    const isBearishOB = c0.close < prevCandle.low && currentMove > strongMoveLimit && prevCandle.close > prevCandle.open;


    let signal = 'ANALISANDO FLUXO...';
    let confidence = 85.0;

    if (hasBullishFVG || isBullishOB) {
      signal = isBullishOB ? 'ZONA ORDER BLOCK (ALTISTA)' : 'FAIR VALUE GAP (DETECTOR)';
      confidence = 96.5 + (velocity > 0 ? velocity * 5 : 0);
    } else if (hasBearishFVG || isBearishOB) {
      signal = isBearishOB ? 'ZONA ORDER BLOCK (BAIXISTA)' : 'FAIR VALUE GAP (DETECTOR)';
      confidence = 96.5 + (velocity < 0 ? Math.abs(velocity) * 5 : 0);
    } else {
      if (last > upperBB) signal = 'BANDA SUPERIOR (ALVO)';
      else if (last < lowerBB) signal = 'BANDA INFERIOR (COMPLEMENTO)';
      else signal = 'AGUARDANDO ZONA DE PREÇO';
      confidence = 88.0 + (Math.abs(rsiVal - 50) / 2);
    }

    return { 
      signal, 
      rsi: Math.round(rsiVal), 
      macd: Number(currentMACD || 0).toFixed(5),
      bb: last > upperBB ? 'OVERBOUGHT' : last < lowerBB ? 'OVERSOLD' : 'STABLE',
      trend: last > ma20 ? 'ALTA' : last < ma20 ? 'BAIXA' : 'NEUTRO',
      confidence: Math.min(99.9, Math.round(confidence * 10) / 10),
      isActionable: isBullishOB || isBearishOB || hasBullishFVG || hasBearishFVG
    };
  }, [candles]);

  if (!analysis) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--color-bg-primary)]/40 backdrop-blur-xl border border-white/5 p-2 px-3 sm:px-6 rounded-xl sm:rounded-full shadow-lg flex items-center justify-between gap-3 sm:gap-10 group relative overflow-hidden"
    >
      {/* Precision Mini Label */}
      <div className="hidden sm:flex items-center gap-2 border-r border-white/10 pr-4 mr-2">
        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${scanStatus === 'SCANNING' ? 'bg-blue-400' : 'bg-[var(--color-accent)]'}`} />
        <span className="text-[7px] sm:text-[9px] font-black text-white/30 uppercase tracking-[0.2em] whitespace-nowrap">
          v5.0 PRO
        </span>
      </div>

      <div className="flex items-center flex-1 gap-3 sm:gap-6">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-1000 shrink-0 ${scanStatus === 'SCANNING' ? 'bg-white/5 rotate-180 border border-white/5' : ((analysis.signal.includes('ORDER') || analysis.signal.includes('GAP')) ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] shadow-[0_0_20px_rgba(0,209,143,0.1)]' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20')}`}>
          {scanStatus === 'SCANNING' ? (
            <RefreshCcw size={16} className="text-white/40 animate-spin" />
          ) : (
            <div className="animate-bounce">
              {(analysis.signal.includes('ORDER') || analysis.signal.includes('GAP')) ? (
                <Target size={20} strokeWidth={3} />
              ) : (
                <Activity size={16} className="opacity-50" />
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm sm:text-lg font-black italic tracking-tighter truncate ${(analysis.signal.includes('ORDER') || analysis.signal.includes('GAP')) ? 'text-[var(--color-accent)]' : 'text-blue-400'}`}>
              {analysis.signal}
            </h4>
            {scanStatus === 'READY' && (analysis.signal.includes('ORDER') || analysis.signal.includes('GAP')) && (
              <span className="text-[7px] sm:text-[8px] font-black uppercase text-white/40 tracking-widest bg-white/5 px-1.5 py-0.5 rounded">99.9% ACC</span>
            )}
          </div>
          
          <div className="flex items-center gap-3 flex-1 max-w-[200px]">
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: scanStatus === 'READY' ? `${analysis.confidence}%` : '0%' }}
                 className={`h-full rounded-full ${analysis.confidence > 95 ? 'bg-[var(--color-accent)]' : 'bg-blue-500'}`}
               />
            </div>
            <span className={`text-[10px] font-mono font-black tabular-nums transition-colors ${analysis.confidence > 90 ? 'text-[var(--color-accent)]' : 'text-white/40'}`}>
              {scanStatus === 'SCANNING' ? '--.-%' : `${analysis.confidence}%`}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 border-l border-white/10 pl-3 sm:pl-6 ml-1 sm:ml-4">
        <span className="text-[7px] sm:text-[8px] font-black text-white/20 uppercase tracking-widest leading-none">Próximo</span>
        <span className="text-[10px] sm:text-xs font-mono font-black text-blue-400 tabular-nums">
          {countdown}s
        </span>
      </div>
    </motion.div>
  );
};

const DerivCandleChart = ({ symbol }: { symbol: string }) => {
  return (
    <div className="w-full h-[520px] bg-[var(--color-bg-primary)] overflow-hidden rounded-2xl relative shadow-2xl border border-white/5">
      <TechnicalChart symbol={symbol} />
    </div>
  );
};

// Account Block Overlay Component for Expired Users
const AccountBlockedOverlay = ({ client, plan, onBypass }: { client: any, plan: any, onBypass?: () => void }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[var(--color-bg-primary)]/90 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-[var(--color-bg-secondary)]/90 border-2 border-red-500/30 rounded-3xl p-8 text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] border-white/10 animate-fade-in"
      >
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 animate-pulse border border-red-500/20">
          <ShieldAlert size={36} />
        </div>
        
        <div className="space-y-2">
          <span className="text-[9px] font-black tracking-widest text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full uppercase border border-red-500/10">Acesso Suspenso</span>
          <h2 className="text-xl font-black text-white px-2">Assinatura Expirada</h2>
          <p className="text-[11px] text-white/60 max-w-sm mx-auto leading-relaxed">
            Olá, <strong className="text-white font-bold">{client.name}</strong>. Sua assinatura do <strong className="text-[var(--color-accent)]">{plan?.name || 'Acesso SmartiDigitos'}</strong> expirou e o acesso das suas contas foi suspenso.
          </p>
        </div>

        <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-left space-y-1.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-white/40">Plano contratado:</span>
            <span className="text-white font-bold">{plan?.name || 'Plano de Acesso'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Valor Renovação:</span>
            <span className="text-[var(--color-accent)] font-bold">R$ {plan?.value?.toFixed(2) || '97.00'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Data do Vencimento:</span>
            <span className="text-red-400 font-bold">{new Date(client.expirationDate).toLocaleDateString()}</span>
          </div>
        </div>

        <p className="text-[11px] text-white/50 leading-relaxed">
          Para renovar ou regularizar seu plano e reativar suas operações instantaneamente, por favor, entre em contato através do botão abaixo.
        </p>

        <div className="flex flex-col gap-2.5">
          <a
            href={`https://wa.me/55${client.whatsapp}?text=Ol%C3%A1%21%20Eu%20sou%20o%20${client.name}%20e%20gostaria%20de%20renovar%20meu%20plano%20do%20SmartiDigitos%20para%20desbloquear%20minhas%20opera%C3%A7%C3%B5es.`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-black font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg active:scale-[0.98]"
          >
            <MessageCircle size={16} />
            Regularizar Assinatura
          </a>
          
          {onBypass && (
            <button
              onClick={onBypass}
              className="text-[10px] text-white/30 hover:text-white transition-all underline cursor-pointer h-8"
            >
              Liberar Painel (Bypass Admin)
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

interface Client {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  password?: string;
  avatar?: string;
  planId: string;
  expirationDate: string;
  modules?: {
    smartDigitos: boolean;
    forex: boolean;
    double: boolean;
  };
}

interface Plan {
  id: string;
  name: string;
  value: number;
  days: number;
}

const ManagementView = ({
  clients,
  plans,
  simulatedBlockedClient,
  setSimulatedBlockedClient,
  addNotification,
  upsertClient,
  removeClient,
  upsertPlan,
  removePlan,
  fbUser,
  forceTab
}: {
  clients: Client[],
  plans: Plan[],
  simulatedBlockedClient: string | null,
  setSimulatedBlockedClient: (id: string | null) => void,
  addNotification: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void,
  upsertClient: (client: any) => Promise<void>,
  removeClient: (id: string) => Promise<void>,
  upsertPlan: (plan: any) => Promise<void>,
  removePlan: (id: string) => Promise<void>,
  fbUser?: any,
  forceTab?: 'crm' | 'simulation'
}) => {
  const [activeTab, setActiveTab] = useState<'simulation' | 'crm'>(forceTab || 'crm');

  useEffect(() => {
    if (forceTab) {
      setActiveTab(forceTab);
    }
  }, [forceTab]);

  const [initialCapital, setInitialCapital] = useState(100);
  const [dailyGoalPercent, setDailyGoalPercent] = useState(3);
  const [days, setDays] = useState(30);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Inline forms toggles
  const [showClientForm, setShowClientForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Client form states
  const [cName, setCName] = useState('');
  const [cCEmail, setCCEmail] = useState('');
  const [cWhatsapp, setCWhatsapp] = useState('');
  const [cPlanId, setCPlanId] = useState('');
  const [cExpDate, setCExpDate] = useState('');
  const [cAvatar, setCAvatar] = useState('👤');
  const [cPassword, setCPassword] = useState('');
  const [cModules, setCModules] = useState({
    smartDigitos: true,
    forex: true,
    double: true
  });

  // Plan form states
  const [pName, setPName] = useState('');
  const [pValue, setPValue] = useState('');
  const [pDays, setPDays] = useState('30');

  // Utility to count days remaining (timezone-safe, comparing purely day/month/year)
  const getDaysRemainingLocal = (expDateStr: string) => {
    return getDaysRemaining(expDateStr);
  };

  // Pre-load default values when editing a client
  const handleEditClick = (client: Client) => {
    setEditingClientId(client.id);
    setCName(client.name);
    setCCEmail(client.email);
    setCWhatsapp(client.whatsapp);
    setCPlanId(client.planId);
    setCExpDate(client.expirationDate);
    setCAvatar(client.avatar || '👤');
    setCPassword(client.password || '');
    setCModules(client.modules || { smartDigitos: true, forex: true, double: true });
    setShowClientForm(true);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Expiration calculation on plan changes
  useEffect(() => {
    if (cPlanId && !editingClientId) {
      const selectedPlan = plans.find(p => p.id === cPlanId);
      if (selectedPlan) {
        const today = new Date();
        today.setDate(today.getDate() + Number(selectedPlan.days));
        setCExpDate(today.toISOString().split('T')[0]);
      }
    }
  }, [cPlanId, plans, editingClientId]);

  // Handle Client form submission
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cCEmail || !cPlanId || !cExpDate) {
      addNotification("Por favor, preencha todos os campos obrigatórios!", "warning");
      return;
    }

    // Clean whatsapp formatting (digits only)
    const formattedWhatsapp = cWhatsapp.replace(/\D/g, '');

    if (editingClientId) {
      await upsertClient({
        id: editingClientId,
        name: cName,
        email: cCEmail,
        whatsapp: formattedWhatsapp,
        planId: cPlanId,
        expirationDate: cExpDate,
        avatar: cAvatar,
        password: cPassword,
        modules: cModules
      });
      addNotification(`Cliente "${cName}" editado com sucesso!`, "success");
      setEditingClientId(null);
    } else {
      await upsertClient({
        id: `c-${Date.now()}`,
        name: cName,
        email: cCEmail,
        whatsapp: formattedWhatsapp,
        planId: cPlanId,
        expirationDate: cExpDate,
        avatar: cAvatar,
        password: cPassword,
        modules: cModules
      });
      addNotification(`Cliente "${cName}" cadastrado com sucesso!`, "success");
    }

    // Clean client states
    setCName('');
    setCCEmail('');
    setCWhatsapp('');
    setCPlanId('');
    setCExpDate('');
    setCAvatar('👤');
    setCPassword('');
    setCModules({ smartDigitos: true, forex: true, double: true });
    setShowClientForm(false);
  };

  // Handle Plan form submission
  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pValue || !pDays) {
      addNotification("Por favor, preencha todos os campos obrigatórios do plano!", "warning");
      return;
    }

    await upsertPlan({
      id: `p-${Date.now()}`,
      name: pName,
      price: parseFloat(pValue),
      periodDays: parseInt(pDays, 10),
      status: 'active'
    });
    addNotification(`Plano "${pName}" cadastrado com sucesso!`, "success");

    setPName('');
    setPValue('');
    setPDays('30');
    setShowPlanForm(false);
  };

  // Delete client helper
  const handleDeleteClient = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o cliente "${name}"?`)) {
      await removeClient(id);
      if (simulatedBlockedClient === id) {
        setSimulatedBlockedClient(null);
      }
      addNotification(`Cliente "${name}" removido com sucesso.`, "success");
    }
  };

  // Delete plan helper
  const handleDeletePlan = async (id: string, name: string) => {
    const clientsWithPlan = clients.filter(c => c.planId === id);
    if (clientsWithPlan.length > 0) {
      alert(`Não é possível excluir o plano "${name}" porque há ${clientsWithPlan.length} cliente(s) vinculados a ele.`);
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o plano "${name}"?`)) {
      await removePlan(id);
      addNotification(`Plano "${name}" excluído.`, "success");
    }
  };

  // Filter clients based on search input
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || 
           c.email.toLowerCase().includes(term) || 
           c.whatsapp.includes(term);
  });

  // Calculate stats for KPIs
  const totalClientsCount = clients.length;
  const activeClientsCount = clients.filter(c => getDaysRemainingLocal(c.expirationDate) > 3).length;
  const nearExpiryCount = clients.filter(c => {
    const days = getDaysRemainingLocal(c.expirationDate);
    return days > 0 && days <= 3;
  }).length;
  const expiredCount = clients.filter(c => getDaysRemainingLocal(c.expirationDate) <= 0).length;

  const calculateTable = () => {
    const data = [];
    let currentCapital = initialCapital;
    for (let i = 1; i <= days; i++) {
      const dailyProfit = currentCapital * (dailyGoalPercent / 100);
      const total = currentCapital + dailyProfit;
      data.push({
        day: i,
        capital: Number(currentCapital || 0).toFixed(2),
        profit: Number(dailyProfit || 0).toFixed(2),
        total: Number(total || 0).toFixed(2)
      });
      currentCapital = total;
    }
    return data;
  };

  const tableData = calculateTable();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Top Header tab selectors */}
        {!forceTab && (
          <div className="flex bg-[var(--color-bg-tertiary)]/80 p-1.5 border border-white/5 rounded-2xl w-full sm:w-fit gap-1">
            <button
              onClick={() => setActiveTab('crm')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase transition-all tracking-wider ${activeTab === 'crm' ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              <Users size={14} />
              Clientes & Planos
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase transition-all tracking-wider ${activeTab === 'simulation' ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              <Calculator size={14} />
              Simulação de Metas
            </button>
          </div>
        )}

        {/* Profile Card */}
        {fbUser ? (
          <div className="flex items-center gap-3 bg-[var(--color-bg-secondary)] border border-white/5 px-4 py-2 rounded-2xl w-full sm:w-auto self-start sm:self-auto shadow-sm">
             {fbUser.photoURL ? (
                <img src={fbUser.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[var(--color-accent)]/20" referrerPolicy="no-referrer" />
             ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center font-bold text-lg border border-[var(--color-accent)]/20">
                  {fbUser.email?.charAt(0).toUpperCase() || 'A'}
                </div>
             )}
             <div className="flex flex-col">
               <span className="text-[10px] uppercase font-black tracking-widest text-[var(--color-accent)]">Admin Sincronizado</span>
               <span className="text-xs font-bold text-white truncate max-w-[150px]">{fbUser.email}</span>
             </div>
          </div>
        ) : (
           <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-2xl w-full sm:w-auto self-start sm:self-auto">
             <div className="flex flex-col">
               <span className="text-[10px] uppercase font-black tracking-widest text-red-400">Banco de Dados Offline</span>
               <span className="text-[10px] font-bold text-white/60 max-w-[180px]">Faça login no menu de conta para sincronizar dados e fotos na nuvem.</span>
             </div>
           </div>
        )}
      </div>

      {activeTab === 'crm' ? (
        <div className="space-y-6">
          {/* Bento Stats KPIs bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--color-bg-secondary)]/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-white/40 uppercase text-[9px] font-black tracking-widest mb-2">Total Clientes</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-mono font-black text-white">{totalClientsCount}</span>
                <span className="text-[9px] font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1.5 py-0.5 rounded-lg border border-[var(--color-accent)]/10">Geral</span>
              </div>
            </div>

            <div className="bg-[var(--color-bg-secondary)]/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-white/40 uppercase text-[9px] font-black tracking-widest mb-2">Ativos</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-mono font-black text-[var(--color-accent)]">{activeClientsCount}</span>
                <span className="text-[9px] font-bold text-[var(--color-accent)]/70 bg-[var(--color-accent)]/5 px-1.5 py-0.5 rounded-lg">Acesso OK</span>
              </div>
            </div>

            <div className="bg-[var(--color-bg-secondary)]/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-white/40 uppercase text-[9px] font-black tracking-widest mb-2">A Vencer (≤3 d)</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-mono font-black text-amber-500">{nearExpiryCount}</span>
                <span className="text-[9px] font-bold text-amber-500/70 bg-amber-500/5 px-1.5 py-0.5 rounded-lg">Crítico</span>
              </div>
            </div>

            <div className="bg-[var(--color-bg-secondary)]/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-white/40 uppercase text-[9px] font-black tracking-widest mb-2">Bloqueados</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-mono font-black text-red-500">{expiredCount}</span>
                <span className="text-[9px] font-bold text-red-500/70 bg-red-500/5 px-1.5 py-0.5 rounded-lg">Bloqueados</span>
              </div>
            </div>
          </div>

          {/* CRM Action Buttons panels & Add collapsibles */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setShowClientForm(!showClientForm);
                setEditingClientId(null);
                setCName('');
                setCCEmail('');
                setCWhatsapp('');
                setCPlanId('');
                setCAvatar('👤');
              }}
              className="flex items-center gap-2 bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-bold text-xs uppercase px-4 py-3 rounded-xl border border-[var(--color-accent)]/20 transition-all cursor-pointer"
            >
              <UserPlus size={14} />
              {showClientForm && !editingClientId ? 'Fechar Cadastro' : 'Cadastrar Novo Cliente'}
            </button>

            <button
              onClick={() => setShowPlanForm(!showPlanForm)}
              className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs uppercase px-4 py-3 rounded-xl border border-blue-500/20 transition-all cursor-pointer"
            >
              <CreditCard size={14} />
              {showPlanForm ? 'Fechar Planos' : 'Adicionar Novo Plano'}
            </button>
          </div>

          <AnimatePresence>
            {/* COLLAPSIBLE CLIENT FORM */}
            {showClientForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[var(--color-bg-secondary)]/40 border border-white/10 rounded-2xl p-5 overflow-hidden shadow-xl"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-lg">
                    <UserPlus size={16} />
                  </div>
                  <h3 className="font-bold text-sm uppercase text-white">
                    {editingClientId ? 'Editar Cadastro de Cliente' : 'Cadastrar Novo Cliente'}
                  </h3>
                </div>

                <form onSubmit={handleClientSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-white/40 tracking-wider">Nome Completo *</label>
                    <input
                      type="text"
                      value={cName}
                      onChange={e => setCName(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[var(--color-accent)] focus:outline-none"
                      placeholder="Ex: Carlos Oliveira"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-white/40 tracking-wider">E-mail Cadastrado (Deriv) *</label>
                    <input
                      type="email"
                      value={cCEmail}
                      onChange={e => setCCEmail(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[var(--color-accent)] focus:outline-none"
                      placeholder="Ex: carlos@email.com ou loginID"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-white/40 tracking-wider">WhatsApp (com DDD) *</label>
                    <input
                      type="text"
                      value={cWhatsapp}
                      onChange={e => setCWhatsapp(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[var(--color-accent)] focus:outline-none"
                      placeholder="Ex: 11999998888"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:col-span-2 lg:col-span-1">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-white/40 tracking-wider">Foto/Ícone Perfil</label>
                      <select
                        value={(cAvatar?.startsWith('data:') || cAvatar?.startsWith('http')) ? "custom" : cAvatar}
                        onChange={e => {
                          if (e.target.value !== 'custom') setCAvatar(e.target.value);
                        }}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[var(--color-accent)] focus:outline-none cursor-pointer"
                      >
                        <option value="custom">-- Imagem Própria --</option>
                        <option value="👤">👤 Padrão Gray</option>
                        <option value="🦁">🦁 Leão de Ouro</option>
                        <option value="🤖">🤖 Bot Operador</option>
                        <option value="⚡">⚡ Chapa Rápido</option>
                        <option value="🔥">🔥 Fogo Azul</option>
                        <option value="⭐">⭐ Estrela VIP</option>
                        <option value="👑">👑 Premium King</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-white/40 tracking-wider font-bold text-[var(--color-accent)]">Plano Contratado *</label>
                      <select
                        value={cPlanId}
                        onChange={e => setCPlanId(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-[var(--color-accent)] font-bold focus:border-[var(--color-accent)] focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Escolher plano --</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (R$ {Number(p.value || 0).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-white/40 tracking-wider">A Vencer *</label>
                    <input
                      type="date"
                      value={cExpDate}
                      onChange={e => setCExpDate(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[var(--color-accent)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-white/40 tracking-wider">Senha de Acesso</label>
                    <input
                      type="text"
                      value={cPassword}
                      onChange={e => setCPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[var(--color-accent)] focus:outline-none"
                      placeholder="Senha (deixe em branco para manter)"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3 space-y-2 mt-2 border-t border-white/5 pt-4">
                    <label className="text-[10px] uppercase font-black text-white/40 tracking-wider">Módulos Liberados</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={cModules.smartDigitos} onChange={e => setCModules({...cModules, smartDigitos: e.target.checked})} className="accent-[var(--color-accent)]" />
                        <span className="text-xs font-bold">Módulo Smart Digitos</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={cModules.forex} onChange={e => setCModules({...cModules, forex: e.target.checked})} className="accent-[var(--color-accent)]" />
                        <span className="text-xs font-bold">Módulo Forex / Índice</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={cModules.double} onChange={e => setCModules({...cModules, double: e.target.checked})} className="accent-[var(--color-accent)]" />
                        <span className="text-xs font-bold">Módulo Double</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-end gap-2 mt-2 md:col-span-2 lg:col-span-3">
                    <button
                      type="submit"
                      className="bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:brightness-110 font-black text-xs uppercase px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      {editingClientId ? 'Salvar Edições' : 'Efetivar Cadastro'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowClientForm(false);
                        setEditingClientId(null);
                      }}
                      className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* COLLAPSIBLE PLAN FORM */}
            {showPlanForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[var(--color-bg-secondary)]/40 border border-white/10 rounded-2xl p-5 overflow-hidden shadow-xl"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                    <CreditCard size={16} />
                  </div>
                  <h3 className="font-bold text-sm uppercase text-white">Adicionar Novo Plano</h3>
                </div>

                <form onSubmit={handlePlanSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-white/40 tracking-wider">Nome do Plano *</label>
                    <input
                      type="text"
                      value={pName}
                      onChange={e => setPName(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                      placeholder="Ex: Plano Master Vip"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-white/40 tracking-wider">Valor Mensalidade (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pValue}
                      onChange={e => setPValue(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                      placeholder="Ex: 97.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-white/40 tracking-wider">Tempo de Validade (Dias) *</label>
                    <input
                      type="number"
                      value={pDays}
                      onChange={e => setPDays(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                      placeholder="Ex: 30"
                    />
                  </div>

                  <div className="flex items-end gap-2 mt-2 sm:col-span-3">
                    <button
                      type="submit"
                      className="bg-blue-500 text-white hover:brightness-110 font-black text-xs uppercase px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Salvar Plano
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPlanForm(false)}
                      className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>

                {/* Displaying Current Registered Plans */}
                <div className="mt-6 border-t border-white/5 pt-4">
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest block mb-3">Planos Ativos Cadastrados</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {plans.map(p => (
                      <div key={p.id} className="bg-black/20 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-white">{p.name}</p>
                          <p className="text-[10px] font-mono text-white/40">
                            R$ {Number(p.value || 0).toFixed(2)} <span className="text-[var(--color-accent)] ml-1">({p.days} Dias)</span>
                          </p>
                        </div>
                        {/* Protect core initial profiles */}
                        {p.id !== 'p1' && p.id !== 'p2' && p.id !== 'p3' ? (
                          <button
                            onClick={() => handleDeletePlan(p.id, p.name)}
                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : (
                          <span className="text-[8px] font-black uppercase text-white/20 bg-white/5 px-1 rounded">Core</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SEARCH & SYSTEM CONTROLS BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--color-bg-tertiary)]/40 border border-white/5 rounded-2xl p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/50 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/20 focus:border-[var(--color-accent)] focus:outline-none"
                placeholder="Pesquisar por nome, e-mail, WhatsApp..."
              />
            </div>
            
            {simulatedBlockedClient && (
              <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/20 px-3 py-1.5 rounded-xl shrink-0">
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-tight">Bloqueio Ativo de Teste</span>
                <button
                  onClick={() => setSimulatedBlockedClient(null)}
                  className="bg-red-500 hover:bg-red-600 text-white font-black text-[9px] uppercase px-1.5 py-0.5 rounded cursor-pointer leading-none"
                >
                  Sair
                </button>
              </div>
            )}
          </div>

          {/* MAIN CLIENT LIST */}
          <div className="space-y-3">
            {filteredClients.length > 0 ? (
              filteredClients.map(client => {
                const planDetail = plans.find(p => p.id === client.planId);
                const daysRemaining = getDaysRemainingLocal(client.expirationDate);
                
                // Active, Warning, or Expired Badge styling
                let statusBadge = (
                  <span className="inline-flex items-center bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full">
                    Ativo ({daysRemaining} dias)
                  </span>
                );
                
                if (daysRemaining <= 0) {
                  statusBadge = (
                    <span className="inline-flex items-center bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full animate-pulse">
                      Bloqueado
                    </span>
                  );
                } else if (daysRemaining > 0 && daysRemaining <= 3) {
                  statusBadge = (
                    <span className="inline-flex items-center bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full">
                      Vence em {daysRemaining} d
                    </span>
                  );
                }

                return (
                  <div 
                    key={client.id}
                    className="p-4 bg-[var(--color-bg-secondary)]/30 border border-white/5 rounded-2xl hover:bg-[var(--color-bg-secondary)]/45 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Avatar preview */}
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold shrink-0 shadow-inner overflow-hidden relative">
                         {(client.avatar?.startsWith('data:') || client.avatar?.startsWith('http')) ? (
                           <img src={client.avatar} alt="Avatar" className="w-full h-full object-cover" />
                         ) : (
                           client.avatar || '👤'
                         )}
                      </div>
                      
                      {/* Grid for desktop layout */}
                      <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-white truncate leading-tight">{client.name}</h4>
                          <p className="text-[10px] font-mono text-white/30 truncate mt-0.5">{client.email}</p>
                        </div>

                        <div className="text-[11px] leading-tight flex md:flex-col items-center md:items-start justify-between md:justify-center border-t border-b border-white/5 md:border-none py-1 md:py-0">
                          <span className="text-white/40 font-bold uppercase text-[8px] tracking-wider md:mb-0.5">Contrato:</span>
                          <div>
                            <span className="text-white font-black mr-2 md:mr-0 md:block">{planDetail?.name || 'Acesso Livre'}</span>
                            <span className="text-[var(--color-accent)] font-black font-mono text-[10px]">R$ {planDetail?.value?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>

                        <div className="text-[11px] leading-tight flex items-center justify-between md:flex-row md:items-center md:justify-start gap-3">
                          <div className="flex md:flex-col items-center md:items-start select-none">
                            <span className="text-white/40 font-bold uppercase text-[8px] tracking-wider md:mb-0.5 mr-1 md:mr-0">Expiração:</span>
                            <span className={`font-black font-mono text-[11px] ${daysRemaining <= 0 ? 'text-red-400' : 'text-white/70'}`}>
                              {new Date(client.expirationDate).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div>
                            {statusBadge}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compact actions button bar */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 lg:pt-0 border-t border-white/5 lg:border-none lg:shrink-0 justify-end">
                      <button
                        onClick={() => handleEditClick(client)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 hover:text-white text-white/75 border border-white/5 rounded-xl font-bold text-[10px] uppercase tracking-wide cursor-pointer transition-all"
                        title="Editar"
                      >
                        <Pencil size={11} />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-red-500/10 rounded-xl font-bold text-[10px] uppercase tracking-wide cursor-pointer transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={11} />
                        <span>Excluir</span>
                      </button>

                      <button
                        onClick={async () => {
                          if (simulatedBlockedClient === client.id) {
                            setSimulatedBlockedClient(null);
                            addNotification(`Simulação de bloqueio para ${client.name} desativada.`, "info");
                          } else {
                            // Can only simulate expired client blocking!
                            if (daysRemaining > 0) {
                              if (confirm(`Este cliente (${client.name}) está ativo atualmente. Deseja definir temporariamente sua expiração para ontem para que você possa simular o bloqueio de conta dele?`)) {
                                const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                                await upsertClient({ ...client, expirationDate: yesterdayStr });
                                setSimulatedBlockedClient(client.id);
                                addNotification(`Status alterado para vencido. Bloqueio ativado para ${client.name}!`, "error");
                              }
                            } else {
                              setSimulatedBlockedClient(client.id);
                              addNotification(`Modo Simulação ativado para ${client.name}!`, "error");
                            }
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wide border cursor-pointer transition-all ${
                          simulatedBlockedClient === client.id 
                            ? 'bg-red-500 text-white border-red-500 hover:brightness-110 shadow-lg shadow-red-500/10'
                            : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20 hover:text-indigo-300'
                        }`}
                        title="Simular Bloqueio"
                      >
                        <Lock size={11} />
                        <span>{simulatedBlockedClient === client.id ? 'Bloqueio Ativo' : 'Simular'}</span>
                      </button>

                      <a
                        href={`https://wa.me/55${client.whatsapp}?text=Ol%C3%A1%20${client.name}%21%20Espero%20que%20esteja%20tudo%20bem.%20Seu%20plano%20do%20SmartiDigitos%20(${planDetail?.name || 'Acesso'})%20est%C3%A1%20${daysRemaining <= 0 ? 'vencido' : 'pr%C3%B3ximo%20de%20vence'}%20no%2520dia%20${new Date(client.expirationDate).toLocaleDateString('pt-BR')}.%20Deseja%2520renovar%20para%20manter%20suas%20opera%C3%A7%C3%B5es%20conclu%C3%ADdas%253F`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 rounded-xl font-bold text-[10px] uppercase tracking-wide cursor-pointer text-center transition-all"
                        title="Avisar no WhatsApp"
                      >
                        <MessageCircle size={11} />
                        <span>Avisar</span>
                      </a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-[var(--color-bg-tertiary)]/40 border border-white/5 rounded-2xl py-12 px-4 flex flex-col items-center justify-center text-center opacity-40">
                <Users size={40} className="text-white/40 mb-3" />
                <p className="text-xs uppercase font-black tracking-widest text-white">Nenhum cliente registrado</p>
                <p className="text-[10px] text-white/50 max-w-xs mt-1">
                  Não encontramos clientes correspondentes ao termo de pesquisa. Crie novos ou altere os filtros.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* COMPILADOR JUROS COMPOSTOS SIMULATOR VIEW (Original functionality preserved in beautiful Tab 2) */
        <div className="space-y-6">
          <CurrencyConverter />
          <div className="bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-[2rem] p-6 sm:p-8 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                  <Calculator size={24} />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg leading-none">Gerenciamento</h2>
                  <span className="text-[10px] font-bold text-purple-400 tracking-widest uppercase">Tabela de Juros Compostos (USD)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Capital Inicial (USD)</label>
                <input 
                  type="number" 
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-mono font-bold focus:border-[var(--color-accent)] focus:outline-none transition-all"
                  placeholder="Ex: 100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Meta Diária (%)</label>
                <input 
                  type="number" 
                  value={dailyGoalPercent}
                  onChange={(e) => setDailyGoalPercent(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-mono font-bold focus:border-[var(--color-accent)] focus:outline-none transition-all"
                  placeholder="Ex: 3"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Período (Dias)</label>
                <input 
                  type="number" 
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-mono font-bold focus:border-[var(--color-accent)] focus:outline-none transition-all"
                  placeholder="Ex: 30"
                />
              </div>
            </div>

            {/* Tabela de Resultados */}
            <div className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto max-h-[350px] custom-scrollbar overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-4 py-3 text-[10px] font-bold text-white/30 uppercase">Dia</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-white/30 uppercase">Banca Inicial</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-white/30 uppercase">Lucro Diário</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-white/30 uppercase">Banca Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {tableData.map((row) => (
                      <tr key={row.day} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-xs font-mono font-bold text-white/40">{row.day.toString().padStart(2, '0')}</td>
                        <td className="px-4 py-3 text-xs font-mono font-bold text-white/70">${row.capital}</td>
                        <td className="px-4 py-3 text-xs font-mono font-bold text-[var(--color-accent)]">+${row.profit}</td>
                        <td className="px-4 py-3 text-xs font-mono font-black">${row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg-tertiary)]/40 border border-white/5 rounded-[2rem] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg text-[var(--color-accent)]">
                  <Target size={18} />
                </div>
                <p className="text-sm font-black uppercase tracking-tight">Projeção Final</p>
              </div>
              <p className="text-xs text-white/40 mb-1">Total após {days} dias</p>
              <p className="text-3xl font-mono font-black text-[var(--color-accent)]">${tableData[tableData.length - 1]?.total || '0.00'}</p>
            </div>
            <div className="bg-[var(--color-bg-tertiary)]/40 border border-white/5 rounded-[2rem] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <PieChart size={18} />
                </div>
                <p className="text-sm font-black uppercase tracking-tight">Lucro Total</p>
              </div>
              <p className="text-xs text-white/40 mb-1">Progresso acumulado</p>
              <p className="text-3xl font-mono font-black text-blue-400">
                {((Number(tableData[tableData.length - 1]?.total) / initialCapital - 1) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};


const DoubleBotsView = ({ 
  onAddBot, 
  onLoginOpen, 
  setNotifications,
  selectedVol,
  setSelectedVol,
  onAddTrade
}: { 
  onAddBot: (bot: any) => void, 
  onLoginOpen: () => void, 
  setNotifications: React.Dispatch<React.SetStateAction<{id: string, msg: string, time: string}[]>>,
  selectedVol: string,
  setSelectedVol: (vol: string) => void,
  onAddTrade?: (trade: any) => void
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'robot' | 'ia'>('manual');
  const [stake, setStake] = useState('0.35');
  const [gale, setGale] = useState('2.2');
  const [galeQty, setGaleQty] = useState('3');
  const [stopLoss, setStopLoss] = useState('0');
  const [stopWin, setStopWin] = useState('0');
  const [selectedSide, setSelectedSide] = useState<'par' | 'impar' | null>(null);
  const [isVolMenuOpen, setIsVolMenuOpen] = useState(false);
  
  const { account, logout, switchAccount, logining } = useDerivAuth();
  const { status: connStatus } = useDerivConnection();
  const { lastTick, digits, isConnected, executeTrade } = useDeriv(selectedVol, account?.loginid);
  const [priceColor, setPriceColor] = useState('text-[#76D130]');
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastTick) {
      if (prevPriceRef.current !== null) {
        if (lastTick.quote > prevPriceRef.current) {
          setPriceColor('text-[#76D130]');
        } else if (lastTick.quote < prevPriceRef.current) {
          setPriceColor('text-red-500');
        }
      }
      prevPriceRef.current = lastTick.quote;
    }
  }, [lastTick]);

  const [history, setHistory] = useState<number[]>([]);
  const [countdown, setCountdown] = useState(10);
  const [trading, setTrading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  
  useEffect(() => {
    if (digits.length > 0) {
      setHistory(digits.slice(-18).reverse());
    }
  }, [digits]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 15 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (tradeError) {
      const timer = setTimeout(() => setTradeError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [tradeError]);

  const handleEntry = async () => {
    if (!account) {
      onLoginOpen();
      return;
    }
    if (!selectedSide) return;

    setTrading(true);
    setTradeError(null);
    try {
      const type = selectedSide === 'par' ? 'DIGITEVEN' : 'DIGITODD';
      const result = await executeTrade(type, parseFloat(stake.replace(',', '.')));
      const profit = result.profit;
      const isWin = result.status === 'won';
      
      const msg = isWin ? `Operação manual vitoriosa! Lucro: $${Number(profit || 0).toFixed(2)}` : `Operação manual perdida. Perda: $${Math.abs(Number(profit || 0)).toFixed(2)}`;
      setNotifications(prev => [{
        id: Date.now().toString(),
        msg,
        time: new Date().toLocaleTimeString(),
        type: isWin ? 'success' : 'error'
      }, ...prev]);

      if (onAddTrade) {
        onAddTrade({
          id: result.contract_id.toString(),
          time: new Date().toLocaleTimeString(),
          type: type,
          entry: result.entry_tick_display_value || '0',
          exit: result.exit_tick_display_value || '0',
          price: stake.toString(),
          result: Number(profit || 0).toFixed(2),
          isWin: isWin,
          market: selectedVol
        });
      }
    } catch (err: any) {
      setTradeError(err.message);
      console.error('Manual trade error:', err);
    } finally {
      setTrading(false);
    }
  };

  const analysis = React.useMemo(() => {
    if (digits.length < 20) return { recommendation: null, evenPct: 0, oddPct: 0 };
    
    const evenCount = digits.filter(d => d % 2 === 0).length;
    const oddCount = digits.filter(d => d % 2 !== 0).length;
    const total = digits.length;
    
    const evenPct = (evenCount / total) * 100;
    const oddPct = (oddCount / total) * 100;
    
    let recommendation: 'Par' | 'Ímpar' | 'Neutro' = 'Neutro';
    if (evenPct > oddPct + 5) recommendation = 'Par';
    else if (oddPct > evenPct + 5) recommendation = 'Ímpar';
    
    return { recommendation, evenPct, oddPct };
  }, [digits]);

  const stats = React.useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const count = digits.filter(d => d === i).length;
      return {
        digit: i,
        count,
        percentage: digits.length > 0 ? (count / digits.length) * 100 : 0
      };
    });
  }, [digits]);

  return (
    <div className="space-y-4 p-2 sm:p-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[var(--color-bg-primary)] border border-white/5 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-white uppercase tracking-widest opacity-50">Painel Financeiro</h3>
              <div className="relative">
                <button 
                  onClick={() => setIsVolMenuOpen(!isVolMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-[10px] font-black text-white/60"
                >
                  <Activity size={12} className="text-[var(--color-accent)]" />
                  <span>{VOLATILITIES.find(v => v.id === selectedVol)?.label}</span>
                  <ChevronDown size={12} className={`transition-transform ${isVolMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isVolMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setIsVolMenuOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-48 bg-[var(--color-bg-tertiary)] border border-white/10 rounded-xl shadow-2xl z-[110] overflow-hidden p-1"
                      >
                        {VOLATILITIES.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => {
                              setSelectedVol(v.id);
                              setIsVolMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-all ${selectedVol === v.id ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                          >
                            {v.label}
                            {selectedVol === v.id && <Check size={12} />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Saldo Protegido</p>
                  <p className="text-2xl font-black text-white flex items-baseline gap-1">
                    {logining ? (
                      <RefreshCcw size={16} className="animate-spin text-[#76D130]" />
                    ) : (
                      <>
                        <span className="text-[#76D130] text-lg">$</span>
                        {account?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0,00'}
                      </>
                    )}
                    <span className="text-[10px] text-white/20 ml-1 font-mono">{account?.currency || 'USD'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1 ${account?.isVirtual ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                    <div className={`w-1 h-1 rounded-full ${account?.isVirtual ? 'bg-blue-400' : 'bg-orange-400'} animate-pulse`} />
                    {account?.isVirtual ? 'CONTA DEMO' : 'CONTA REAL'}
                  </div>
                  <p className="text-[10px] text-white/40 mt-1 font-medium">{account?.name || 'Aguardando Login...'}</p>
                </div>
              </div>

              <div className="h-px bg-white/5 w-full my-1" />

              <div className="space-y-2">
                <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Alternar Contas Disponíveis</label>
                <div className="flex flex-col gap-1.5">
                  {!account ? (
                    <button 
                      onClick={onLoginOpen}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-[11px] tracking-widest shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <PlusCircle size={14} />
                      VINCULAR CONTA DERIV
                    </button>
                  ) : (
                    <>
                      {account.accounts?.map((acc) => (
                        <button
                          key={acc.loginid}
                          onClick={() => acc.loginid !== account.loginid && switchAccount(acc.loginid)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${acc.loginid === account.loginid ? 'bg-[#76D130]/10 border-[#76D130]/30 text-[#76D130]' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}
                        >
                          <div className="flex items-center gap-2">
                            <Wallet size={12} className={acc.loginid === account.loginid ? 'text-[#76D130]' : 'text-white/20'} />
                            <span className="text-[11px] font-bold font-mono">{acc.loginid}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${acc.isVirtual ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                              {acc.isVirtual ? 'DEMO' : 'REAL'}
                            </span>
                            {acc.loginid === account.loginid && <Check size={12} />}
                          </div>
                        </button>
                      ))}
                      <button 
                         onClick={logout}
                         className="w-full mt-2 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-[11px] tracking-widest shadow-lg shadow-red-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                         <Power size={14} />
                         SAIR DA CONTA
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-primary)] border border-white/5 rounded-xl overflow-hidden shadow-xl max-h-[700px] flex flex-col">
            <div className="flex border-b border-white/5 bg-[var(--color-bg-secondary)]/30">
              {(['manual', 'robot', 'ia'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-[11px] font-bold transition-all relative ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  {tab === 'ia' ? 'Modo IA' : tab === 'robot' ? 'Robô' : 'Manual'}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                </button>
              ))}
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
              {activeTab === 'manual' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-white/80 block mb-2">Entrada</label>
                    <input 
                      type="text" 
                      value={stake}
                      onChange={(e) => setStake(e.target.value)}
                      className="w-full bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-white/80 block mb-2">Fator gale</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={gale}
                        onChange={(e) => setGale(e.target.value)}
                        className="flex-1 bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-blue-500/50"
                      />
                      <button className="px-4 bg-[var(--color-bg-secondary)]/50 hover:bg-[var(--color-bg-secondary)] rounded-lg border border-white/10 transition-colors"><div className="w-4 h-0.5 bg-white/40" /></button>
                      <button className="px-4 bg-[var(--color-bg-secondary)]/50 hover:bg-[var(--color-bg-secondary)] rounded-lg border border-white/10 transition-colors"><X size={14} className="text-white/40" /></button>
                    </div>
                  </div>

                  <div className="pt-2">
                     <p className="text-[10px] text-white/40 mb-3 italic">Próxima entrada em {countdown}s</p>
                     <div className="p-3 bg-[var(--color-bg-secondary)]/20 border border-white/5 rounded-xl space-y-3">
                       <div className="flex items-center justify-center gap-2">
                          <div className="h-[1px] flex-1 bg-white/5" />
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Escolha Par ou Ímpar</p>
                          <div className="h-[1px] flex-1 bg-white/5" />
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <button 
                           onClick={() => setSelectedSide('par')}
                           className={`py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition-all border ${selectedSide === 'par' ? 'bg-[#76D130] border-[#76D130] text-[var(--color-bg-primary)]' : 'bg-transparent border-white/10 text-white/60'}`}
                         >
                           <Zap size={14} fill="currentColor" />
                           Par
                         </button>
                         <button 
                           onClick={() => setSelectedSide('impar')}
                           className={`py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition-all border ${selectedSide === 'impar' ? 'bg-zinc-700 border-zinc-600 text-white' : 'bg-transparent border-white/10 text-white/60'}`}
                         >
                           <Zap size={14} fill="currentColor" />
                           Ímpar
                         </button>
                       </div>
                     </div>
                  </div>

                  {tradeError && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-3"
                    >
                      <p className="text-[10px] text-red-400 font-bold flex items-center gap-2">
                        <XCircle size={14} />
                        {tradeError}
                      </p>
                    </motion.div>
                  )}

                  <button 
                    onClick={handleEntry}
                    disabled={trading || !selectedSide}
                    className="w-full bg-[#1e40af] hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold text-xs transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20"
                  >
                    {trading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCcw size={14} className="animate-spin" />
                        Processando...
                      </span>
                    ) : 'Realizar entrada'}
                  </button>
                </div>
              ) : activeTab === 'robot' ? (
                <RobotPanel onAddBot={onAddBot} selectedVol={selectedVol} onAddTrade={onAddTrade} />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-30">
                   <Cpu size={40} className="mb-4" />
                   <p className="text-xs font-bold uppercase tracking-widest">Modo IA em Breve</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Game Area */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[var(--color-bg-primary)] border border-white/5 rounded-xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
            {/* Header Icons */}
            <div className="flex items-center justify-between mb-6">
              <Box size={20} className="text-blue-400" />
              <Wifi size={20} className="text-[#76D130]" />
            </div>

            {/* Real-time Tick Info */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#76D130] animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                  LIVE TICK
                </span>
              </div>
              {lastTick && (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-white/20 uppercase leading-none">Horário</span>
                    <span className="text-[11px] font-mono font-bold text-white/60">
                      {new Date(lastTick.epoch * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-white/20 uppercase leading-none">Preço</span>
                    <span className={`text-[14px] font-mono font-black ${priceColor} tabular-nums transition-colors duration-200`}>
                      {Number(lastTick.quote || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Main Progress Bar */}
            <div className="relative h-2.5 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden mb-6">
              <motion.div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
                animate={{ width: `${(countdown / 15) * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>

            {/* Timer Row */}
            <div className="flex items-center justify-between mb-8">
              <span className="text-[11px] font-bold text-white/60">Próxima entrada</span>
              <div className="flex items-center gap-2">
                 <span className="text-[11px] font-bold text-white">{countdown}s</span>
                 <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              </div>
            </div>

            {/* Cards Row Animated Carousel */}
            <div className="relative h-24 sm:h-32 mb-10 overflow-hidden flex items-center justify-center">
               <motion.div 
                 className="flex gap-2 sm:gap-4 items-center"
                 animate={{ x: [20, -20, 20] }}
                 transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
               >
                 {[...Array(20)].map((_, i) => {
                   const num = (i + digits[digits.length-1] || 0) % 10;
                   const isTarget = i === 10; // Simple center point
                   const isDiamond = num === 0;
                   
                   return (
                     <div key={i} className={`w-14 sm:w-20 h-20 sm:h-28 rounded-xl bg-[var(--color-bg-secondary)]/40 border ${isTarget ? 'border-[#76D130] ring-1 ring-[#76D130]' : 'border-white/10'} flex-shrink-0 flex items-center justify-center transition-all duration-500`}>
                        {isDiamond ? (
                           <div className="w-10 sm:w-14 h-10 sm:h-14 rounded-full bg-blue-500/20 border-2 border-blue-400/50 flex items-center justify-center">
                             <div className="w-6 sm:w-8 h-6 sm:h-8 bg-blue-400 transform rotate-45 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(96,165,250,0.5)]">
                               <div className="w-full h-full bg-gradient-to-br from-white/40 to-transparent" />
                             </div>
                           </div>
                        ) : (
                          <div className={`w-10 sm:w-14 h-10 sm:h-14 rounded-full border-2 ${isTarget ? 'border-[#76D130] bg-[#76D130]/10' : 'border-white/20'} flex items-center justify-center text-white font-bold text-xl`}>
                            {num}
                          </div>
                        )}
                     </div>
                   );
                 })}
               </motion.div>
               {/* Center Focus Frame */}
               <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-16 sm:w-24 h-24 sm:h-32 border-2 border-white/5 bg-white/5 backdrop-blur-sm rounded-2xl z-20" />
               </div>
            </div>

            {/* Recommendation Box */}
            <div className="flex flex-col items-center gap-4 mb-10">
               <div className="flex gap-8">
                  <div className="text-center">
                     <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Pares</p>
                     <p className="text-xl font-black text-[#76D130]">{Number(analysis.evenPct || 0).toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                     <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Ímpares</p>
                     <p className="text-xl font-black text-blue-400">{Number(analysis.oddPct || 0).toFixed(1)}%</p>
                  </div>
               </div>
               <div className={`px-10 py-3 rounded-lg shadow-xl min-w-[240px] text-center border transition-all duration-500 ${analysis.recommendation === 'Par' ? 'bg-[#76D130]/20 border-[#76D130]/50' : analysis.recommendation === 'Ímpar' ? 'bg-blue-500/20 border-blue-500/50' : 'bg-[var(--color-bg-secondary)] border-white/10'}`}>
                 <span className={`text-sm font-black uppercase tracking-[0.2em] whitespace-nowrap ${analysis.recommendation === 'Par' ? 'text-[#76D130]' : analysis.recommendation === 'Ímpar' ? 'text-blue-400' : 'text-white'}`}>
                    {(!analysis.recommendation || analysis.recommendation === 'Neutro') ? 'Analisando Tendência...' : `SINAL: ${analysis.recommendation.toUpperCase()}`}
                 </span>
               </div>
               {analysis.recommendation !== 'Neutro' && (
                 <p className="text-[9px] font-bold text-[#76D130] animate-pulse">Estratégia "{analysis.recommendation === 'Par' ? '4 pra 1' : '4 pra 1 Reversa'}" Ativa</p>
               )}
            </div>

            {/* Histórico row - Rectangular matching the photo */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-white/40">Histórico</span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
                {history.map((num, i) => (
                  <div 
                    key={i} 
                    className={`
                      w-6 h-6 rounded-full flex-shrink-0 border flex items-center justify-center text-[10px] font-bold transition-all
                      ${num % 2 === 0 
                        ? 'bg-[#76D130] border-[#76D130] text-[var(--color-bg-primary)]' 
                        : 'bg-[var(--color-bg-secondary)] border-white/10 text-white/60'}
                    `}
                  >
                    <span className="leading-none">{num}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-primary)] border border-white/5 rounded-xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
               <h3 className="font-bold text-[11px] text-blue-400 flex items-center gap-2">
                 <FileText size={14} />
                 Histórico de Operações
               </h3>
               <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded">0 / 0</span>
            </div>
            <div className="min-h-[200px] flex flex-col items-center justify-center text-center p-8">
               <div className="w-full max-w-2xl">
                  <div className="grid grid-cols-4 w-full gap-8 text-[10px] font-bold text-white/40 uppercase mb-4 border-b border-white/5 pb-2 px-4">
                    <span className="text-left">Hora</span>
                    <span>Tipo</span>
                    <span>Entrada/Saída</span>
                    <span className="text-right">Resultado</span>
                  </div>
                  <div className="py-10">
                    <p className="text-[10px] font-bold italic text-white/20 uppercase tracking-widest">Nenhuma operação realizada</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const BotBuilderView = ({ onAddBot, setNotifications }: { onAddBot: (bot: any) => void, setNotifications: React.Dispatch<React.SetStateAction<any[]>> }) => {
  const [activeBlocksTab, setActiveBlocksTab] = useState('Trade parameters');
  const [botCode, setBotCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [savedStrategies, setSavedStrategies] = useState<{name: string, config: any, code: string, date: string}[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved strategies on mount
  useEffect(() => {
    const saved = localStorage.getItem('deriv_bot_strategies');
    if (saved) {
      try {
        setSavedStrategies(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved strategies", e);
      }
    }
  }, []);

  const handleSaveStrategy = () => {
    const strategyName = parsedConfig.name || `Estratégia ${new Date().toLocaleDateString()}`;
    const newStrategy = {
      name: strategyName,
      config: parsedConfig,
      code: botCode,
      date: new Date().toISOString()
    };
    
    const updated = [newStrategy, ...savedStrategies].slice(0, 20); // Keep last 20
    setSavedStrategies(updated);
    localStorage.setItem('deriv_bot_strategies', JSON.stringify(updated));
    
    setNotifications(prev => [{
      id: Date.now().toString(),
      msg: `Estratégia "${strategyName}" salva com sucesso!`,
      time: new Date().toLocaleTimeString(),
      type: "success"
    }, ...prev]);
  };

  const handleLoadStrategy = (strat: any) => {
    setParsedConfig(strat.config);
    setBotCode(strat.code || '');
    setShowSavedList(false);
    setNotifications(prev => [{
      id: Date.now().toString(),
      msg: `Estratégia "${strat.name}" carregada!`,
      time: new Date().toLocaleTimeString(),
      type: "info"
    }, ...prev]);
  };

  const downloadBot = (botData: any, format: 'json' | 'xml') => {
    let content = '';
    const name = botData.name || 'Bot_Estrategia';
    const fileName = `${name.replace(/\s+/g, '_')}.${format}`;

    if (format === 'json') {
      // Standard JSON format for DBot
      const exportData = {
        name: name,
        market: botData.config?.market || 'Volatility 10 Index',
        stake: botData.config?.stake || '0.35',
        martingale: botData.config?.martingale || '2',
        stopLoss: botData.config?.stopLoss || '10',
        stopWin: botData.config?.stopWin || '5',
        exported_at: new Date().toISOString(),
        version: '1.0.0'
      };
      content = JSON.stringify(exportData, null, 2);
    } else {
      // Improved XML format for Binary Bot compatibility
      content = `<?xml version="1.0" encoding="UTF-8"?>
<xml xmlns="http://www.w3.org/1999/xhtml" is_dbot="true" collection="false">
  <variable type="" id="v1">stake</variable>
  <variable type="" id="v2">martingale</variable>
  <variable type="" id="v3">stopLoss</variable>
  <variable type="" id="v4">stopWin</variable>
  
  <block type="trade_definition" id="main_trade" x="0" y="0">
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_market" id="market">
        <field name="MARKET_LIST">synthetic_index</field>
        <field name="SUBMARKET_LIST">random_index</field>
        <field name="SYMBOL_LIST">${botData.config?.symbol || 'R_10'}</field>
        <block type="trade_definition_tradetype" id="type">
          <field name="TRADETYPE_LIST">callput</field>
          <field name="TRADETYPE_CAT_LIST">callput</field>
          <block type="trade_definition_contracttype" id="contract">
             <field name="CONTRACT_TYPE_LIST">both</field>
             <block type="trade_definition_duration" id="duration">
               <field name="DURATIONUNIT_LIST">t</field>
               <value name="DURATION">
                 <block type="math_number"><field name="NUM">1</field></block>
               </value>
               <block type="trade_definition_restartbuysell" id="restart">
                 <field name="TIME_MACHINE_ENABLED">FALSE</field>
               </block>
             </block>
          </block>
        </block>
      </block>
    </statement>
    <statement name="INITIALIZATION">
      <block type="variables_set">
        <field name="VAR" id="v1">stake</field>
        <value name="VALUE">
          <block type="math_number"><field name="NUM">${botData.config?.stake || '0.35'}</field></block>
        </value>
      </block>
    </statement>
    <statement name="SUBMISSION">
      <block type="trade_definition_tradeoptions" id="options">
        <field name="CURRENCY_LIST">USD</field>
        <field name="BARRIER_OFFSET_1_TYPE">none</field>
        <field name="BARRIER_OFFSET_2_TYPE">none</field>
        <value name="AMOUNT">
          <block type="variables_get"><field name="VAR" id="v1">stake</field></block>
        </value>
      </block>
    </statement>
  </block>
  ${botData.code ? (botData.code.includes('<xml') ? botData.code.replace(/<\/?xml[^>]*>/g, '') : botData.code) : ''}
</xml>`;
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotifications(prev => [{
      id: Date.now().toString(),
      msg: `Robô "${name}" baixado em .${format}!`,
      time: new Date().toLocaleTimeString(),
      type: "success"
    }, ...prev]);
  };
  
  // Dynamic config based on parsed bot code
  const [parsedConfig, setParsedConfig] = useState({
    stake: '0.35',
    market: 'Volatility 100 Index',
    type: 'Acima/Abaixo',
    prediction: 'Digit 5',
    martingale: '2.0',
    stopLoss: '10.00',
    stopWin: '5.00',
    condition: 'EMA (20)',
    action: 'RISE',
    name: 'Bot Inteligente'
  });

  const parseBotCode = (code: string, fileName?: string) => {
    const config = { ...parsedConfig };
    if (fileName) config.name = fileName;

    try {
      // Very basic regex-based parsing for Deriv/Binary Bot XML
      // These are common patterns in .xml bot files
      const stakeMatch = code.match(/<field name="AMOUNT">([\d.]+)<\/field>/i) || code.match(/"amount":\s*([\d.]+)/i);
      const stopLossMatch = code.match(/<field name="LOSS_THRESHOLD">([\d.]+)<\/field>/i) || code.match(/"stop_loss":\s*([\d.]+)/i);
      const stopWinMatch = code.match(/<field name="WIN_THRESHOLD">([\d.]+)<\/field>/i) || code.match(/"stop_win":\s*([\d.]+)/i);
      const predictionMatch = code.match(/<field name="PREDICTION">(\d+)<\/field>/i);
      const symbolMatch = code.match(/<field name="SYMBOL_LIST">([^<]+)<\/field>/i);

      if (stakeMatch) config.stake = stakeMatch[1];
      if (stopLossMatch) config.stopLoss = stopLossMatch[1];
      if (stopWinMatch) config.stopWin = stopWinMatch[1];
      if (predictionMatch) config.prediction = `Digit ${predictionMatch[1]}`;
      if (symbolMatch) {
        const symb = symbolMatch[1].replace('R_', 'Volatility ').replace('_', ' ');
        config.market = symb.includes('Volatility') ? symb + ' Index' : symb;
      }

      // If it looks like a JSON bot
      if (code.trim().startsWith('{')) {
        const json = JSON.parse(code);
        if (json.name) config.name = json.name;
        if (json.variables) {
          // Try to find stake in variables
          const stakeVar = json.variables.find((v: any) => v.name.toLowerCase().includes('stake') || v.name.toLowerCase().includes('valor'));
          if (stakeVar && stakeVar.value) config.stake = stakeVar.value;
        }
      }
    } catch (e) {
      console.warn("Could not deeply parse bot code, using defaults or partial matches", e);
    }

    setParsedConfig(config);
    return config;
  };
  
  const handleImport = () => {
    if (!botCode.trim()) return;
    const config = parseBotCode(botCode);
    const newBot = {
      id: `custom-${Date.now()}`,
      name: config.name || `Bot Importado #${Math.floor(Math.random() * 1000)}`,
      tag: 'Importado',
      color: '#A855F7',
      icon: <Code2 size={20} />,
      code: botCode
    };
    onAddBot(newBot);
    setNotifications(prev => [{
      id: Date.now().toString(),
      msg: `Robô "${newBot.name}" importado com sucesso!`,
      time: new Date().toLocaleTimeString(),
      type: "success"
    }, ...prev]);
    setBotCode('');
    setIsImporting(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      
      const config = parseBotCode(content, fileName);
      
      const newBot = {
        id: `file-${Date.now()}`,
        name: config.name || fileName || `Bot Uploaded`,
        tag: 'Upload',
        color: '#10B981',
        icon: <Cpu size={20} />,
        code: content
      };
      
      onAddBot(newBot);
      setNotifications(prev => [{
        id: Date.now().toString(),
        msg: `Robô "${newBot.name}" importado com sucesso!`,
        time: new Date().toLocaleTimeString(),
        type: "success"
      }, ...prev]);
    };
    reader.readAsText(file);
  };

  const blockCategories = [
    { 
      id: 'binary', 
      label: 'Binary', 
      icon: <Terminal size={14} />, 
      color: 'var(--color-accent)', 
      sub: ['Trade Parameters', 'Purchase conditions', 'Sell conditions', 'Restart conditions'] 
    },
    { 
      id: 'actions', 
      label: 'Actions', 
      icon: <Zap size={14} />, 
      color: '#3B82F6', 
      sub: ['Buy', 'Sell', 'Close Trade', 'Cancel Order'] 
    },
    { 
      id: 'logic', 
      label: 'Logic', 
      icon: <GitBranch size={14} />, 
      color: '#A855F7', 
      sub: ['If / Else', 'Logical AND', 'Logical OR', 'Logical NOT', 'Comparison'] 
    },
    { 
      id: 'math', 
      label: 'Math', 
      icon: <Calculator size={14} />, 
      color: '#F59E0B',
      sub: ['Number', 'Arithmetic', 'Rounding', 'Random Number', 'Mathematical Functions']
    },
    { 
      id: 'text', 
      label: 'Text', 
      icon: <Type size={14} />, 
      color: '#EC4899',
      sub: ['Print', 'Text length', 'Is empty?', 'Find text']
    },
    { 
      id: 'variables', 
      label: 'Variables', 
      icon: <Box size={14} />, 
      color: '#06B6D4',
      sub: ['Create variable...', 'Variable getter', 'Variable setter']
    },
  ];

  const [canvasScale, setCanvasScale] = useState(1);
  const [activeCanvasTab, setActiveCanvasTab] = useState<'visual' | 'code'>('visual');
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [isBotListOpen, setIsBotListOpen] = useState(false);

  const selectedBot = useMemo(() => BOTS.find(b => b.id === selectedBotId), [selectedBotId]);

  const handleSelectPredefinedBot = (bot: any) => {
    setSelectedBotId(bot.id);
    const newConfig = {
      ...parsedConfig,
      name: bot.name,
      market: bot.symbol.replace('R_', 'Volatility ').replace('_', ' ') + ' Index'
    };
    setParsedConfig(newConfig);
    
    // Generate dummy XML code for predefined bots if it doesn't exist
    const dummyCode = btoa(JSON.stringify(newConfig));
    setBotCode(`<!-- Generated for ${bot.name} -->\n<xml>${dummyCode}</xml>`);
    setIsBotListOpen(false);

    setNotifications(prev => [{
      id: Date.now().toString(),
      msg: `Robô "${bot.name}" selecionado para edição!`,
      time: new Date().toLocaleTimeString(),
      type: "info"
    }, ...prev]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Bot Selector Header */}
      <div className="bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl shadow-2xl relative z-40">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <Cpu size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Biblioteca de Robôs</h2>
              <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Selecione para editar ou baixar</p>
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsBotListOpen(!isBotListOpen)}
              className="px-6 py-3 bg-black/40 border border-white/10 rounded-2xl flex items-center gap-4 hover:border-blue-500/30 transition-all min-w-[240px] justify-between group"
            >
              <div className="flex items-center gap-3">
                {selectedBot ? (
                  <>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedBot.color}20`, color: selectedBot.color }}>
                      {selectedBot.icon}
                    </div>
                    <span className="text-sm font-bold text-white">{selectedBot.name}</span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-white/40 italic">Selecione um Robô</span>
                )}
              </div>
              <ChevronDown size={18} className={`text-white/40 transition-transform duration-300 ${isBotListOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isBotListOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full mt-2 right-0 w-full min-w-[300px] bg-[var(--color-bg-primary)] border border-white/10 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-3xl z-50 p-2"
                >
                  <div className="max-h-[300px] overflow-y-auto no-scrollbar py-1 space-y-1">
                    {BOTS.map((bot) => (
                      <button
                        key={bot.id}
                        onClick={() => handleSelectPredefinedBot(bot)}
                        className={`w-full p-3 rounded-xl flex items-center gap-4 transition-all hover:bg-white/5 group text-left ${selectedBotId === bot.id ? 'bg-blue-600/10 border-l-2 border-blue-500' : ''}`}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${bot.color}20`, color: bot.color }}>
                          {bot.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-white">{bot.name}</p>
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-tight">{bot.tag}</p>
                        </div>
                        {selectedBotId === bot.id && <CheckCircle2 size={14} className="text-blue-400" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {selectedBotId && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 pt-8 border-t border-white/5"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Settings size={18} className="text-blue-400" />
                <h3 className="font-black text-xs uppercase tracking-[0.2em]">Configurações do Robô: {parsedConfig.name}</h3>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => downloadBot({ name: parsedConfig.name, config: parsedConfig, code: botCode }, 'json')}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-[10px] font-black border border-blue-500/30 transition-all flex items-center gap-2 uppercase tracking-widest"
                >
                  <Download size={14} />
                  Baixar JSON
                </button>
                <button 
                  onClick={() => downloadBot({ name: parsedConfig.name, config: parsedConfig, code: botCode }, 'xml')}
                  className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-xl text-[10px] font-black border border-purple-500/30 transition-all flex items-center gap-2 uppercase tracking-widest"
                >
                  <FileCode size={14} />
                  Baixar XML
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Valor da Entrada (USD)</label>
                <input 
                  type="text" 
                  value={parsedConfig.stake}
                  onChange={(e) => setParsedConfig({...parsedConfig, stake: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-blue-500/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Multiplicador Martingale</label>
                <input 
                  type="text" 
                  value={parsedConfig.martingale}
                  onChange={(e) => setParsedConfig({...parsedConfig, martingale: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-blue-500/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Meta de Lucro (Target)</label>
                <input 
                  type="text" 
                  value={parsedConfig.stopWin}
                  onChange={(e) => setParsedConfig({...parsedConfig, stopWin: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-blue-500/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Limite de Perda (Stop)</label>
                <input 
                  type="text" 
                  value={parsedConfig.stopLoss}
                  onChange={(e) => setParsedConfig({...parsedConfig, stopLoss: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-red-500/50 outline-none transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 bg-white/5 p-1 rounded-xl">
          <button 
            onClick={() => setActiveCanvasTab('visual')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${activeCanvasTab === 'visual' ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] shadow-lg shadow-[var(--color-accent)]/20' : 'text-white/40 hover:text-white'}`}
          >
            Bot Builder
          </button>
          <button 
            onClick={() => setActiveCanvasTab('code')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${activeCanvasTab === 'code' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-white/40 hover:text-white'}`}
          >
            Ver Código
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg p-1">
             <button onClick={() => setCanvasScale(prev => Math.max(0.5, prev - 0.1))} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white">-</button>
             <span className="text-[10px] font-mono text-white/60 min-w-[40px] text-center">{Math.round(canvasScale * 100)}%</span>
             <button onClick={() => setCanvasScale(prev => Math.min(3, prev + 0.1))} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white">+</button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSaveStrategy}
              title="Salvar Estratégia"
              className="w-8 h-8 flex items-center justify-center bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-lg text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
            >
              <Save size={14} />
            </button>
            <button 
              onClick={() => downloadBot({ name: parsedConfig.name, config: parsedConfig, code: botCode }, 'json')}
              title="Baixar JSON (Deriv Bot)"
              className="w-8 h-8 flex items-center justify-center bg-blue-600/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-600/20 transition-colors"
            >
              <Download size={14} />
            </button>
            <button 
              onClick={() => downloadBot({ name: parsedConfig.name, config: parsedConfig, code: botCode }, 'xml')}
              title="Baixar XML (Binary Bot)"
              className="w-8 h-8 flex items-center justify-center bg-purple-600/10 border border-purple-500/20 rounded-lg text-purple-400 hover:bg-purple-600/20 transition-colors mr-2"
            >
              <FileCode size={14} />
            </button>
            <button 
              onClick={() => setShowSavedList(!showSavedList)}
              title="Carregar Estratégia"
              className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-colors ${showSavedList ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
            >
              <FolderOpen size={14} />
            </button>
            <button className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-red-500/20">Quick strategy</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSavedList && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-[var(--color-bg-primary)] border border-white/10 rounded-2xl p-6 shadow-2xl relative z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <FolderOpen size={16} className="text-[var(--color-accent)]" />
                Minhas Estratégias Salvas
              </h4>
              <button onClick={() => setShowSavedList(false)} className="text-white/20 hover:text-white"><X size={16} /></button>
            </div>
            
            {savedStrategies.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-xl">
                <p className="text-xs text-white/20 italic">Nenhuma estratégia salva ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedStrategies.map((strat, idx) => (
                  <div key={idx} className="relative group">
                    <button
                      onClick={() => handleLoadStrategy(strat)}
                      className="w-full flex flex-col items-start p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-[var(--color-accent)]/30 transition-all text-left"
                    >
                      <span className="text-[11px] font-black text-[var(--color-accent)] mb-1">{strat.name}</span>
                      <div className="flex items-center gap-2 text-[9px] text-white/40">
                        <span>{strat.config.market}</span>
                        <span>•</span>
                        <span>{new Date(strat.date).toLocaleDateString()}</span>
                      </div>
                    </button>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); downloadBot(strat, 'json'); }}
                        className="p-1.5 bg-black/40 hover:bg-black rounded-md text-blue-400 transition-colors"
                        title="Baixar JSON"
                      >
                        <Download size={12} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); downloadBot(strat, 'xml'); }}
                        className="p-1.5 bg-black/40 hover:bg-black rounded-md text-purple-400 transition-colors"
                        title="Baixar XML"
                      >
                        <FileCode size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Sidebar - Blocks Menu (Wider now) */}
        <div className="lg:col-span-5 bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-[2rem] p-5 backdrop-blur-md flex flex-col gap-5 overflow-hidden">
          <h3 className="font-bold text-sm px-2 flex items-center justify-between">
            Blocks menu
            <ChevronDown size={14} />
          </h3>
          
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input 
              type="text" 
              placeholder="Search"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
            />
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
            {blockCategories.map((cat) => (
              <div key={cat.id} className="flex flex-col group">
                <button 
                  onClick={() => setActiveBlocksTab(cat.label)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all text-[11px] font-black uppercase tracking-widest border ${activeBlocksTab === cat.label ? 'bg-white/5 border-white/10 text-white' : 'border-transparent text-white/30 hover:bg-white/5 hover:text-white/60'}`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-1.5 rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                      style={{ 
                        backgroundColor: `${cat.color}15`,
                        color: cat.color,
                        border: `1px solid ${cat.color}30`
                      }}
                    >
                      {cat.icon}
                    </div>
                    {cat.label}
                  </div>
                  <ChevronDown size={14} className={`opacity-20 transition-transform duration-300 ${activeBlocksTab === cat.label ? 'rotate-180 opacity-100' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {activeBlocksTab === cat.label && cat.sub && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-6 mr-2 mt-2 flex flex-col gap-1.5 border-l-2 border-white/5 pl-5 py-2 overflow-hidden"
                    >
                      {cat.sub.map(item => (
                        <button 
                          key={item} 
                          className="text-left py-2 px-3 rounded-lg text-[10px] font-bold text-white/20 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 group/item"
                        >
                          <div className="w-1 h-1 rounded-full bg-white/10 group-hover/item:bg-[var(--color-accent)] transition-colors" />
                          {item}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 bg-black/40 border border-white/5 rounded-[2rem] p-8 relative overflow-hidden custom-scrollbar">
          {activeCanvasTab === 'visual' ? (
            <>
              <div className="absolute top-0 right-0 p-4 flex gap-2 z-10">
                <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"><RefreshCcw size={14} /></button>
                <button 
                  onClick={() => downloadBot({ name: parsedConfig.name, config: parsedConfig, code: botCode }, 'json')}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <Download size={14} />
                </button>
                <button className="w-8 h-8 rounded-lg bg-black text-[var(--color-accent)] flex items-center justify-center border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/10 transition-colors"><PlusCircle size={14} /></button>
              </div>

              <motion.div 
                style={{ scale: canvasScale }}
                className="flex flex-col gap-8 items-start transition-transform duration-300 origin-top-left"
              >
                {/* Visual blocks are here */}

            {/* Block 1: Trade Parameters */}
            <motion.div 
              drag
              dragMomentum={false}
              className="bg-[#2D4A6B]/90 backdrop-blur-md rounded-lg border-l-4 border-blue-400 w-full max-w-sm p-4 shadow-2xl cursor-move active:z-50"
            >
             <div className="flex items-center gap-2 text-[10px] font-bold text-white/70 mb-3 border-b border-white/10 pb-2">
                <Settings size={12} />
                1. Configurações do Robô: {parsedConfig.name}
             </div>
             <div className="space-y-2.5">
                <div className="flex flex-col gap-1">
                   <span className="text-[8px] text-white/30 uppercase font-black">Mercado</span>
                   <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-black/60 px-2 py-0.5 rounded text-[9px]">Índices Sintéticos</span>
                      <span className="text-white/20">/</span>
                      <span className="bg-black/60 px-2 py-0.5 rounded text-[9px]">Continuous Indices</span>
                      <span className="text-white/20">/</span>
                      <span className="bg-black/60 px-2 py-0.5 rounded text-[9px] text-[var(--color-accent)]">{parsedConfig.market}</span>
                   </div>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-[8px] text-white/30 uppercase font-black">Tipo de Negociação</span>
                   <div className="flex items-center gap-2">
                      <span className="bg-black/60 px-2 py-0.5 rounded text-[9px]">Sobe/Desce</span>
                      <span className="text-white/20">/</span>
                      <span className="bg-black/60 px-2 py-0.5 rounded text-[9px] text-blue-300">{parsedConfig.type}</span>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                   <div className="bg-black/30 p-2 rounded border border-white/5">
                      <p className="text-[7px] text-white/30 uppercase font-black">Investimento</p>
                      <p className="text-[10px] font-bold text-emerald-400">{parsedConfig.stake} USD</p>
                   </div>
                   <div className="bg-black/30 p-2 rounded border border-white/5">
                      <p className="text-[7px] text-white/30 uppercase font-black">Previsão</p>
                      <p className="text-[10px] font-bold text-blue-400">{parsedConfig.prediction}</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div className="bg-black/30 p-2 rounded border border-white/5">
                      <p className="text-[7px] text-white/30 uppercase font-black">Meta de Lucro</p>
                      <p className="text-[10px] font-bold text-[var(--color-accent)]">{parsedConfig.stopWin} USD</p>
                   </div>
                   <div className="bg-black/30 p-2 rounded border border-white/5">
                      <p className="text-[7px] text-white/30 uppercase font-black">Stop Loss</p>
                      <p className="text-[10px] font-bold text-red-400">{parsedConfig.stopLoss} USD</p>
                   </div>
                </div>
             </div>
          </motion.div>

          {/* Block 2: Purchase conditions */}
          <motion.div 
            drag
            dragMomentum={false}
            className="bg-[#1E3A5F]/90 backdrop-blur-md rounded-lg border-l-4 border-[var(--color-accent)] w-80 p-4 shadow-2xl cursor-move ml-8 relative before:content-[''] before:absolute before:-top-4 before:left-8 before:w-0.5 before:h-4 before:bg-white/10"
          >
             <div className="flex items-center gap-2 text-[10px] font-bold text-white/70 mb-3 border-b border-white/10 pb-2">
                <Target size={12} />
                2. Condições de Compra
             </div>
             <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] text-white/40">Se Tick</span>
                   <span className="bg-black px-2 py-1 rounded text-[9px] text-[var(--color-accent)] font-bold border border-[var(--color-accent)]/20">Ultrapassar</span>
                   <span className="text-[10px] text-white/40">{parsedConfig.condition}</span>
                </div>
                <div className="bg-[var(--color-bg-tertiary)] px-3 py-2 rounded text-[10px] text-[var(--color-accent)] font-black italic flex items-center justify-between border border-[var(--color-accent)]/10">
                   COMPRAR: {parsedConfig.action}
                   <Zap size={10} />
                </div>
             </div>
          </motion.div>

          {/* Block 3: Sell conditions */}
          <motion.div 
            drag
            dragMomentum={false}
            className="bg-[#3D1E1E]/90 backdrop-blur-md rounded-lg border-l-4 border-[#EF4444] w-80 p-4 shadow-2xl cursor-move ml-8 relative before:content-[''] before:absolute before:-top-4 before:left-8 before:w-0.5 before:h-4 before:bg-white/10"
          >
             <div className="flex items-center gap-2 text-[10px] font-bold text-white/70 mb-3 border-b border-white/10 pb-2">
                <DollarSign size={12} />
                3. Condições de Venda (Opcional)
             </div>
             <div className="py-2 text-[10px] text-white/20 italic">
                Solte blocos aqui para vender antes do tempo...
             </div>
          </motion.div>

          {/* Block 4: Restart trading conditions */}
          <motion.div 
            drag
            dragMomentum={false}
            className="bg-[#3D3A1E]/90 backdrop-blur-md rounded-lg border-l-4 border-[#F59E0B] w-80 p-4 shadow-2xl cursor-move ml-8 relative before:content-[''] before:absolute before:-top-4 before:left-8 before:w-0.5 before:h-4 before:bg-white/10"
          >
             <div className="flex items-center gap-2 text-[10px] font-bold text-white/70 mb-3 border-b border-white/10 pb-2">
                <RefreshCcw size={12} />
                4. Reiniciar Negociação
             </div>
             <div className="space-y-3">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] text-white/40">Se Lucro</span>
                   <span className="bg-black px-2 py-1 rounded text-[9px] text-[#F59E0B] font-bold border border-[#F59E0B]/20">&gt; 10.00 USD</span>
                </div>
                <div className="bg-[var(--color-bg-tertiary)] px-3 py-2 rounded text-[10px] text-[#F59E0B] font-black italic flex items-center justify-between border border-[#F59E0B]/10">
                   PARAR NEGOCIAÇÃO
                </div>
             </div>
          </motion.div>

          </motion.div>
            </>
          ) : (
            <div className="h-full flex flex-col">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <Code2 size={14} className="text-blue-400" />
                    Código Fonte do Robô
                  </h3>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(botCode);
                      setNotifications(prev => [{
                        id: Date.now().toString(),
                        msg: "Código copiado para a área de transferência!",
                        time: new Date().toLocaleTimeString(),
                        type: "success"
                      }, ...prev]);
                    }}
                    className="text-[10px] font-bold text-blue-400 hover:underline"
                  >
                    COPIAR TUDO
                  </button>
               </div>
               <div className="flex-1 bg-black/60 rounded-2xl border border-white/5 p-6 overflow-auto custom-scrollbar font-mono text-[10px] leading-relaxed text-blue-300/80">
                  {botCode ? (
                    <pre className="whitespace-pre-wrap">{botCode}</pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                       <Code2 size={48} strokeWidth={1} />
                       <p className="mt-4 font-bold uppercase tracking-widest">Nenhum código carregado</p>
                    </div>
                  )}
               </div>
            </div>
          )}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>
      </div>
    </motion.div>
  );
};

const LessonsView = () => {
  const [openModule, setOpenModule] = useState<string | null>('basics');

  const modules = [
    { 
      id: 'basics', 
      name: 'Módulo 1: Começando do Zero', 
      icon: <Target className="text-blue-400" size={18} />,
      lessons: [
        { id: '1', title: 'Introdução ao Mercado de Opções', duration: '12:45', thumb: 'https://picsum.photos/seed/trading1/400/225' },
        { id: '3', title: 'Gestão de Banca Conservadora', duration: '15:20', thumb: 'https://picsum.photos/seed/trading3/400/225' },
      ]
    },
    { 
      id: 'strategy', 
      name: 'Módulo 2: Estratégias Avançadas', 
      icon: <Activity className="text-emerald-400" size={18} />,
      lessons: [
        { id: '2', title: 'Configurando seu Primeiro Robô', duration: '08:30', thumb: 'https://picsum.photos/seed/trading2/400/225' },
        { id: '6', title: 'Estratégia Sniper de Alta Precisão', duration: '10:40', thumb: 'https://picsum.photos/seed/trading6/400/225' },
      ]
    },
    { 
      id: 'forex', 
      name: 'Módulo 3: Operando Forex', 
      icon: <TrendingUp className="text-orange-400" size={18} />,
      lessons: [
        { id: '4', title: 'Análise de Tendência para Forex', duration: '22:15', thumb: 'https://picsum.photos/seed/trading4/400/225' },
      ]
    },
    { 
      id: 'mindset', 
      name: 'Módulo 4: Psicologia & Mindset', 
      icon: <PieChart className="text-purple-400" size={18} />,
      lessons: [
        { id: '5', title: 'Dominando o Fator Psicológico', duration: '18:10', thumb: 'https://picsum.photos/seed/trading5/400/225' },
      ]
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      <div className="bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-[2rem] p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <PlayCircle size={24} />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg leading-none">Vídeo Aulas</h2>
              <span className="text-[10px] font-bold text-blue-400 tracking-widest uppercase">Academia SmartiDigitos</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {modules.map(module => (
            <div key={module.id} className="bg-black/30 rounded-2xl border border-white/5 overflow-hidden">
              <button 
                onClick={() => setOpenModule(openModule === module.id ? null : module.id)}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    {module.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-sm sm:text-base text-white">{module.name}</h3>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{module.lessons.length} Aulas Disponíveis</p>
                  </div>
                </div>
                <ChevronDown size={20} className={`text-white/20 transition-transform ${openModule === module.id ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {openModule === module.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/[0.03]"
                  >
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {module.lessons.map(video => (
                        <div key={video.id} className="group cursor-pointer">
                          <div className="relative aspect-video rounded-xl overflow-hidden mb-2 border border-white/5">
                            <img src={video.thumb} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-10 h-10 bg-[var(--color-accent)] rounded-full flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/20 scale-75 group-hover:scale-100 transition-transform">
                                <Play className="text-[var(--color-bg-primary)] fill-current ml-1" size={16} />
                              </div>
                            </div>
                            <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[8px] font-mono font-bold">{video.duration}</div>
                          </div>
                          <h4 className="font-bold text-xs leading-tight text-white/80 group-hover:text-[var(--color-accent)] transition-colors line-clamp-1">{video.title}</h4>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const HistoryView = ({ 
  history, 
  onClear 
}: { 
  history: TradeRecord[], 
  onClear: () => void 
}) => {
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Dynamic Filtering by Market & type
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Market Filter
      if (selectedMarket !== 'all' && item.market !== selectedMarket) {
        return false;
      }
      return true;
    });
  }, [history, selectedMarket]);

  // Calculate stats based on filtered list
  const totalTrades = filteredHistory.length;
  const netProfit = filteredHistory.reduce((acc, curr) => acc + parseFloat(curr.result), 0);
  const wins = filteredHistory.filter(h => h.isWin).length;
  const winRate = totalTrades === 0 ? 0 : Math.round((wins / totalTrades) * 100);

  const marketOptions = FOREX_SYMBOLS;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      <div className="bg-[var(--color-bg-secondary)]/80 border border-white/10 rounded-[1.5rem] p-6 shadow-2xl overflow-hidden relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-right from-blue-500 to-indigo-600" />
        <div className="text-left">
          <h2 className="text-2xl font-black text-white mb-2">Histórico de Operações</h2>
          <p className="text-xs text-white/40">Filtre seus resultados por mercado de atuação ou tipo de conta</p>
        </div>
        {history.length > 0 && (
          <button 
            onClick={onClear}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-xl transition-all cursor-pointer"
          >
            <Trash2 size={14} />
            Limpar Histórico
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--color-bg-tertiary)]/60 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <FileText size={20} />
          </div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Total Operações</p>
          <p className="text-4xl font-mono font-black text-white leading-none">{totalTrades}</p>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <p className="text-[10px] font-bold text-white/30 uppercase">Operações realizadas</p>
          </div>
        </div>

        <div className="bg-[var(--color-bg-tertiary)]/60 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <DollarSign size={20} />
          </div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Lucro Total</p>
          <p className={`text-4xl font-mono font-black ${netProfit >= 0 ? 'text-[var(--color-accent)]' : 'text-red-500'} leading-none`}>
            {netProfit >= 0 ? '+' : ''}${Number(netProfit || 0).toFixed(2)}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <div className={`w-2 h-2 rounded-full ${netProfit >= 0 ? 'bg-[var(--color-accent)]' : 'bg-red-500'}`} />
            <p className="text-[10px] font-bold text-white/30 uppercase">Resultado líquido positivo</p>
          </div>
        </div>

        <div className="bg-[var(--color-bg-tertiary)]/60 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-purple-500/10 rounded-lg text-purple-400">
            <TrendingUp size={20} />
          </div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Taxa de Acerto</p>
          <p className="text-4xl font-mono font-black text-purple-400 leading-none">{winRate}%</p>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <p className="text-[10px] font-bold text-white/30 uppercase">{wins} acertos em {totalTrades} operações</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-bg-secondary)]/40 border border-white/5 rounded-[2rem] p-6 backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Data Inicial</label>
            <div className="relative">
              <input type="date" defaultValue="2026-06-01" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white/70 focus:outline-none focus:border-blue-500 transition-all cursor-pointer" />
            </div>
          </div>
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Data Final</label>
            <div className="relative">
              <input type="date" defaultValue="2026-06-02" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white/70 focus:outline-none focus:border-blue-500 transition-all cursor-pointer" />
            </div>
          </div>
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1 font-sans">Filtrar por Mercado</label>
            <div className="relative">
              <select 
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white/70 focus:outline-none focus:border-[var(--color-accent)] transition-all cursor-pointer appearance-none"
              >
                <option value="all">⚡ Todos os Mercados</option>
                {marketOptions.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Tipo</label>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white/70 focus:outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none"
            >
              <option value="all">Todas as Contas</option>
              <option value="real">Conta Real</option>
              <option value="demo">Conta Demo</option>
            </select>
          </div>
        </div>

        <div className="mt-8 bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Hora</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest font-sans">Mercado</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Método</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Entrada/Saída</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Vlr Entrada</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Lucro/Perda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredHistory.length > 0 ? (
                  <AnimatePresence initial={false}>
                    {filteredHistory.map((item) => {
                      const cleanMarket = FOREX_SYMBOLS.find(s => s.id === item.market)?.name || item.market || 'Geral';
                      return (
                        <motion.tr 
                          key={item.id} 
                          initial={{ opacity: 0, x: -15, y: -4 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-4 text-xs font-mono text-white/60">{item.time}</td>
                          <td className="px-6 py-4 text-xs font-sans font-bold text-[var(--color-accent)]">{cleanMarket}</td>
                          <td className="px-6 py-4 text-xs font-mono text-white/50 uppercase">{item.type}</td>
                          <td className="px-6 py-4 text-xs font-mono text-white/80">{item.entry} → {item.exit}</td>
                          <td className="px-6 py-4 text-xs font-mono text-white/60">${parseFloat(item.price || "0").toFixed(2)}</td>
                          <td className={`px-6 py-4 text-xs font-mono font-bold ${item.isWin ? 'text-[var(--color-accent)]' : 'text-red-500'}`}>
                            {item.isWin ? '+' : ''}${parseFloat(item.result || "0").toFixed(2)}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 opacity-20 colSpan={6}">
                        <Inbox size={48} />
                        <p className="text-sm font-bold italic tracking-wider">Nenhuma operação registrada no período ou mercado</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CurrencyConverter = () => {
  const [val, setVal] = useState(1);
  const [isUsdBase, setIsUsdBase] = useState(true);
  const [rate, setRate] = useState(5.24);
  const [isLoading, setIsLoading] = useState(true);
  const [isRealTime, setIsRealTime] = useState(true);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/rate');
        if (!response.ok) throw new Error('Falha na resposta do servidor');
        const data = await response.json();
        if (data.USDBRL) {
          setRate(Number(data.USDBRL.bid));
        }
        setIsRealTime(data.isRealTime ?? true);
      } catch (error) {
        console.error('Erro ao buscar cotação:', error);
        setIsRealTime(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRate();
    // Atualiza a cada 5 minutos
    const interval = setInterval(fetchRate, 300000);
    return () => clearInterval(interval);
  }, []);

  const result = isUsdBase ? (val * rate) : (val / rate);

  return (
    <div className="bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-[2rem] p-6 sm:p-8 backdrop-blur-md shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
            <ArrowLeftRight size={22} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight leading-none">Conversor em Tempo Real</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Base Padrão Dólar (USD)</p>
          </div>
        </div>
        
        {isLoading && (
          <div className="flex items-center gap-2">
            <RefreshCcw size={12} className="text-[var(--color-accent)] animate-spin" />
            <span className="text-[8px] font-bold text-[var(--color-accent)] uppercase tracking-widest">Sincronizando...</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">{isUsdBase ? 'Dólar (USD)' : 'Real (BRL)'}</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/20">{isUsdBase ? '$' : 'R$'}</span>
            <input 
              type="number" 
              value={val}
              onChange={(e) => setVal(Number(e.target.value))}
              className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm font-mono font-bold focus:border-pink-500 focus:outline-none transition-all"
            />
          </div>
        </div>
        
        <button 
          onClick={() => setIsUsdBase(!isUsdBase)}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all mt-6 sm:mt-0 active:rotate-180"
        >
          <RefreshCcw size={18} />
        </button>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">{isUsdBase ? 'Real (BRL)' : 'Dólar (USD)'}</label>
          <div className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-mono font-black text-[var(--color-accent)] flex items-center justify-between min-h-[46px]">
            <span>{isUsdBase ? 'R$ ' : '$ '}{Number(result || 0).toFixed(2)}</span>
            <span className="text-[8px] text-white/20 uppercase">Aprox.</span>
          </div>
        </div>
      </div>
      
      <p className="text-[9px] text-center text-white/10 uppercase tracking-[0.2em] pt-6 border-t border-white/5 mt-6">
        {isRealTime ? 'Cotação Comercial em Tempo Real' : 'Cotação Estimada (Offline)'}: 1 USD = {rate.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} BRL
      </p>
      {!isRealTime && !isLoading && (
        <p className="text-[8px] text-center text-red-500/50 uppercase tracking-widest mt-1">Conexão instável. Usando taxa de segurança.</p>
      )}
    </div>
  );
};

// Types for our history
type TradeRecord = {
  id: string;
  time: string;
  type: string;
  entry: string;
  exit: string;
  price: string;
  result: string;
  isWin: boolean;
  market?: string;
};

const VOLATILITIES = [
  { id: 'R_10', label: 'V10' },
  { id: 'R_25', label: 'V25' },
  { id: 'R_50', label: 'V50' },
  { id: 'R_100', label: 'V100' },
  { id: '1HZ10V', label: 'V10(1s)' },
  { id: '1HZ100V', label: 'V100(1s)' },
];

const BOTS = [
  { id: 'ia-teste', name: 'Bot Teste', tag: 'Operações Rápidas', color: '#06B6D4', icon: <Zap size={20} />, symbol: '1HZ100V' },
  { id: 'ia-wave', name: 'I.A Wave', tag: 'Melhor Performance', color: 'var(--color-accent)', icon: <TrendingUp size={20} />, symbol: 'R_100' },
  { id: 'ia-scalper', name: 'I.A Scalper', tag: 'Alta Velocidade', color: '#3B82F6', icon: <Activity size={20} />, symbol: '1HZ100V' },
  { id: 'ia-trend', name: 'I.A Trend', tag: 'Seguidor de Tendência', color: '#F59E0B', icon: <BarChart2 size={20} />, symbol: 'R_50' },
  { id: 'ia-sniper', name: 'I.A Sniper', tag: 'Precisão Cirúrgica', color: '#EF4444', icon: <DollarSign size={20} />, symbol: 'R_75' },
  { id: 'ia-digits-smart', name: 'Smart Digitos > 3', tag: 'Anti-Manipulação', color: '#A855F7', icon: <Target size={20} />, symbol: '1HZ10V' },
  { id: 'ia-macd-digits', name: 'I.A MACD Master', tag: 'Trend Momentum', color: '#10B981', icon: <BarChart2 size={20} />, symbol: '1HZ100V' },
];

const HistoryItemMobile = React.memo(({ item }: { item: TradeRecord }) => {
  const today = new Date().toLocaleDateString('pt-BR');
  return (
  <div key={item.id} className="px-4 py-3 space-y-2 border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
         {item.isWin ? (
           <div className="w-6 h-6 rounded-full border border-[var(--color-accent)] flex items-center justify-center bg-transparent">
             <Check size={14} strokeWidth={2.5} className="text-[var(--color-accent)]" />
           </div>
         ) : (
           <div className="w-6 h-6 rounded-full border border-[#cc4753]/40 flex items-center justify-center bg-transparent">
             <TrendingDown size={14} strokeWidth={2.5} className="text-[#cc4753]" />
           </div>
         )}
         <div className="flex flex-col">
           <span className="text-[9px] font-bold text-[#5b738b] uppercase">{today}</span>
           <span className="font-bold text-white text-[12px] tracking-tight">{item.time}</span>
         </div>
      </div>
      <span className={`inline-flex items-center justify-end font-mono text-[14px] font-black tracking-wider ${item.isWin ? 'text-[var(--color-accent)]' : 'text-[#cc4753]'}`}>
        {item.isWin ? '+' : '-'} $ {Math.abs(parseFloat(item.result || "0")).toFixed(2)}
      </span>
    </div>
    <div className="grid grid-cols-3 gap-2">
       <div className="flex items-center gap-2 col-span-3 pb-1">
         <span className="bg-[#111827] text-[var(--color-accent)] border border-[var(--color-accent)]/30 px-2 py-0.5 rounded text-[10px] tracking-widest font-black uppercase">
           {item.type}
         </span>
         <span className="text-[#5b738b] text-[11px] font-medium tracking-wide">
           Volatility 100 Index
         </span>
       </div>
       <div className="bg-[#111827] p-1.5 rounded-lg text-center border border-white/5">
         <p className="text-[9px] text-[#5b738b] uppercase mb-0.5 font-bold">Entrada</p>
         <p className="text-[11px] font-bold text-white">{item.entry}</p>
       </div>
       <div className="bg-[#111827] p-1.5 rounded-lg text-center border border-white/5">
         <p className="text-[9px] text-[#5b738b] uppercase mb-0.5 font-bold">Saída</p>
         <p className="text-[11px] font-bold text-white">{item.exit}</p>
       </div>
       <div className="bg-[#111827] p-1.5 rounded-lg text-center border border-white/5">
         <p className="text-[9px] text-[#5b738b] uppercase mb-0.5 font-bold">Preço</p>
         <p className="text-[11px] font-bold text-[#8d9eb0]">$ {Math.abs(parseFloat(item.price || "0")).toFixed(2)}</p>
       </div>
    </div>
  </div>
  );
});

interface ToastProps {
  notification: any;
  onRemove: (id: string) => void;
  key?: string;
}

const Toast = ({ notification, onRemove }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(notification.id), 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onRemove]);

  const typeConfig = {
    success: { icon: <CheckCircle2 size={16} />, color: 'text-[var(--color-accent)]', bg: 'bg-[var(--color-accent)]/10', border: 'border-[var(--color-accent)]/20' },
    error: { icon: <AlertCircle size={16} />, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    warning: { icon: <AlertTriangle size={16} />, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    info: { icon: <Bell size={16} />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  };

  const config = typeConfig[notification.type as keyof typeof typeConfig] || typeConfig.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`flex items-start gap-4 p-4 rounded-2xl border ${config.bg} ${config.border} shadow-2xl backdrop-blur-xl min-w-[280px] max-w-[320px] pointer-events-auto`}
    >
      <div className={`${config.color}`}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white mb-0.5">{notification.msg}</p>
        <p className="text-[9px] font-mono text-white/30 uppercase">{notification.time}</p>
      </div>
      <button onClick={() => onRemove(notification.id)} className="text-white/20 hover:text-white transition-colors shrink-0">
        <X size={14} />
      </button>
    </motion.div>
  );
};

const ToastContainer = ({ notifications, onRemove }: { notifications: any[], onRemove: (id: string) => void }) => {
  return (
    <div className="fixed top-4 right-4 z-[300] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map(n => (
          <Toast key={n.id} notification={n} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const LiveClock = React.memo(() => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour12: false }));
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('pt-BR', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  return <span className="font-mono text-xs sm:text-sm font-black italic tracking-widest text-[var(--color-accent)] drop-shadow-[0_0_8px_rgba(0,209,143,0.3)]">{time}</span>;
});

const TradingSignals = ({ symbol, tick }: { symbol: string, tick: any }) => {
  return (
    <div className="w-full h-full">
      {/* Price Quote Card */}
      <div className="p-3 sm:p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between shadow-xl h-full w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
            <DollarSign size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-none mb-1">Cotação Realtime</p>
            <p className="text-sm sm:text-base font-mono font-black text-[var(--color-accent)] italic leading-none drop-shadow-[0_0_10px_rgba(0,209,143,0.3)]">
              {tick 
                ? tick.quote.toLocaleString('en-US', { minimumFractionDigits: (symbol.startsWith('R_') || symbol === 'BTCUSD') ? 2 : 5 }) 
                : '---'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider text-emerald-400/70">Ao Vivo</span>
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse shadow-[0_0_8px_var(--color-accent)]" />
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const { user: fbUser, clients: fbClients, plans: fbPlans, history: fbHistory, customBots: fbBots, loginFirebase, addHistory: fbAddHistory, clearHistory: fbClearHistory, upsertClient: fbUpsertClient, removeClient: fbRemoveClient, upsertPlan: fbUpsertPlan, removePlan: fbRemovePlan, upsertBot: fbUpsertBot, removeBot: fbRemoveBot, isLoadingDb } = useFirebaseSync();

  const { account, logout, switchAccount, logining, refreshAccount, login, isLoading, loginDemoAccount, updateDemoBalance } = useDerivAuth();
  const { status: connStatus } = useDerivConnection();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  useEffect(() => {
    (window as any).isMuted = isMuted;
  }, [isMuted]);
  
  const [selectedVol, setSelectedVol] = useState(VOLATILITIES[3].id); // Default V100
  const customBots = fbBots || [];
  
  const allBots = React.useMemo(() => [...BOTS, ...customBots], [customBots]);
  const [selectedBotId, setSelectedBotId] = useState(allBots[0].id);
  const handleBotSelect = (id: string) => {
    const bot = allBots.find(b => b.id === id);
    if (bot) {
      setSelectedBotId(id);
      if (bot.symbol) {
        setSelectedVol(bot.symbol);
      }
      
      const newNotif: {id: string, msg: string, time: string, type: 'success'} = {
        id: Math.random().toString(36).substr(2, 9),
        msg: `Robô ${bot.name} carregado com sucesso!`,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        type: 'success'
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 100));
    }
  };
  const [isBotSelectOpen, setIsBotSelectOpen] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  
  const selectedBot = allBots.find(b => b.id === selectedBotId) || allBots[0];
  
  const [currentView, setCurrentView] = useState<'bot' | 'forex' | 'management' | 'lessons' | 'history' | 'builder' | 'double' | 'simulation'>('bot');
  
  const forexSymbols = React.useMemo(() => {
    return currentView === 'forex' ? FOREX_SYMBOLS.map(s => s.id) : [];
  }, [currentView]);
  const forexTicks = useDerivMultiTicks(forexSymbols, account?.loginid);
  
  const { lastTick, digits, stats, isConnected } = useDeriv(selectedVol, account?.loginid);
  const [tickHistory, setTickHistory] = useState<TickData[]>([]);

  const lastDigit = digits.slice(-1)[0];
  const lastTenDigits = digits.slice(-10);

  const recommendation = useMemo(() => {
    const over = stats.filter(s => s.digit >= 5).reduce((acc, s) => acc + s.percentage, 0);
    const under = stats.filter(s => s.digit < 5).reduce((acc, s) => acc + s.percentage, 0);
    if (over > under + 8) return 'OVER';
    if (under > over + 8) return 'UNDER';
    return 'WAIT';
  }, [stats]);

  useEffect(() => {
    if (lastTick) {
      setTickHistory(prev => [lastTick, ...prev].slice(0, 5));
    }
  }, [lastTick]);
  const [instagramLink, setInstagramLink] = useState(() => localStorage.getItem('link_instagram') || 'https://instagram.com');
  const [tiktokLink, setTiktokLink] = useState(() => localStorage.getItem('link_tiktok') || 'https://tiktok.com');
  const [whatsappLink, setWhatsappLink] = useState(() => localStorage.getItem('link_whatsapp') || 'https://wa.me/5588981598255');
  const [suporteLink, setSuporteLink] = useState(() => localStorage.getItem('link_suporte') || 'https://suporte.com');
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [activeStatusTab, setActiveStatusTab] = useState('Analisando');
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [stake, setStake] = useState('0.35');
  const [stopLoss, setStopLoss] = useState('0');
  const [stopWin, setStopWin] = useState('0');
  const [profiles, setProfiles] = useState<{id: string, name: string, stake: string, stopLoss: string, stopWin: string, botDirection?: 'OVER' | 'UNDER', botBarrierDigit?: number}[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [isClassicMode, setIsClassicMode] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [themePreset, setThemePreset] = useState<'default' | 'emerald-night' | 'oceanic'>('default');

  useEffect(() => {
    if (themePreset === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themePreset);
    }
  }, [themePreset]);
  
  // Custom Over/Under configurations for Bot Teste
  const [botDirection, setBotDirection] = useState<'OVER' | 'UNDER'>('OVER');
  const [botBarrierDigit, setBotBarrierDigit] = useState<number>(3);

  useEffect(() => {
    const saved = localStorage.getItem('main_robot_profiles');
    if (saved) {
      try { setProfiles(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const saveProfile = () => {
    if (!profileName.trim()) return;
    const newProfile = {
      id: Date.now().toString(),
      name: profileName,
      stake,
      stopLoss,
      stopWin,
      botDirection,
      botBarrierDigit
    };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('main_robot_profiles', JSON.stringify(updated));
    setProfileName('');
    setNotifications(prev => [{
      id: Date.now().toString(),
      msg: 'Configuração salva com sucesso!',
      time: new Date().toLocaleTimeString(),
      type: 'success'
    }, ...prev]);
  };

  const loadProfile = (p: any) => {
    setStake(p.stake);
    setStopLoss(p.stopLoss);
    setStopWin(p.stopWin);
    if (p.botDirection) setBotDirection(p.botDirection);
    if (p.botBarrierDigit !== undefined) setBotBarrierDigit(p.botBarrierDigit);
    setNotifications(prev => [{
      id: Date.now().toString(),
      msg: `Perfil ${p.name} carregado!`,
      time: new Date().toLocaleTimeString(),
      type: 'info'
    }, ...prev]);
  };
  
  // Real robot logic for the main view
  const currentStrategy: Strategy = useMemo(() => {
    if (selectedBot.id === 'ia-teste') {
      return {
        id: 'ia-teste',
        name: 'Bot Teste',
        type: 'fast' as any,
        result: botDirection,
        barrier: botBarrierDigit
      };
    }
    if (selectedBot.id === 'ia-wave') {
      return {
        id: 'ia-wave',
        name: 'I.A Wave AI',
        type: 'wave',
        result: recommendation === 'WAIT' ? 'OVER' : recommendation as any,
        barrier: 4
      };
    }
    if (selectedBot.id === 'ia-trend') {
      return {
        id: 'ia-trend',
        name: 'IA Trend',
        sequence: ['P', 'P', 'P'],
        result: 'P'
      };
    }
    if (selectedBot.id === 'ia-sniper') {
      return {
        id: 'ia-sniper',
        name: 'IA Sniper',
        sequence: ['I', 'I', 'I', 'I'],
        result: 'P'
      };
    }
    if (selectedBot.id === 'ia-digits-smart' || selectedBot.id === 'ia-macd-digits') {
      return {
        id: selectedBot.id,
        name: selectedBot.name,
        type: 'smart_digits' as any,
        result: 'OVER',
        barrier: 3
      };
    }
    // Default strategy
    return {
      id: 'default',
      name: 'Over 2',
      sequence: ['I', 'I'],
      result: 'P'
    };
  }, [selectedBot.id, recommendation, botDirection, botBarrierDigit]);

  const handleAddTrade = useCallback((trade: any) => {
    const tradeWithMarket = {
      ...trade,
      id: trade.id || `trade-${Date.now()}`,
      market: trade.market || selectedVol
    };
    fbAddHistory(tradeWithMarket);
    if (account?.loginid?.includes('DEMO')) {
      const profitNum = parseFloat(trade.result);
      if (!isNaN(profitNum)) {
        updateDemoBalance(profitNum);
      }
    }
  }, [selectedVol, fbAddHistory, account?.loginid, updateDemoBalance]);

  const { logs: robotLogs, isTrading, stats: robotStats, isPaused, status: robotStatus, resume } = useRobot(
    selectedVol,
    currentStrategy,
    parseFloat(stake),
    isBotRunning && currentView === 'bot',
    playNotificationSound,
    handleAddTrade,
    { stopLoss: parseFloat(stopLoss), stopWin: parseFloat(stopWin) }
  );
  const [selectedForexId, setSelectedForexId] = useState(FOREX_SYMBOLS[0].id);
  const [forexSignal, setForexSignal] = useState<any>(null);
  const [showDigitChart, setShowDigitChart] = useState(true);
  const [isVolMenuOpen, setIsVolMenuOpen] = useState(false);
  
  const selectedForex = FOREX_SYMBOLS.find(s => s.id === selectedForexId) || FOREX_SYMBOLS[0];

  // history is managed via useFirebaseSync
  const history = fbHistory || [];
  
  const [notifications, setNotifications] = useState<{id: string, msg: string, time: string, type?: 'success' | 'error' | 'warning' | 'info'}[]>(() => {
    const saved = localStorage.getItem('system_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [
      { id: 'n-init-1', msg: '🔥 Bem-vindo ao painel de inteligência artificial! Conecte-se e ative seus bots.', time: '12:00:00', type: 'info' },
      { id: 'n-init-2', msg: '⚙️ Nova atualização aplicada: Sistema de filtros no Histórico habilitado.', time: '11:30:00', type: 'success' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('system_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
  }, []);

  // CRM State declarations for Client CRM & Plan CRM
  const clients = fbClients;
  const setClients = (clientsArray: any[]) => {
      // Stub: in new paradigm, mutations should go through fbUpsertClient/fbRemoveClient
      // But components might expect setClients.
  };

  const plans = fbPlans;
  const setPlans = (plansArray: any[]) => {
      // Stub
  };

  const [simulatedBlockedClient, setSimulatedBlockedClient] = useState<string | null>(null);
  const [localBypass, setLocalBypass] = useState(false);

  const blockedUserClient = React.useMemo(() => {
    // 1. Check if simulated bypass is active
    if (simulatedBlockedClient) {
      return clients.find(c => c.id === simulatedBlockedClient) || null;
    }
    
    // 2. Check if logged-in account is blocked
    if (!account || localBypass) return null;
    const userEmail = (account.email || '').toLowerCase().trim();
    const userLoginId = (account.loginid || '').toLowerCase().trim();
    
    return clients.find(client => {
      // Check if client has a valid active plan in registered plans
      const hasActivePlan = client.planId && plans.some(p => p.id === client.planId);
      if (!hasActivePlan) return false;

      const days = getDaysRemaining(client.expirationDate);
      const isMatch = (client.email && userEmail && client.email.toLowerCase().trim() === userEmail) ||
                      (client.email && userLoginId && client.email.toLowerCase().trim() === userLoginId);
                      
      return isMatch && days <= 0;
    });
  }, [account, clients, plans, simulatedBlockedClient, localBypass]);

  const showBlocker = !!blockedUserClient;

  const addNotification = useCallback((msg: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotifications(prev => [
      {
        id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        msg,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type
      },
      ...prev
    ].slice(0, 100));
  }, []);

  // Decouple active transient toasts state from total notifications state array
  const [activeToasts, setActiveToasts] = useState<any[]>([]);
  const lastToastId = useRef<string | null>(null);

  useEffect(() => {
    const latest = notifications[0];
    if (latest && latest.id !== lastToastId.current) {
      if (isMounted.current) {
        setActiveToasts(prev => [latest, ...prev].slice(0, 5));
        
        // Play notification sound based on type
        let soundType: 'win' | 'loss' | 'signal' | 'success' | 'alert' = 'alert';
        if (latest.type === 'error') {
          soundType = 'loss';
        } else if (latest.type === 'success') {
          soundType = 'win';
        } else if (latest.type === 'warning' || latest.type === 'info') {
          soundType = 'alert';
        } else {
          soundType = 'signal';
        }
        playNotificationSound(soundType);
      }
      lastToastId.current = latest.id;
    } else if (!latest) {
      lastToastId.current = '';
    }
  }, [notifications]);

  // Automatic daily scans for near expiry & expired subscriptions
  useEffect(() => {
    if (clients.length === 0) return;
    const todayStr = new Date().toDateString();
    const alreadyNotified = localStorage.getItem('crm_notified_date') === todayStr;

    if (!alreadyNotified) {
      const newAlerts: any[] = [];
      clients.forEach(client => {
        const days = getDaysRemaining(client.expirationDate);
        if (days <= 0) {
          newAlerts.push({
            id: `alert-vencido-${client.id}-${Date.now()}`,
            msg: `⚠️ O plano do cliente "${client.name}" (${client.email}) está VENCIDO! O acesso à conta foi suspenso/bloqueado.`,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            type: 'error'
          });
        } else if (days > 0 && days <= 3) {
          newAlerts.push({
            id: `alert-avencer-${client.id}-${Date.now()}`,
            msg: `🔔 O plano do cliente "${client.name}" (${client.email}) está perto de vencer. Restam apenas ${days} dia(s)!`,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            type: 'warning'
          });
        }
      });

      if (newAlerts.length > 0) {
        setNotifications(prev => {
          const filtered = prev.filter(n => !n.id.startsWith('alert-'));
          return [...newAlerts, ...filtered].slice(0, 100);
        });
        localStorage.setItem('crm_notified_date', todayStr);
      }
    }
  }, [clients]);

  const [isCreateNotificationModalOpen, setIsCreateNotificationModalOpen] = useState(false);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const removeToast = useCallback((id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Clock logic removed from App for performance
  
  const lastStatus = useRef(robotStatus);
  useEffect(() => {
    if (robotStatus !== lastStatus.current) {
      lastStatus.current = robotStatus;
    }
  }, [robotStatus]);
  
  // Data for the Digit Movement Chart (last 25 ticks)
  const movementData = digits.slice(-25).map((d, i) => ({
    name: i,
    digit: d
  }));

  const handleAddBot = async (newBot: any) => {
    // Strip the JSX icon before saving to Firebase
    const botToSave = { ...newBot, icon: 'custom-icon' };
    await fbUpsertBot(botToSave);
    
    // Auto-select and notify via the centralized handler
    handleBotSelect(newBot.id);
  };

  useEffect(() => {
    if (account) {
      console.log('Account changed to:', account.loginid, account.isVirtual ? '(Demo)' : '(Real)');
    }
  }, [account]);

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  
  const [systemUser, setSystemUser] = useState<{ id: string, role: 'admin' | 'trader', name: string, email?: string, avatar?: string, modules?: any } | null>(() => {
    const savedSysUser = localStorage.getItem('system_user');
    if (savedSysUser) {
      try { return JSON.parse(savedSysUser); } catch(e) {}
    }
    return null;
  });
  const [sysLoginStr, setSysLoginStr] = useState('');
  const [sysLoginPass, setSysLoginPass] = useState('');

  const handleSystemLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const loginStr = sysLoginStr.trim().toLowerCase();
    
    if (loginStr === 'admin') {
      const adminPassCheck = localStorage.getItem('admin_password') || 'admin';
      if (sysLoginPass === adminPassCheck) {
        const adminUser = { id: 'admin', role: 'admin' as const, name: 'Administrador Principal', avatar: '👑' };
        setSystemUser(adminUser);
        localStorage.setItem('system_user', JSON.stringify(adminUser));
      } else {
        alert('Credenciais de Administrador incorretas!');
      }
    } else {
      const activeClient = clients.find(c => c.email.toLowerCase() === loginStr && c.password === sysLoginPass);
      if (activeClient) {
        const traderUser = { id: activeClient.id, role: 'trader' as const, name: activeClient.name, email: activeClient.email, avatar: activeClient.avatar, modules: activeClient.modules || { smartDigitos: true, forex: true, double: true } };
        setSystemUser(traderUser);
        localStorage.setItem('system_user', JSON.stringify(traderUser));
      } else {
        alert('Login não encontrado ou senha incorreta!');
      }
    }
  };

  const logoutSystem = () => {
    setSystemUser(null);
    localStorage.removeItem('system_user');
  };

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ name: '', email: '', password: '', whatsapp: '', avatar: '👤' });

  const handleOpenProfileModal = () => {
    if (!systemUser) return;
    let dataToLoad = { name: systemUser.name, email: systemUser.email || '', password: '', whatsapp: '', avatar: systemUser.avatar || '👤' };
    if (systemUser.role === 'admin') {
       dataToLoad.password = localStorage.getItem('admin_password') || 'admin';
    } else {
       const client = clients.find(c => c.id === systemUser.id);
       if (client) {
          dataToLoad = { name: client.name, email: client.email, password: client.password || '', whatsapp: client.whatsapp || '', avatar: client.avatar || '👤' };
       }
    }
    setProfileFormData(dataToLoad);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemUser) return;
    
    // update systemUser
    const newSys = { ...systemUser, name: profileFormData.name, email: profileFormData.email, avatar: profileFormData.avatar };
    
    if (systemUser.role === 'admin') {
      localStorage.setItem('admin_password', profileFormData.password);
      setSystemUser(newSys);
      localStorage.setItem('system_user', JSON.stringify(newSys));
      alert('Perfil Admin atualizado com sucesso!');
    } else {
      const client = clients.find(c => c.id === systemUser.id);
      if (client) {
        await fbUpsertClient({
          ...client,
          name: profileFormData.name,
          email: profileFormData.email,
          password: profileFormData.password,
          whatsapp: profileFormData.whatsapp,
          avatar: profileFormData.avatar
        });
        setSystemUser(newSys);
        localStorage.setItem('system_user', JSON.stringify(newSys));
        alert('Perfil Trader atualizado!');
      }
    }
    setIsProfileModalOpen(false);
  };
  // UI renders immediately without blocking on background network connections

  if (!systemUser) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-white font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[var(--color-bg-secondary)] rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl">
          <div className="flex justify-center mb-8">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[var(--color-accent)] to-[#1ca1ff] flex items-center justify-center shadow-[0_0_15px_var(--color-accent)]">
                 <Activity size={24} className="text-white" />
               </div>
               <span className="text-2xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                 SMART<span className="text-[var(--color-accent)]">BULL</span>
               </span>
             </div>
          </div>
          <form onSubmit={handleSystemLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-wider pl-1">
                Usuário ou Email
              </label>
              <input
                type="text"
                required
                value={sysLoginStr}
                onChange={e => setSysLoginStr(e.target.value)}
                placeholder="admin ou trader@email.com"
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-[var(--color-accent)] focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-wider pl-1">Senha</label>
              <input
                type="password"
                required
                value={sysLoginPass}
                onChange={e => setSysLoginPass(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-[var(--color-accent)] focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[var(--color-accent)] hover:brightness-110 text-black font-black text-sm uppercase tracking-widest py-4 rounded-2xl mt-4 transition-all shadow-lg active:scale-[0.98]"
            >
              Entrar
            </button>
            <div className="pt-2 text-center space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const guestUser = { id: 'admin', role: 'admin' as const, name: 'Trader de Testes (Convidado)', avatar: '🚀' };
                  setSystemUser(guestUser);
                  localStorage.setItem('system_user', JSON.stringify(guestUser));
                  loginDemoAccount();
                }}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs uppercase tracking-wider py-3.5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>🧪</span>
                <span>Entrar Direto para Testar (Sem App ID)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSysLoginStr('admin');
                  setSysLoginPass(localStorage.getItem('admin_password') || 'admin');
                }}
                className="text-[11px] text-[var(--color-accent)]/80 hover:text-[var(--color-accent)] underline transition-colors block mx-auto"
              >
                Preencher Acesso Admin (admin / admin)
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-white font-sans selection:bg-[var(--color-accent)]/30 flex flex-col pb-20 sm:pb-4 overflow-x-hidden">
      {!account && (
        <TokenLinkOverlay 
          onConnect={login} 
          onOpenRegister={() => setIsRegisterModalOpen(true)} 
          onEnterDemoMode={loginDemoAccount} 
        />
      )}
      
      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isSideMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSideMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            
            {/* Sidebar */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-[var(--color-bg-tertiary)] border-r border-white/5 z-[210] flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[var(--color-accent)] rounded-lg flex items-center justify-center">
                    <TrendingUp size={18} className="text-[var(--color-bg-primary)]" />
                  </div>
                  <span className="font-black text-lg tracking-tighter uppercase">SmartiDigitos</span>
                </div>
                <button 
                  onClick={() => setIsSideMenuOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {(systemUser?.role === 'admin' || systemUser?.modules?.smartDigitos) && (
                  <>
                    <button 
                      onClick={() => {
                        setCurrentView('bot');
                        setIsSideMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-sm transition-all text-left ${currentView === 'bot' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                    >
                      <Home size={18} />
                      SmartiDigitos
                    </button>

                    <button 
                      onClick={() => {
                        setCurrentView('builder');
                        setIsSideMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-sm transition-all group text-left ${currentView === 'builder' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                    >
                      <Cpu size={18} className={currentView === 'builder' ? 'text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)]'} />
                      Bot Builder
                    </button>
                  </>
                )}

                {(systemUser?.role === 'admin' || systemUser?.modules?.forex) && (
                  <button 
                    onClick={() => {
                      setCurrentView('forex');
                      setIsSideMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-sm transition-all text-left group ${currentView === 'forex' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                  >
                    <BarChart2 size={18} className={currentView === 'forex' ? 'text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)]'} />
                    Forex/Indice
                  </button>
                )}

                {(systemUser?.role === 'admin' || systemUser?.modules?.double) && (
                  <button 
                    onClick={() => {
                      setCurrentView('double');
                      setIsSideMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-sm transition-all group text-left ${currentView === 'double' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                  >
                    <Activity size={18} className={currentView === 'double' ? 'text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)]'} />
                    Double
                  </button>
                )}

                {systemUser?.role === 'admin' && (
                  <button 
                    onClick={() => {
                      setCurrentView('management');
                      setIsSideMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-sm transition-all group text-left ${currentView === 'management' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                  >
                    <Briefcase size={18} className={currentView === 'management' ? 'text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)]'} />
                    CRM de Clientes
                  </button>
                )}

                <button 
                  onClick={() => {
                    setCurrentView('simulation');
                    setIsSideMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-sm transition-all group text-left ${currentView === 'simulation' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                >
                  <Calculator size={18} className={currentView === 'simulation' ? 'text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)]'} />
                  Simulação de Metas
                </button>

                <button 
                  onClick={() => {
                    setCurrentView('lessons');
                    setIsSideMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-sm transition-all group text-left ${currentView === 'lessons' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                >
                  <PlayCircle size={18} className={currentView === 'lessons' ? 'text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)]'} />
                  Vídeo Aulas
                </button>

                <button 
                  onClick={() => {
                    setCurrentView('history');
                    setIsSideMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-sm transition-all group text-left ${currentView === 'history' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                >
                  <History size={18} className={currentView === 'history' ? 'text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)]'} />
                  Histórico
                </button>

                {systemUser?.role === 'admin' && (
                  <button 
                    onClick={() => {
                      setIsCreateNotificationModalOpen(true);
                      setIsSideMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-white font-bold text-sm transition-all group text-left cursor-pointer"
                  >
                    <Bell size={18} className="text-yellow-500/50 group-hover:text-yellow-400" />
                    Criar Avisos
                  </button>
                )}

                <a 
                  href={suporteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-white font-bold text-sm transition-all group text-left"
                >
                  <LifeBuoy size={18} className="group-hover:text-[var(--color-accent)]" />
                  Suporte
                  <ExternalLink size={14} className="ml-auto opacity-20" />
                </a>

                <div className="pt-4 pb-2 px-4 flex items-center justify-between">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Social</p>
                  <button 
                    onClick={() => setIsLinksModalOpen(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-white/40 hover:text-[var(--color-accent)] transition-all bg-white/5 hover:bg-[var(--color-accent)]/10 px-2 py-1 rounded-md border border-white/5 cursor-pointer"
                  >
                    <Settings size={10} />
                    <span>Editar</span>
                  </button>
                </div>

                <a 
                  href={instagramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-white font-bold text-sm transition-all group"
                >
                  <Instagram size={18} className="group-hover:text-[#E4405F]" />
                  Instagram
                </a>

                <a 
                  href={tiktokLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-white font-bold text-sm transition-all group"
                >
                  <Music2 size={18} className="group-hover:text-[#FF0050]" />
                  TikTok
                </a>

                <a 
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-white font-bold text-sm transition-all group"
                >
                  <MessageCircle size={18} className="group-hover:text-[#25D366]" />
                  WhatsApp
                </a>
              </div>

              <div className="p-6 border-t border-white/5">
                <div className="bg-[var(--color-bg-secondary)]/50 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-2">Versão do App</p>
                  <p className="text-xs font-mono font-bold text-[var(--color-accent)] mb-4">v2.4.0 <span className="text-white/20 ml-1">PRO</span></p>
                  
                  <button className="w-full flex items-center justify-center gap-2 bg-[var(--color-accent)] text-[var(--color-bg-primary)] py-2.5 rounded-xl font-bold text-xs uppercase tracking-tight hover:brightness-110 transition-all active:scale-[0.98]">
                    <Download size={14} />
                    Instalar App
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-3 sm:px-4 lg:px-6 bg-[var(--color-bg-primary)] border-b border-white/5 sticky top-0 z-[250] shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setIsSideMenuOpen(true)}
            className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg text-white/60 hover:text-white transition-all active:scale-95"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-[0_0_15px_rgba(0,209,143,0.3)] shrink-0">
              <TrendingUp size={18} className="text-[var(--color-bg-primary)]" />
            </div>
            <span className="text-[16px] sm:text-xl font-bold tracking-tight hidden md:block uppercase">SmartiDigitos</span>
          </div>
          
          <button 
            onClick={() => derivService.connect().catch(() => {})}
            title="Status da conexão com a Deriv (clique para reconectar)"
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 transition-all rounded-xl border border-white/5 cursor-pointer"
          >
            <div className={`w-2 h-2 rounded-full ${
              connStatus === ConnectionStatus.CONNECTED ? 'bg-[#76D130] shadow-[0_0_8px_#76D130]' : 
              connStatus === ConnectionStatus.CONNECTING || connStatus === ConnectionStatus.RECONNECTING ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`} />
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest whitespace-nowrap hidden sm:block sm:ml-2">
              {connStatus === ConnectionStatus.CONNECTED ? 'SISTEMA ONLINE' : 
               connStatus === ConnectionStatus.CONNECTING ? 'CONECTANDO...' :
               connStatus === ConnectionStatus.RECONNECTING ? 'RECONECTANDO...' : 
               'OFFLINE (RECONECTAR)'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden lg:flex px-3 py-1 bg-white/5 rounded-lg border border-white/5">
            <LiveClock />
          </div>
          {currentView !== 'bot' && (
            <div className="px-2 py-1.5 hidden sm:flex flex-col text-right">
              <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.1em] leading-none mb-0.5">Saldo Disponível</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-mono tracking-wider font-extrabold text-[var(--color-accent)] leading-none">
                  {account?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0,00'}
                </span>
                <span className="text-xs opacity-50 font-sans text-white/30 font-bold flex items-center gap-1">
                  {account?.currency || 'USD'}
                  {logining ? (
                    <RefreshCcw size={12} className="text-[var(--color-accent)] animate-spin" />
                  ) : (
                    <RefreshCcw 
                      onClick={() => refreshAccount()}
                      size={12} 
                      className="cursor-pointer hover:text-white transition-colors" 
                    />
                  )}
                </span>
              </div>
            </div>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all relative"
            >
              <Bell size={20} className={notifications.length > 0 ? "text-[var(--color-accent)]" : ""} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#EF4444] rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-[var(--color-bg-primary)] text-white">
                  {notifications.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <>
                  <div className="fixed inset-0 z-[110]" onClick={() => setIsNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed sm:absolute top-[70px] sm:top-full left-4 sm:left-auto right-4 sm:right-0 sm:mt-3 sm:w-72 bg-[var(--color-bg-tertiary)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[120] p-3"
                  >
                  <div className="flex items-center justify-between mb-3 px-2">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Notificações</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setIsCreateNotificationModalOpen(true);
                          setIsNotifOpen(false);
                        }} 
                        className="text-[9px] font-black text-amber-400 hover:text-amber-300 transition-all uppercase flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded cursor-pointer border border-amber-500/10"
                      >
                        Criar
                      </button>
                      <button onClick={() => setNotifications([])} className="text-[9px] font-bold text-[var(--color-accent)] hover:underline uppercase cursor-pointer">Limpar</button>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className={`p-3 rounded-xl border transition-colors ${
                        n.type === 'success' ? 'bg-[var(--color-accent)]/5 border-[var(--color-accent)]/10' :
                        n.type === 'error' ? 'bg-red-500/5 border-red-500/10' :
                        'bg-white/5 border-white/5'
                      } hover:bg-white/10`}>
                        <p className="text-[11px] font-bold text-white leading-snug">{n.msg}</p>
                        <p className="text-[9px] font-mono text-white/30 mt-1">{n.time}</p>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center py-8 opacity-20">
                        <Bell size={32} strokeWidth={1} />
                        <p className="text-[10px] uppercase font-black tracking-widest mt-2">Sem sinais</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <div 
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className="flex items-center gap-2 bg-[var(--color-bg-secondary)] px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="w-6 h-6 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center font-bold text-xs ring-1 ring-[var(--color-accent)]/20 overflow-hidden shrink-0">
                {(systemUser?.avatar?.startsWith('data:') || systemUser?.avatar?.startsWith('http')) ? (
                  <img src={systemUser?.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  systemUser?.avatar || '👤'
                )}
              </div>
              <span className="text-[10px] font-black tracking-widest text-[#5b738b] uppercase hidden sm:block">
                {systemUser?.name?.split(' ')[0]}
              </span>
              <ChevronDown size={14} className={`text-white/20 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
              {isAccountMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[110]" onClick={() => setIsAccountMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed sm:absolute top-[70px] sm:top-full left-4 sm:left-auto right-4 sm:right-0 sm:mt-2 sm:w-64 bg-[var(--color-bg-tertiary)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[120] p-2"
                  >
                    <p className="px-3 py-2 text-[9px] font-black text-white/20 uppercase tracking-widest">SISTEMA SMARTBULL</p>
                    
                    <button 
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        handleOpenProfileModal();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all text-left text-xs font-bold"
                    >
                      <User size={14} />
                      Editar Perfil local
                    </button>

                    <div className="h-px bg-white/5 my-2" />

                    {account && (
                      <div className="space-y-1 mb-2">
                        <p className="px-3 py-1 text-[9px] font-black text-white/10 uppercase tracking-widest">Contas Deriv</p>
                        {account.accounts?.map((acc) => (
                          <button
                            key={acc.loginid}
                            onClick={() => {
                              if (acc.loginid !== account.loginid) switchAccount(acc.loginid);
                              setIsAccountMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${acc.loginid === account.loginid ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                          >
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-bold font-mono">{acc.loginid}</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded w-fit mt-1 ${acc.isVirtual ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                {acc.isVirtual ? 'DEMO' : 'REAL'}
                              </span>
                            </div>
                            {acc.loginid === account.loginid && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {!fbUser ? (
                      <button 
                        onClick={loginFirebase}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-500/60 hover:text-blue-500 hover:bg-blue-500/10 transition-all text-left text-xs font-bold mb-2"
                      >
                        <RefreshCcw size={14} />
                        Sincronizar Cloud
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-500/10 text-blue-500 mb-2 transition-all">
                        <div className="flex items-center gap-2">
                          <Check size={14} />
                          <span className="text-[10px] font-bold">Nuvem Ativa</span>
                        </div>
                        {fbUser.photoURL && <img src={fbUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full" />}
                      </div>
                    )}

                    <div className="flex gap-2">
                       {account && (
                         <button 
                           onClick={() => {
                             logout();
                             setIsAccountMenuOpen(false);
                           }}
                           className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-orange-500/60 hover:text-orange-500 hover:bg-orange-500/10 transition-all text-left text-xs font-bold"
                         >
                           <LogOut size={14} />
                           Desconectar
                         </button>
                       )}
                       <button 
                         onClick={logoutSystem}
                         className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all text-left text-xs font-bold"
                       >
                         Sair do App
                       </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className={`flex-1 ${currentView === 'forex' ? 'max-w-none px-2 sm:px-4' : 'max-w-5xl mx-auto'} w-full p-3 sm:p-4 space-y-4 pt-4 sm:pt-6`}>
        {currentView === 'bot' && (
          <>
          {isClassicMode ? (
            <div className="flex flex-col gap-4">
              <div className="bg-[var(--color-bg-secondary)]/30 border border-white/5 rounded-[2rem] p-6 lg:p-10 flex flex-col shadow-2xl relative z-[100] backdrop-blur-md">
                
                {/* Top Row: Buttons */}
                <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4 mb-6 sm:mb-10 relative z-[200]">
                  {/* Bot Selector style for Classic Mode */}
                  <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
                    <button onClick={() => setShowConfig(!showConfig)} className="w-12 h-12 shrink-0 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-all">
                      <Settings size={20} />
                    </button>
                    <div className="flex items-center justify-between flex-1 md:flex-none gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 relative z-50 cursor-pointer" onClick={() => setIsBotSelectOpen(true)}>
                      <span className="text-sm font-bold text-white truncate">{selectedBot.name}</span>
                      <Settings size={14} className="text-[var(--color-accent)] shrink-0" />
                      
                      <AnimatePresence>
                        {isBotSelectOpen && (
                          <>
                            <div className="fixed inset-0 z-[140]" onClick={(e) => { e.stopPropagation(); setIsBotSelectOpen(false); }} />
                            <motion.div 
                              initial={{ opacity: 0, y: 15, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.9 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 18, mass: 0.8 }}
                              className="absolute left-0 top-full mt-2 w-full min-w-[200px] sm:w-64 bg-[var(--color-bg-tertiary)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[150]"
                            >
                              <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
                                <p className="px-3 py-2 text-[9px] font-bold text-white/30 uppercase tracking-widest">Selecione o Robô</p>
                                {allBots.map((bot) => (
                                  <button
                                    key={bot.id}
                                    onClick={(e) => { e.stopPropagation(); handleBotSelect(bot.id); setIsBotSelectOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${selectedBot.id === bot.id ? 'bg-white/5' : 'hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                                  >
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${bot.color}15`, color: bot.color }}>
                                      {React.isValidElement(bot.icon) ? React.cloneElement(bot.icon as React.ReactElement, { size: 16 }) : <TrendingUp size={16} />}
                                    </div>
                                    <div className="flex flex-col items-start min-w-0 flex-1 text-left">
                                      <span className="text-sm font-bold text-white truncate w-full">{bot.name}</span>
                                    </div>
                                    {selectedBot.id === bot.id && <Check size={14} className="text-[var(--color-accent)] shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-stretch gap-2 h-12 w-full md:w-auto">
                    <button 
                      onClick={() => setIsBotRunning(!isBotRunning)}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 rounded-xl font-bold text-sm tracking-wider uppercase transition-all cursor-pointer ${
                        isBotRunning ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 active:scale-95' : 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:brightness-110 active:scale-95'
                      }`}
                    >
                      {isBotRunning ? <Square fill="currentColor" size={14} /> : <Play fill="currentColor" size={14} />}
                      {isBotRunning ? 'PARE' : 'INICIAR'}
                    </button>
                    <button 
                      onClick={() => setIsClassicMode(false)}
                      className="w-12 shrink-0 rounded-xl flex items-center justify-center border bg-white/10 border-white/20 text-white"
                    >
                      <Crosshair size={18} />
                    </button>
                    <button className="w-12 shrink-0 bg-[var(--color-bg-secondary)] border border-white/10 rounded-xl flex items-center justify-center text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition">
                      <Power size={18} />
                    </button>
                  </div>
                </div>

                {/* Main Readouts */}
                <div className="flex flex-col items-center justify-center mb-8">
                  <span className="text-[11px] font-bold text-white/40 tracking-[0.2em] mb-2">LUCRO DA SESSÃO (PNL)</span>
                  <div className="flex items-center gap-4">
                    <ArrowUp size={28} className={robotStats.profit >= 0 ? "text-[var(--color-accent)]" : "text-red-500"} style={{ transform: robotStats.profit < 0 ? 'rotate(180deg)' : 'none' }} />
                    <span className={`text-[64px] font-mono tracking-tighter ${robotStats.profit >= 0 ? "text-[var(--color-accent)]" : "text-red-500"}`}>
                      {robotStats.profit >= 0 ? '+' : ''} {Number(robotStats.profit || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center mb-10 w-full relative z-[5]">
                  <div className="bg-[var(--color-bg-secondary)]/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-6 min-w-[320px] shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-accent)] shrink-0">
                        <Wallet size={24} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white/50 tracking-wider">SALDO DISPONÍVEL — {account?.loginid || 'CR1185099'}</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-bold text-white">
                            {account?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                          </span>
                          <span className="text-xs font-bold text-white/40">USD</span>
                        </div>
                      </div>
                    </div>
                    {logining ? (
                      <RefreshCcw size={16} className="text-[var(--color-accent)] animate-spin shrink-0" />
                    ) : (
                      <RefreshCcw 
                        onClick={() => refreshAccount()}
                        size={16} 
                        className="text-white/20 hover:text-white cursor-pointer transition-colors shrink-0" 
                      />
                    )}
                  </div>
                </div>

                <div className="w-full flex justify-between items-center text-center px-4 md:px-12 pt-6 border-t border-white/5 border-dashed">
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[9px] font-black text-white/30 tracking-widest uppercase">MERCADO ALVO</span>
                    <span className="text-xs text-white font-bold">{selectedVol === 'R_100' ? 'Volatility 100 Index' : VOLATILITIES.find(v => v.id === selectedVol)?.label || selectedVol}</span>
                  </div>
                  <div className="flex flex-col gap-1 items-center">
                     <span className="text-[9px] font-black text-white/30 tracking-widest uppercase">TAKE PROFIT</span>
                     <span className="text-xs text-[var(--color-accent)] font-bold">$ {parseFloat(stopWin || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col gap-1 items-center">
                     <span className="text-[9px] font-black text-white/30 tracking-widest uppercase">STOP LOSS</span>
                     <span className="text-xs text-red-500 font-bold">$ {parseFloat(stopLoss || "0").toFixed(2)}</span>
                  </div>
                </div>

                {/* Configuration Dropdown inside Classic Mode */}
                <AnimatePresence>
                  {showConfig && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-white/5 mt-8 pt-6 w-full"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Stake ($)</label>
                          <input type="number" value={stake} onChange={(e) => setStake(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[var(--color-accent)]/50 transition-all"/>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Meta de Lucro</label>
                          <input type="number" value={stopWin} onChange={(e) => setStopWin(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[var(--color-accent)]/50 transition-all"/>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Stop Loss</label>
                          <input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-red-500/50 transition-all"/>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Tema Visual</label>
                          <div className="relative">
                            <select 
                              value={themePreset} 
                              onChange={(e) => setThemePreset(e.target.value as any)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-[var(--color-accent)]/50 transition-all appearance-none cursor-pointer"
                            >
                              <option value="default">🌌 Deep Space</option>
                              <option value="emerald-night">🌲 Emerald Night</option>
                              <option value="oceanic">🌊 Oceanic</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
              </div>

              {/* State Tracker Card */}
              <div className="bg-[var(--color-bg-secondary)]/30 border border-white/5 rounded-[1.5rem] p-4 flex items-center justify-center relative overflow-hidden backdrop-blur-md">
                 <div className="absolute top-[40%] sm:top-[45%] left-[15%] right-[15%] h-px bg-white/5 z-0" />
                 
                 <div className="grid grid-cols-3 gap-2 sm:gap-8 w-full max-w-lg relative z-10">
                   {/* State 1: Analisando */}
                   <div className={`flex flex-col items-center justify-center gap-2 sm:gap-4 transition-all duration-300 ${!isBotRunning ? 'opacity-40' : (robotStatus === 'analyzing' ? 'opacity-100 scale-105' : 'opacity-40 scale-95')}`}>
                     <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[20px] border flex items-center justify-center transition-all ${isBotRunning && robotStatus === 'analyzing' ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)] shadow-[0_0_20px_rgba(0,209,143,0.3)]' : 'bg-[#0B0F19] border-white/5 text-white/30'}`}>
                       <Activity strokeWidth={2} className={`w-5 h-5 sm:w-7 sm:h-7 ${isBotRunning && robotStatus === 'analyzing' ? 'animate-pulse' : ''}`} />
                     </div>
                     <span className={`text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-center ${isBotRunning && robotStatus === 'analyzing' ? 'text-[var(--color-accent)]' : 'text-white/60'}`}>Analisando</span>
                   </div>

                   {/* State 2: Comprando */}
                   <div className={`flex flex-col items-center justify-center gap-2 sm:gap-4 transition-all duration-300 ${!isBotRunning ? 'opacity-40' : (robotStatus === 'buying' ? 'opacity-100 scale-105' : 'opacity-40 scale-95')}`}>
                     <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[20px] border flex items-center justify-center transition-all ${isBotRunning && robotStatus === 'buying' ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)] shadow-[0_0_20px_rgba(0,209,143,0.3)]' : 'bg-[#0B0F19] border-white/5 text-white/30'}`}>
                       <Clock strokeWidth={2} className={`w-5 h-5 sm:w-7 sm:h-7 ${isBotRunning && robotStatus === 'buying' ? 'animate-spin-slow' : ''}`} />
                     </div>
                     <span className={`text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-center ${isBotRunning && robotStatus === 'buying' ? 'text-[var(--color-accent)]' : 'text-white/60'}`}>Comprando</span>
                   </div>

                   {/* State 3: Vendendo */}
                   <div className={`flex flex-col items-center justify-center gap-2 sm:gap-4 transition-all duration-300 ${!isBotRunning ? 'opacity-40' : (robotStatus === 'selling' ? 'opacity-100 scale-105' : 'opacity-40 scale-95')}`}>
                     <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[20px] border flex items-center justify-center transition-all ${isBotRunning && robotStatus === 'selling' ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)] shadow-[0_0_20px_rgba(0,209,143,0.3)]' : 'bg-[#0B0F19] border-white/5 text-white/30'}`}>
                       <DollarSign strokeWidth={2} className={`w-5 h-5 sm:w-7 sm:h-7 ${isBotRunning && robotStatus === 'selling' ? 'animate-bounce' : ''}`} />
                     </div>
                     <span className={`text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-center ${isBotRunning && robotStatus === 'selling' ? 'text-[var(--color-accent)]' : 'text-white/60'}`}>Vendendo</span>
                   </div>
                 </div>
              </div>
            </div>
          ) : (
          <div className="bg-[var(--color-bg-secondary)]/50 border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-2xl relative z-[100] backdrop-blur-md">
              {/* Top Row: 3 columns */}
              <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-[var(--color-bg-primary)]/40 p-4 sm:p-6 rounded-[20px] border border-white/5 relative z-[100]">
                
                {/* Col 1: Saldo */}
                <div className="flex-1 flex flex-col justify-center w-full lg:w-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-white/40 tracking-wider">SALDO DA CONTA (USD)</span>
                    <span className="bg-indigo-500/20 text-indigo-400 text-[9px] font-black px-1.5 py-0.5 rounded mr-1">V1</span>
                    {logining ? (
                      <RefreshCcw size={14} className="text-[var(--color-accent)] animate-spin" />
                    ) : (
                      <RefreshCcw 
                        onClick={() => refreshAccount()}
                        size={14} 
                        className="text-white/20 hover:text-white cursor-pointer transition-colors" 
                      />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-white/40 text-2xl font-light">$</span>
                    <span className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight">
                      {account?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden lg:block w-px h-16 bg-white/5 mx-4" />

                {/* Col 2: Lucro PNL */}
                <div className="flex-1 flex flex-col justify-center w-full lg:w-auto mt-4 lg:mt-0">
                  <span className="text-[10px] font-bold text-white/40 tracking-wider mb-2">LUCRO DA SESSÃO (PNL)</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-4xl sm:text-5xl font-mono font-black tracking-tighter ${robotStats.profit >= 0 ? 'text-[var(--color-accent)]' : 'text-red-500'}`}>
                      {robotStats.profit >= 0 ? '+' : ''}{Number(robotStats.profit || 0).toFixed(2)}
                    </span>
                    <div className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs font-mono font-black text-white/40">
                      {robotStats.profit < 0 ? '-' : ''}{(account?.balance ? (Math.abs(Number(robotStats.profit || 0)) / account.balance * 100).toFixed(2) : '0.00')}%
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-white/40">
                    <span>Win Rate: <span className={robotStats.profit >= 0 ? 'text-[var(--color-accent)]' : 'text-red-500'}>{robotStats.trades > 0 ? Math.round((robotStats.wins / robotStats.trades) * 100) : 0}%</span></span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span>Trades: <span className="text-white">{robotStats.trades}</span></span>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden lg:block w-px h-16 bg-white/5 mx-4" />

                {/* Col 3: Controls */}
                <div className="flex-1 flex flex-col justify-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 relative z-[200]">
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 border bg-white/5 border-white/10 rounded-xl relative z-50 p-1 sm:p-1.5 px-2 flex">
                        <BotSelector 
                          selectedBot={selectedBot}
                          onSelect={handleBotSelect}
                          isOpen={isBotSelectOpen}
                          setIsOpen={setIsBotSelectOpen}
                          bots={allBots}
                        />
                    </div>
                    <div className="flex sm:flex-col flex-row items-center justify-center gap-1.5 bg-black/40 border border-white/10 py-3 sm:py-0 px-4 sm:px-5 rounded-xl shrink-0">
                      <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${isBotRunning ? 'bg-[var(--color-accent)] animate-pulse shadow-[0_0_8px_rgba(0,209,143,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">{isBotRunning ? 'ATIVO' : 'INATIVO'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsBotRunning(!isBotRunning)}
                      className={`flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${
                        isBotRunning 
                          ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 active:scale-95' 
                          : 'bg-[var(--color-accent)] hover:brightness-110 text-black shadow-lg shadow-[var(--color-accent)]/20 active:scale-95'
                      }`}
                    >
                      {isBotRunning ? (
                        <>
                          <Square size={14} fill="currentColor" />
                          <span>PARE</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} fill="currentColor" />
                          <span>INICIAR</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => setShowConfig(!showConfig)}
                      className={`w-14 rounded-xl flex items-center justify-center transition-all border shrink-0 ${showConfig ? 'bg-white/10 border-white/20 text-white' : 'bg-[var(--color-bg-secondary)] border-white/10 text-[var(--color-accent)] hover:bg-white/10 hover:text-[var(--color-accent)]'}`}
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => setIsClassicMode(true)}
                      className={`w-14 rounded-xl flex items-center justify-center transition-all border shrink-0 bg-[var(--color-bg-secondary)] border-white/10 text-white/40 hover:bg-white/10 hover:text-white`}
                    >
                      <Crosshair size={18} />
                    </button>
                    <button 
                      onClick={() => setIsBotRunning(false)}
                      className="w-14 bg-[var(--color-bg-secondary)] border border-white/10 rounded-xl flex items-center justify-center text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition shrink-0 cursor-pointer"
                      title="Parar Robô"
                    >
                      <Power size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {showConfig && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-6 overflow-hidden border-b border-t border-white/5 py-6 mt-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Stake ($)</label>
                        <input 
                          type="number" 
                          value={stake} 
                          onChange={(e) => setStake(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[var(--color-accent)]/50 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Meta de Lucro</label>
                        <input 
                          type="number" 
                          value={stopWin} 
                          onChange={(e) => setStopWin(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[var(--color-accent)]/50 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Stop Loss</label>
                        <input 
                          type="number" 
                          value={stopLoss} 
                          onChange={(e) => setStopLoss(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-red-500/50 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Tema Visual</label>
                        <div className="relative">
                          <select 
                            value={themePreset} 
                            onChange={(e) => setThemePreset(e.target.value as any)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-[var(--color-accent)]/50 transition-all appearance-none cursor-pointer"
                          >
                            <option value="default">🌌 Deep Space</option>
                            <option value="emerald-night">🌲 Emerald Night</option>
                            <option value="oceanic">🌊 Oceanic</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {selectedBot.id === 'ia-teste' && (
                      <div className="bg-black/25 border border-white/5 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap size={14} className="text-[#06B6D4]" fill="currentColor" />
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-white">Configuração do Bot Teste (Over/Under)</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Tipo de Operação</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setBotDirection('OVER')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${botDirection === 'OVER' ? 'bg-[var(--color-accent)] text-black shadow-lg shadow-[var(--color-accent)]/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                              >
                                OVER (Acima)
                              </button>
                              <button
                                type="button"
                                onClick={() => setBotDirection('UNDER')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${botDirection === 'UNDER' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                              >
                                UNDER (Abaixo)
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Dígito de Entrada (Barreira)</label>
                            <div className="grid grid-cols-5 gap-1.5">
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setBotBarrierDigit(num)}
                                  className={`h-9 rounded-lg font-mono font-black text-xs transition-all border ${botBarrierDigit === num ? 'bg-[#06B6D4] text-black border-[#06B6D4] shadow-lg shadow-[#06B6D4]/20' : 'bg-black/30 border-white/5 text-white/65 hover:border-white/20'}`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                        <Layers size={14} className="text-[var(--color-accent)]" />
                        Salvar Perfil
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={profileName} 
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Nome do perfil..."
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-all"
                        />
                        <button 
                          onClick={saveProfile}
                          className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-xl text-xs font-black hover:brightness-110 active:scale-95 transition-all"
                        >
                          SALVAR
                        </button>
                      </div>

                      {profiles.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {profiles.map(p => (
                            <button 
                              key={p.id}
                              onClick={() => loadProfile(p)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-white/70 transition-all flex items-center gap-2 group"
                            >
                              {p.name}
                              <Trash2 
                                size={12} 
                                className="text-white/20 group-hover:text-red-500 transition-colors" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = profiles.filter(item => item.id !== p.id);
                                  setProfiles(updated);
                                  localStorage.setItem('main_robot_profiles', JSON.stringify(updated));
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Row: State Tracker Step Bar */}
              <div className="bg-[#111827] border border-white/5 rounded-xl p-4 flex items-center justify-between relative overflow-hidden backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                 <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                   {/* State 1: Analisando */}
                   <div className={`flex items-center gap-3 transition-opacity duration-300 flex-1 w-full ${!isBotRunning ? 'opacity-40' : (robotStatus === 'analyzing' ? 'opacity-100' : 'opacity-40')}`}>
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isBotRunning && robotStatus === 'analyzing' ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)]' : 'bg-transparent border border-white/5 text-white/30'}`}>
                       <Activity strokeWidth={2} className={`w-5 h-5 ${isBotRunning && robotStatus === 'analyzing' ? 'animate-pulse' : ''}`} />
                     </div>
                     <div className="flex flex-col">
                       <span className="text-[13px] font-bold text-white tracking-wide leading-tight">Analisando</span>
                       <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Sinais de mercado</span>
                     </div>
                   </div>
                   
                   <div className="hidden md:block flex-1 max-w-[40px] h-px bg-white/5 shrink-0" />

                   {/* State 2: Comprando */}
                   <div className={`flex items-center gap-3 transition-opacity duration-300 flex-1 justify-center w-full ${!isBotRunning ? 'opacity-40' : (robotStatus === 'buying' ? 'opacity-100' : 'opacity-40')}`}>
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isBotRunning && robotStatus === 'buying' ? 'bg-[#5b738b]/30 border border-[#5b738b]/50 text-[#8d9eb0]' : 'bg-transparent border border-white/5 text-white/30'}`}>
                       <Clock strokeWidth={2} className={`w-5 h-5 ${isBotRunning && robotStatus === 'buying' ? 'animate-spin-slow' : ''}`} />
                     </div>
                     <div className="flex flex-col text-left mr-auto md:mr-0 lg:ml-0">
                       <span className="text-[13px] font-bold text-white tracking-wide leading-tight">Comprando</span>
                       <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Aguardando entrada</span>
                     </div>
                   </div>

                   <div className="hidden md:block flex-1 max-w-[40px] h-px bg-white/5 shrink-0" />

                   {/* State 3: Vendendo */}
                   <div className={`flex items-center gap-3 transition-opacity duration-300 flex-1 md:justify-end w-full ${!isBotRunning ? 'opacity-40' : (robotStatus === 'selling' ? 'opacity-100' : 'opacity-40')}`}>
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isBotRunning && robotStatus === 'selling' ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)]' : 'bg-transparent border border-white/5 text-white/30'}`}>
                       <DollarSign strokeWidth={2} className={`w-5 h-5 ${isBotRunning && robotStatus === 'selling' ? 'animate-bounce' : ''}`} />
                     </div>
                     <div className="flex flex-col text-left">
                       <span className="text-[13px] font-bold text-white tracking-wide leading-tight">Vendendo</span>
                       <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Verificando ganhos</span>
                     </div>
                   </div>
                 </div>
              </div>

            </div>
          )}

        {/* Digit Frequency & Volatility (EXTRA COMPACT STYLE) */}
        <div className="bg-[var(--color-bg-secondary)]/30 border border-white/5 rounded-xl p-2.5 sm:p-4 lg:p-5 space-y-3 relative z-10">
          <div className="flex items-center justify-between gap-1.5">
             <div className="flex items-center gap-1.5 shrink-0">
               <div className="w-0.5 h-4 bg-blue-500 rounded-full" />
               <h3 className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-white">
                 Gráfico de Dígitos
               </h3>
               <button 
                 onClick={() => setShowDigitChart(!showDigitChart)}
                 className="p-1 hover:bg-white/5 rounded transition-colors text-white/30 hover:text-white"
               >
                 {showDigitChart ? <Eye size={12} /> : <EyeOff size={12} />}
               </button>
             </div>

             <div className="flex items-center gap-1 sm:gap-2">
               <div className="relative shrink-0 flex items-center h-[32px] sm:h-[36px]">
                  <button 
                    onClick={() => setIsVolMenuOpen(!isVolMenuOpen)}
                    className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 h-full rounded-lg text-[10px] font-bold text-white/70 hover:text-white hover:border-[var(--color-accent)] transition-all active:scale-95 shadow-inner"
                  >
                    <TrendingUp size={14} className="text-[var(--color-accent)]" />
                    <span className="hidden sm:inline">{VOLATILITIES.find(v => v.id === selectedVol)?.label}</span>
                    <span className="sm:hidden font-mono text-[9px]">{selectedVol.replace('R_', '')}</span>
                    <ChevronDown size={14} className={`text-white/20 transition-transform ${isVolMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isVolMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-[115]" onClick={() => setIsVolMenuOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full right-0 mt-2 w-48 bg-[var(--color-bg-tertiary)] border border-white/10 rounded-xl shadow-2xl overflow-hidden transition-all z-[120]"
                        >
                          <div className="p-2 grid grid-cols-2 gap-1">
                            {VOLATILITIES.map((v) => (
                              <button 
                                key={v.id}
                                onClick={() => {
                                  setSelectedVol(v.id);
                                  setIsVolMenuOpen(false);
                                }}
                                className={`px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-all ${selectedVol === v.id ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                              >
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
               </div>
             </div>
          </div>

          {/* New row for Stats - High Visibility below header - Polished & Responsive */}
          <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-2 sm:px-4 h-[52px] sm:h-[48px] shadow-inner mb-3">
              {(() => {
                  const over = stats.filter(s => s.digit >= 5).reduce((acc, s) => acc + s.percentage, 0);
                  const under = stats.filter(s => s.digit < 5).reduce((acc, s) => acc + s.percentage, 0);
                  const even = stats.filter(s => s.digit % 2 === 0).reduce((acc, s) => acc + s.percentage, 0);
                  const odd = stats.filter(s => s.digit % 2 !== 0).reduce((acc, s) => acc + s.percentage, 0);
                  
                  const recommendation = over > under + 5 ? 'OVER' : (under > over + 5 ? 'UNDER' : 'WAIT');
                  const evenOddTrend = even > odd + 5 ? 'PAR' : (odd > even + 5 ? 'ÍMPAR' : 'NEUTRO');
                  
                  return (
                    <>
                      <div className="flex items-center gap-2 sm:gap-6 overflow-hidden">
                         <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <span className="text-[7px] sm:text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/70 font-black uppercase tracking-tight">TENDÊNCIA</span>
                            <span className={`text-[11px] sm:text-[14px] font-black ${even > odd ? 'text-[#76D130]' : evenOddTrend === 'NEUTRO' ? 'text-white/40' : 'text-blue-400'}`}>{evenOddTrend}</span>
                         </div>
                         
                         <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <span className="text-[7px] sm:text-[9px] bg-[var(--color-accent)] px-1.5 py-0.5 rounded text-black font-black uppercase tracking-tight">OVER</span>
                            <div className="flex items-baseline gap-0.5">
                               <span className={`text-[11px] sm:text-[14px] font-black ${over > under ? 'text-[var(--color-accent)]' : 'text-white/40'}`}>{Math.round(over)}%</span>
                               <span className={`text-[8px] ${over > under ? 'text-[var(--color-accent)]' : 'text-white/20'}`}>↑</span>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <span className="text-[7px] sm:text-[9px] bg-red-500 px-1.5 py-0.5 rounded text-white font-black uppercase tracking-tight">UNDER</span>
                            <div className="flex items-baseline gap-0.5">
                               <span className={`text-[11px] sm:text-[14px] font-black ${under > over ? 'text-red-400' : 'text-white/40'}`}>{Math.round(under)}%</span>
                               <span className={`text-[8px] ${under > over ? 'text-red-400' : 'text-white/20'}`}>↓</span>
                            </div>
                         </div>
                      </div>
                      
                      <div className={`shrink-0 px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-[9px] sm:text-[11px] font-black flex items-center gap-2 shadow-lg transition-all ${recommendation === 'WAIT' ? 'bg-white/5 text-white/40 border border-white/10' : (recommendation === 'OVER' ? 'bg-[var(--color-accent)] text-black animate-pulse' : 'bg-red-500 text-white animate-pulse')}`}>
                         <span className="hidden xs:inline">{recommendation === 'WAIT' ? 'ANALISANDO' : `ENTRADA: ${recommendation}`}</span>
                         <span className="xs:hidden font-mono">{recommendation === 'WAIT' ? '⏳' : (recommendation === 'OVER' ? '↑' : '↓')}</span>
                         {recommendation !== 'WAIT' && (
                            <motion.div
                               animate={{ y: [0, recommendation === 'OVER' ? -1 : 1, 0] }}
                               transition={{ repeat: Infinity, duration: 1 }}
                            >
                               {recommendation === 'OVER' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                            </motion.div>
                         )}
                      </div>
                    </>
                  );
               })()}
          </div>

          <AnimatePresence>
            {showDigitChart && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 overflow-hidden"
              >
                {/* Frequency Bar Chart Container */}
                <div className="bg-black/60 rounded-xl border border-white/5 p-2 sm:p-3 relative overflow-hidden shadow-2xl">
                    {/* Last Digits - Professional single-line row */}
                    <div className="flex justify-between items-center gap-1 sm:gap-1.5 mb-2 px-0.5 min-h-[32px]">
                      {lastTenDigits.length > 0 ? (
                        lastTenDigits.map((digit, idx) => {
                          const isLast = idx === lastTenDigits.length - 1;
                          const digitColor = isLast 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)] scale-110 z-10' 
                            : 'bg-[var(--color-bg-tertiary)] border-white/10 text-white/30';

                          return (
                            <div 
                              key={`${idx}-${digit}`}
                              className={`flex-1 h-6 sm:h-7 rounded-full flex items-center justify-center font-mono font-black text-[10px] sm:text-xs border transition-all ${digitColor}`}
                            >
                              <span className="leading-none">{digit}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex w-full justify-between gap-1">
                           {[...Array(10)].map((_, i) => <div key={i} className="flex-1 h-6 rounded-sm bg-white/5" />)}
                        </div>
                      )}
                    </div>

                    {/* The Bars (Normalized heights) */}
                    <div className="h-32 sm:h-40 flex items-end justify-between gap-1 sm:gap-1.5 px-0.5 mt-4">
                      {stats.map((stat) => {
                        const maxPct = Math.max(...stats.map(s => s.percentage), 1);
                        const isMax = stat.percentage > 0 && Math.max(...stats.map(s => s.percentage)) === stat.percentage;
                        const isMin = stat.percentage > 0 && Math.min(...stats.filter(s => s.percentage > 0).map(s => s.percentage)) === stat.percentage;
                        
                        let barColor = 'bg-white/10';
                        if (isMax) barColor = 'bg-[var(--color-accent)]';
                        if (isMin) barColor = 'bg-red-500';
                        if (stat.percentage === 0) barColor = 'bg-red-900/5';

                        // Calculate height: max is 80% to leave room for percentage label at the top
                        const heightPct = (stat.percentage / maxPct) * 80;

                        return (
                          <div key={stat.digit} className="flex-1 flex flex-col justify-end items-center gap-1.5 h-full">
                            <span className={`text-[8px] sm:text-[10px] font-black tabular-nums transition-colors duration-300 ${isMax ? 'text-[var(--color-accent)]' : (isMin ? 'text-red-400' : 'text-white/30')}`}>
                              {Math.round(stat.percentage)}%
                            </span>
                            
                            <div className="w-full relative flex flex-col justify-end h-full">
                              <div 
                                style={{ height: `${heightPct}%` }}
                                className={`w-full rounded-none shadow-lg relative min-h-[2px] transition-all duration-300 ${barColor}`}
                              >
                                 {/* Gloss effect */}
                                 {stat.percentage > 5 && (
                                   <div className="absolute inset-x-0 top-0 h-1/2 bg-white/5 rounded-none" />
                                 )}
                              </div>
                            </div>
                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-bold mt-0.5 transition-all duration-300
                              ${stat.digit === lastDigit 
                                ? `${barColor} text-white ring-1 ring-white/50 scale-110 shadow-lg` 
                                : 'bg-white/5 text-white/20'}`}
                            >
                              {stat.digit}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History of Operations */}
        <div className="bg-[#0B0F19]/50 border border-white/5 overflow-hidden flex flex-col mt-4 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-20">
          <div className="flex items-center justify-between p-4 bg-[#111827]/80 border-b border-white/5">
            <div className="flex items-center gap-3">
              <ChevronDown className="text-white/40" size={16} />
              <h3 className="font-bold text-sm sm:text-base text-white">Histórico de Operações</h3>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMuted(!isMuted)} className="p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer hidden sm:block">
                {isMuted ? (
                  <VolumeX size={16} className="text-red-500/80 hover:text-red-500 transition-colors" />
                ) : (
                  <Volume2 size={16} className="text-white/40 hover:text-white transition-colors" />
                )}
              </button>
              <button 
                onClick={() => fbClearHistory(history)}
                className="p-1 hover:bg-white/5 rounded-lg transition-colors group"
                title="Limpar Histórico"
              >
                <Trash2 size={16} className="text-white/20 group-hover:text-red-500 transition-colors" />
              </button>
              <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full text-[13px] font-black tracking-widest">
                <span className="text-[var(--color-accent)]">{history.filter(h => h.isWin).length}</span>
                <span className="text-white/20">/</span>
                <span className="text-[#cc4753]">{history.filter(h => !h.isWin).length}</span>
              </div>
            </div>
          </div>

          <div className="p-0 max-h-[400px] overflow-y-auto custom-scrollbar bg-black/20">
             {history.length > 0 ? (
               <div className="w-full">
                 {/* Desktop Table */}
                 <table className="hidden md:table w-full text-left font-bold border-collapse">
                   <thead className="text-[#5b738b] tracking-wider text-[11px] uppercase bg-[#0B0F19] sticky top-0 z-10 shadow-md">
                     <tr>
                       <th className="px-6 py-4 font-normal text-left">Status</th>
                       <th className="px-4 py-4 font-normal text-left">Data / Hora</th>
                       <th className="px-4 py-4 font-normal text-left">Tipo</th>
                       <th className="px-4 py-4 font-normal text-center">Entrada</th>
                       <th className="px-4 py-4 font-normal text-center">Saída</th>
                       <th className="px-4 py-4 font-normal text-center">Preço</th>
                       <th className="px-6 py-4 font-normal text-right">Ganho/Perda</th>
                     </tr>
                   </thead>
                   <tbody className="text-[12px] border-t-0 bg-[#0B0F19]">
                     {history.map((item, index) => {
                       const today = new Date().toLocaleDateString('pt-BR');
                       return (
                       <tr key={item.id} className={`transition-colors ${index % 2 === 0 ? 'bg-transparent' : 'bg-[#111827]'} hover:bg-white/[0.04] ${!item.isWin ? 'bg-[#cc4753]/[0.02]' : ''}`}>
                         <td className="px-6 py-4">
                           {item.isWin ? (
                             <div className="w-5 h-5 rounded-full border border-[var(--color-accent)] flex items-center justify-center bg-transparent">
                               <Check size={12} strokeWidth={2.5} className="text-[var(--color-accent)]" />
                             </div>
                           ) : (
                             <div className="w-5 h-5 rounded-full border border-[#cc4753]/40 flex items-center justify-center bg-transparent">
                               <TrendingDown size={12} strokeWidth={2.5} className="text-[#cc4753]" />
                             </div>
                           )}
                         </td>
                         <td className="px-4 py-4 text-left">
                           <div className="flex flex-col items-start">
                             <span className="text-[10px] font-bold text-[#5b738b] uppercase">{today}</span>
                             <span className="font-bold text-white text-[13px] tracking-tight">{item.time}</span>
                           </div>
                         </td>
                         <td className="px-4 py-4 text-left">
                           <div className="flex items-center gap-2">
                             <span className="bg-[var(--color-accent)]/[0.05] text-[var(--color-accent)] border border-[var(--color-accent)]/20 px-2 py-0.5 rounded text-[10px] tracking-widest font-black uppercase">
                               {item.type}
                             </span>
                             <span className="text-[#a1b0c0] text-[11px] font-medium tracking-wide whitespace-nowrap">
                               Volatility 100 Index
                             </span>
                           </div>
                         </td>
                         <td className="px-4 py-4 text-center font-bold text-white text-[13px]">{item.entry}</td>
                         <td className="px-4 py-4 text-center font-bold text-white text-[13px]">{item.exit}</td>
                         <td className="px-4 py-4 text-center font-bold text-[#8d9eb0] text-[12px] whitespace-nowrap">$ {Math.abs(parseFloat(item.price || "0")).toFixed(2)}</td>
                         <td className="px-6 py-4 text-right">
                           <span className={`inline-flex items-center justify-end font-mono text-[13px] font-black tracking-wider px-2 py-0.5 rounded ${item.isWin ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'text-[#cc4753] bg-[#cc4753]/10'}`}>
                             {item.isWin ? '+' : '-'} $ {Math.abs(parseFloat(item.result || "0")).toFixed(2)}
                           </span>
                         </td>
                       </tr>
                       );
                     })}
                   </tbody>
                 </table>

                 {/* Mobile Cards */}
                 <div className="md:hidden divide-y divide-white/5">
                    {history.map((item) => (
                      <HistoryItemMobile key={item.id} item={item} />
                    ))}
                 </div>
               </div>
             ) : (
               <div className="p-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                  <Inbox size={40} className="text-white/10" strokeWidth={1} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Sem Histórico</p>
                  <p className="text-[10px] text-white/10 uppercase tracking-widest mt-1">Primeira operação pendente</p>
                </div>
              </div>
             )}
          </div>

          <div className="bg-[var(--color-bg-primary)]/30 p-4 border-t border-white/5 flex justify-center text-[9px] font-bold text-white/10 uppercase tracking-[0.2em]">
            Mostrando as últimas operações
          </div>
        </div>
          </>
        )}

        {currentView === 'forex' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Forex Header Card */}
            <div className="bg-[var(--color-bg-secondary)]/50 border border-white/10 rounded-[2.5rem] p-4 sm:p-6 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                <div className="xl:col-span-4 flex flex-col gap-4">
                  <div className="h-[64px]">
                    <AssetSelector 
                      selectedId={selectedForexId}
                      onSelect={setSelectedForexId}
                    />
                  </div>
                  
                  {/* Sinal Vigilante Block */}
                  <AnimatePresence>
                    {forexSignal && (Date.now() / 1000 - forexSignal.time < 60) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className={`p-4 rounded-3xl border flex flex-col gap-3 shadow-xl relative overflow-hidden ${
                          forexSignal.type === 'CALL' ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30' : 'bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Sinal Vigilante</span>
                          <div className="flex gap-2 items-center">
                             <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${forexSignal.isConfirmed ? (forexSignal.type === 'CALL' ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] animate-pulse' : 'bg-red-500 text-white animate-pulse') : 'bg-white/10 text-white/60'}`}>
                               {forexSignal.isConfirmed ? 'Entrar Agora' : 'Preparar'}
                             </span>
                             <div className={`w-2 h-2 rounded-full animate-pulse ${forexSignal.type === 'CALL' ? 'bg-[var(--color-accent)]' : 'bg-red-500'}`} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                            forexSignal.type === 'CALL' ? 'bg-[var(--color-accent)]/20 border-[var(--color-accent)]/40' : 'bg-red-500/20 border-red-500/40'
                          }`}>
                            {forexSignal.type === 'CALL' ? <TrendingUp size={24} className="text-[var(--color-accent)]" /> : <TrendingDown size={24} className="text-red-500" />}
                          </div>
                          <div>
                            <h3 className={`text-2xl font-black italic tracking-tighter leading-none ${forexSignal.type === 'CALL' ? 'text-[var(--color-accent)]' : 'text-red-500'}`}>
                              {forexSignal.type === 'CALL' ? 'COMPRA' : 'VENDA'}
                            </h3>
                            <p className="text-[10px] font-bold text-white/50 tracking-widest mt-1 uppercase">Próxima Vela [M1]</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                           <span className="text-[10px] font-bold text-white/40 italic">EXECUÇÃO IMEDIATA:</span>
                           <span className="text-xs font-mono font-black text-white px-2 py-1 bg-black/40 rounded-lg border border-white/5">
                             {new Date((forexSignal.time + 60) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                           </span>
                        </div>
                        <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20 pointer-events-none ${
                          forexSignal.type === 'CALL' ? 'bg-[var(--color-accent)]' : 'bg-red-500'
                        }`} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="xl:col-span-8">
                  <TradingSignals symbol={selectedForexId} tick={forexTicks[selectedForexId]} />
                </div>
              </div>
              
              <div className="min-h-[600px] sm:min-h-[800px] w-full bg-[var(--color-bg-primary)] rounded-[2rem] sm:rounded-[3.5rem] border border-white/10 overflow-hidden relative shadow-[0_30px_60px_rgba(0,0,0,0.6)] group transition-all duration-700 hover:border-[var(--color-accent)]/30 p-2 sm:p-4 flex flex-col gap-4">
                 <div className="flex-1 w-full rounded-2xl overflow-hidden border border-white/5 bg-black/20 relative">
                    <TechnicalChart 
                      symbol={selectedForexId}
                      onSignalChange={setForexSignal}
                      onAddTrade={handleAddTrade}
                    />
                 </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'builder' && <BotBuilderView onAddBot={handleAddBot} setNotifications={setNotifications} />}
        {currentView === 'double' && (
          <DoubleBotsView 
            onAddBot={handleAddBot} 
            onLoginOpen={() => setIsLoginModalOpen(true)} 
            setNotifications={setNotifications} 
            selectedVol={selectedVol}
            setSelectedVol={setSelectedVol}
            onAddTrade={handleAddTrade}
          />
        )}
        {currentView === 'management' && (
          <ManagementView 
            clients={clients} 
            plans={plans} 
            simulatedBlockedClient={simulatedBlockedClient}
            setSimulatedBlockedClient={setSimulatedBlockedClient}
            addNotification={addNotification}
            upsertClient={fbUpsertClient}
            removeClient={fbRemoveClient}
            upsertPlan={fbUpsertPlan}
            removePlan={fbRemovePlan}
            fbUser={fbUser}
            forceTab="crm"
          />
        )}
        {currentView === 'simulation' && (
          <ManagementView 
            clients={clients} 
            plans={plans} 
            simulatedBlockedClient={simulatedBlockedClient}
            setSimulatedBlockedClient={setSimulatedBlockedClient}
            addNotification={addNotification}
            upsertClient={fbUpsertClient}
            removeClient={fbRemoveClient}
            upsertPlan={fbUpsertPlan}
            removePlan={fbRemovePlan}
            fbUser={fbUser}
            forceTab="simulation"
          />
        )}
        {currentView === 'lessons' && <LessonsView />}
        {currentView === 'history' && (
          <HistoryView 
            history={history} 
            onClear={() => fbClearHistory(history)} 
          />
        )}

      </main>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onOpenRegister={() => setIsRegisterModalOpen(true)}
        setNotifications={setNotifications}
      />
      <EditLinksModal 
        isOpen={isLinksModalOpen} 
        onClose={() => setIsLinksModalOpen(false)} 
        instagram={instagramLink}
        tiktok={tiktokLink}
        whatsapp={whatsappLink}
        suporte={suporteLink}
        onSave={({ instagram, tiktok, whatsapp, suporte }) => {
          setInstagramLink(instagram);
          setTiktokLink(tiktok);
          setWhatsappLink(whatsapp);
          setSuporteLink(suporte);
          localStorage.setItem('link_instagram', instagram);
          localStorage.setItem('link_tiktok', tiktok);
          localStorage.setItem('link_whatsapp', whatsapp);
          localStorage.setItem('link_suporte', suporte);
          setNotifications(prev => [{
            id: Date.now().toString(),
            msg: "Links do painel atualizados com sucesso!",
            time: new Date().toLocaleTimeString(),
            type: "success"
          }, ...prev]);
        }}
      />
      <CreateNotificationModal 
        isOpen={isCreateNotificationModalOpen} 
        onClose={() => setIsCreateNotificationModalOpen(false)} 
        onSend={(msg, type) => {
          setNotifications(prev => [
            {
              id: Date.now().toString(),
              msg,
              time: new Date().toLocaleTimeString(),
              type
            },
            ...prev
          ]);
        }}
      />
      <RegisterModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
        setNotifications={setNotifications}
      />
      <ToastContainer notifications={activeToasts} onRemove={removeToast} />

      {/* Expiry Account Block Overlay */}
      {showBlocker && (
        <AccountBlockedOverlay 
          client={blockedUserClient} 
          plan={plans.find(p => p.id === blockedUserClient.planId)} 
          onBypass={() => {
            if (simulatedBlockedClient) {
              setSimulatedBlockedClient(null);
            } else {
              setLocalBypass(true);
            }
          }} 
        />
      )}



      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-bg-tertiary)] border border-white/10 rounded-2xl p-6 w-full max-w-md relative z-10"
            >
              <h3 className="text-lg font-black tracking-widest uppercase mb-4 text-center">Editar Perfil</h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#5b738b]">Ícone / Foto</label>
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative group">
                       {(profileFormData.avatar?.startsWith('data:') || profileFormData.avatar?.startsWith('http')) ? (
                         <img src={profileFormData.avatar} alt="avatar" className="w-full h-full object-cover" />
                       ) : (
                         <span className="text-2xl">{profileFormData.avatar || '👤'}</span>
                       )}
                    </div>
                    <div className="flex-1 flex flex-col gap-2 justify-center">
                        <select
                          value={(profileFormData.avatar?.startsWith('data:') || profileFormData.avatar?.startsWith('http')) ? "custom" : profileFormData.avatar}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              setProfileFormData({...profileFormData, avatar: e.target.value});
                            }
                          }}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-[var(--color-accent)] uppercase tracking-wider font-bold"
                        >
                          <option value="custom">-- Imagem Personalizada --</option>
                          <option value="👤">👤 Padrão Gray</option>
                          <option value="🦁">🦁 Leão de Ouro</option>
                          <option value="🤖">🤖 Bot Operador</option>
                          <option value="⚡">⚡ Chapa Rápido</option>
                          <option value="🔥">🔥 Fogo Azul</option>
                          <option value="⭐">⭐ Estrela VIP</option>
                          <option value="👑">👑 Premium King</option>
                        </select>
                        
                        <label className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-[var(--color-accent)] uppercase tracking-wider font-bold text-center cursor-pointer transition-all">
                          Fazer Upload de Foto
                          <input 
                             type="file" 
                             accept="image/*"
                             onChange={(e) => {
                               const file = e.target.files?.[0];
                               if (file) {
                                 const reader = new FileReader();
                                 reader.onload = (ev) => {
                                   if (ev.target?.result) setProfileFormData({...profileFormData, avatar: ev.target.result as string});
                                 };
                                 reader.readAsDataURL(file);
                               }
                             }}
                             className="hidden"
                          />
                        </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#5b738b]">Nome</label>
                  <input
                    type="text"
                    required
                    value={profileFormData.name}
                    onChange={(e) => setProfileFormData({...profileFormData, name: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                {systemUser?.role !== 'admin' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#5b738b]">Email (Login)</label>
                      <input
                        type="email"
                        required
                        value={profileFormData.email}
                        onChange={(e) => setProfileFormData({...profileFormData, email: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#5b738b]">WhatsApp / Telefone</label>
                      <input
                        type="text"
                        value={profileFormData.whatsapp}
                        onChange={(e) => setProfileFormData({...profileFormData, whatsapp: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#5b738b]">Nova Senha (opcional)</label>
                  <input
                    type="text"
                    value={profileFormData.password}
                    onChange={(e) => setProfileFormData({...profileFormData, password: e.target.value})}
                    placeholder="Mantenha mesma senha atual"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-all uppercase text-xs">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 py-3 rounded-xl bg-[var(--color-accent)] text-black font-black uppercase text-xs hover:brightness-110 transition-all">
                    Salvar Dados
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="sm:hidden h-20 bg-[var(--color-bg-primary)] border-t border-white/10 flex items-center justify-between px-6 fixed bottom-0 left-0 right-0 z-[110]">
        <button 
          onClick={() => setCurrentView('bot')}
          className={`flex flex-col items-center gap-1 ${currentView === 'bot' ? 'text-[var(--color-accent)]' : 'text-white/30'}`}
        >
          <Home size={20} />
          <span className="text-[10px] font-bold">Início</span>
        </button>
        <button 
          onClick={() => setCurrentView('forex')}
          className={`flex flex-col items-center gap-1 ${currentView === 'forex' ? 'text-[var(--color-accent)]' : 'text-white/30'}`}
        >
          <BarChart2 size={20} />
          <span className="text-[10px] font-bold">Forex</span>
        </button>
        <a 
          href="https://app.deriv.com/cashier/deposit?lang=PT"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 text-white/30"
        >
          <PlusCircle size={20} />
          <span className="text-[10px] font-bold">Depósito</span>
        </a>
        <a 
          href="https://app.deriv.com/cashier/withdrawal?lang=PT"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 text-white/30"
        >
          <DollarSign size={20} />
          <span className="text-[10px] font-bold">Saque</span>
        </a>
        <a 
          href="https://wa.me/5588981598255"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 text-white/30"
        >
          <MessageCircle size={20} />
          <span className="text-[10px] font-bold">Chat</span>
        </a>
      </div>

      <style>{`
        body { background-color: var(--color-bg-primary); overflow-x: hidden; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--color-bg-primary); }
        ::-webkit-scrollbar-thumb { background: var(--color-bg-secondary); border-radius: 10px; }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite linear;
        }
      `}</style>
    </div>
  );
}
