import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeriv } from './useDeriv';
import { useDerivAuth } from '../contexts/DerivContext';

export interface Strategy {
  id: string;
  name: string;
  sequence?: ('P' | 'I')[];
  result: 'P' | 'I' | 'OVER' | 'UNDER';
  type?: 'digits' | 'wave' | 'trend' | 'smart_digits' | 'fast';
  barrier?: number;
}

export interface TradeInfo {
  id: string;
  time: string;
  type: string;
  entry: string;
  exit: string;
  price: string;
  result: string;
  isWin: boolean;
}

export function useRobot(
  symbol: string, 
  strategy: Strategy, 
  stake: number, 
  active: boolean, 
  onSignal?: (type: 'signal' | 'win' | 'loss') => void,
  onTrade?: (trade: TradeInfo) => void,
  limits?: { stopLoss: number, stopWin: number }
) {
  const { account } = useDerivAuth();
  const { digits, lastTick, executeTrade } = useDeriv(symbol, account?.loginid);
  const [isTrading, setIsTrading] = useState(false);
  const [logs, setLogs] = useState<{ time: string, msg: string, type: 'info' | 'success' | 'error' }[]>([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, profit: 0, trades: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState<'analyzing' | 'buying' | 'selling'>('analyzing');
  
  const lastProcessedEpoch = useRef(0);
  const priceHistory = useRef<number[]>([]);
  const lastTradeTime = useRef(0);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    // Reset transient state when symbol or strategy changes
    priceHistory.current = [];
    lastProcessedEpoch.current = 0;
  }, [symbol, strategy.id]);

  useEffect(() => {
    if (!active || isPaused) {
      setStatus('analyzing');
      return;
    }

    if (limits) {
      if (limits.stopLoss > 0 && Math.abs(stats.profit) >= limits.stopLoss && stats.profit < 0) {
        setIsPaused(true);
        addLog('Stop Loss atingindo! Robô pausado.', 'error');
        if (onSignal) onSignal('loss');
        return;
      }
      if (limits.stopWin > 0 && stats.profit >= limits.stopWin) {
        setIsPaused(true);
        addLog('Stop Win atingindo! Parabéns!', 'success');
        if (onSignal) onSignal('win');
        return;
      }
    }

    if (isTrading) return;

    // Cooldown check (ensure at least 10 seconds between trades, but for 'teste' only 1.5 seconds)
    const cooldown = strategy.id.includes('teste') ? 1500 : 10000;
    const now = Date.now();
    if (now - lastTradeTime.current < cooldown) return;
    
    // Only process if we have a new tick based on epoch
    if (!lastTick || lastTick.epoch <= lastProcessedEpoch.current) return;
    lastProcessedEpoch.current = lastTick.epoch;
    
    // Update price history
    priceHistory.current = [...priceHistory.current, lastTick.quote].slice(-20);

    let shouldTrade = false;
    let tradeType: 'DIGITEVEN' | 'DIGITODD' | 'DIGITOVER' | 'DIGITUNDER' = 'DIGITEVEN';
    const barrier = strategy.barrier ?? 4;

    if (strategy.id.includes('teste')) {
      // Custom real-time Over/Under Digit Chart analysis
      const isOver = strategy.result === 'OVER';
      const targetBarrier = strategy.barrier ?? 4;
      
      if (digits.length >= 1) {
        const lastDigit = digits[digits.length - 1];
        if (isOver) {
          tradeType = 'DIGITOVER';
          // Trigger when last digit is <= targetBarrier (contrary digit for regression)
          if (lastDigit <= targetBarrier) {
            shouldTrade = true;
          }
        } else {
          tradeType = 'DIGITUNDER';
          // Trigger when last digit is >= targetBarrier (contrary digit for regression)
          if (lastDigit >= targetBarrier) {
            shouldTrade = true;
          }
        }
      }
    } else if (strategy.type === 'fast') {
      // Fast bot logic: trade based on instantaneous tick flow/momentum
      if (priceHistory.current.length >= 2) {
        const lastPrice = priceHistory.current[priceHistory.current.length - 1];
        const prevPrice = priceHistory.current[priceHistory.current.length - 2];
        shouldTrade = true;
        if (lastPrice >= prevPrice) {
          tradeType = 'DIGITEVEN';
        } else {
          tradeType = 'DIGITODD';
        }
      } else {
        shouldTrade = true;
        tradeType = 'DIGITEVEN';
      }
    } else if (strategy.type === 'wave') {
      // Wave Logic: High disparity in digits + flow direction
      const over = digits.filter(d => d >= 5).length;
      const under = digits.filter(d => d < 5).length;
      const total = digits.length;
      
      // Analyze recent flow (last 5 ticks)
      const last5 = digits.slice(-5);
      const isUpWave = last5.every((d, i) => i === 0 || d >= last5[i-1]);
      const isDownWave = last5.every((d, i) => i === 0 || d <= last5[i-1]);

      if (strategy.result === 'OVER' && over > under + (total * 0.05) && isUpWave) {
        shouldTrade = true;
        tradeType = 'DIGITOVER';
      } else if (strategy.result === 'UNDER' && under > over + (total * 0.05) && isDownWave) {
        shouldTrade = true;
        tradeType = 'DIGITUNDER';
      }
    } else if (strategy.type === 'smart_digits') {
      // MACD & Momentum Logic
      if (priceHistory.current.length >= 26) { // Need at least 26 ticks for MACD EMA26
        const prices = priceHistory.current;
        
        // Simple EMA helper
        const getEMA = (data: number[], period: number) => {
          const k = 2 / (period + 1);
          let ema = data[0];
          for (let i = 1; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
          }
          return ema;
        };

        const ema12 = getEMA(prices.slice(-12), 12);
        const ema26 = getEMA(prices.slice(-26), 26);
        const macdLine = ema12 - ema26;
        
        // Fast trend analysis
        const last10Digits = digits.slice(-10);
        const lowDigitCount = last10Digits.slice(-5).filter(d => d <= 3).length;
        
        // Anti-manipulation: Only trade if MACD is bullish (above zero) OR recovering
        const isBullish = macdLine > 0;
        
        // Cooldown and pattern match
        if (isBullish && lowDigitCount >= 2) {
          shouldTrade = true;
          tradeType = 'DIGITOVER';
        } else if (!isBullish && lowDigitCount >= 4) {
          // Recovery trade: if 4+ low digits in bearish, local reversal highly likely
          shouldTrade = true;
          tradeType = 'DIGITOVER';
        }
      }
    } else {
      // Standard Logic
      if (strategy.sequence && digits.length >= strategy.sequence.length) {
        const currentSequence = digits.slice(-strategy.sequence.length).map(d => d % 2 === 0 ? 'P' : 'I');
        const match = strategy.sequence.every((val, index) => val === currentSequence[index]);
        
        // Trend Optimization: Check if the target result is appearing significantly
        const evenCount = digits.filter(d => d % 2 === 0).length;
        const oddCount = digits.filter(d => d % 2 !== 0).length;
        const total = digits.length;
        const threshold = total * 0.45; 
        const trendOk = (strategy.result === 'P' || strategy.result === 'OVER') ? evenCount >= threshold : oddCount >= threshold;

        if (match && trendOk) {
          shouldTrade = true;
          if (strategy.result === 'P') tradeType = 'DIGITEVEN';
          else if (strategy.result === 'I') tradeType = 'DIGITODD';
          else if (strategy.result === 'OVER') tradeType = 'DIGITOVER';
          else tradeType = 'DIGITUNDER';
        }
      }
    }

    if (shouldTrade) {
      setIsTrading(true); 
      setStatus('buying');
      
      // Determine effective barrier for this trade
      let effectiveBarrier = barrier;
      if (strategy.type === 'smart_digits') {
        effectiveBarrier = tradeType === 'DIGITOVER' ? 3 : 7;
      }

      const runTrade = async () => {
        if (onSignal) onSignal('signal');
        addLog(`${strategy.name}: Detectou oportunidade! ${tradeType} ${effectiveBarrier}`, 'info');
        
        try {
          const result = await executeTrade(tradeType, stake, effectiveBarrier, () => setStatus('selling'));
            const profit = result.profit;
            const isWin = result.status === 'won';
            
            if (isWin) {
              addLog(`Operação vitoriosa! Lucro: $${Number(profit || 0).toFixed(2)}`, 'success');
              if (onSignal) onSignal('win');
              setStats(prev => ({ 
                ...prev, 
                wins: prev.wins + 1, 
                trades: (prev.trades || (prev.wins + prev.losses)) + 1, 
                profit: prev.profit + profit 
              }));
            } else {
              addLog(`Operação perdida. Perda: $${Math.abs(Number(profit || 0)).toFixed(2)}`, 'error');
              if (onSignal) onSignal('loss');
              setStats(prev => ({ 
                ...prev, 
                losses: prev.losses + 1, 
                trades: (prev.trades || (prev.wins + prev.losses)) + 1, 
                profit: prev.profit + profit 
              }));
            }
            
            if (onTrade) {
              onTrade({
                id: result.contract_id.toString(),
                time: new Date().toLocaleTimeString(),
                type: tradeType,
                entry: result.entry_tick_display_value || '0',
                exit: result.exit_tick_display_value || '0',
                price: stake.toString(),
                result: Number(profit || 0).toFixed(2),
                isWin: isWin
              });
            }
          } catch (err: any) {
            addLog(`Falha na operação: ${err.message}`, 'error');
            if (onSignal) onSignal('loss');
            setStats(prev => ({ 
              ...prev, 
              losses: prev.losses + 1, 
              trades: (prev.trades || (prev.wins + prev.losses)) + 1, 
              profit: prev.profit - stake 
            }));
            
            if (onTrade) {
              onTrade({
                id: Date.now().toString(),
                time: new Date().toLocaleTimeString(),
                type: tradeType,
                entry: lastTick?.quote.toString() || '0',
                exit: lastTick?.quote.toString() || '0',
                price: stake.toString(),
                result: (-Number(stake || 0)).toFixed(2),
                isWin: false
              });
            }
          } finally {
            // Permite ao usuário visualizar o fechamento da operação no passo 3 antes de retornar à análise
            await new Promise(r => setTimeout(r, 1200));
            setIsTrading(false);
            setStatus('analyzing');
          }
        };
        
        runTrade();
        lastTradeTime.current = Date.now();
      }
  }, [digits, lastTick, active, strategy, stake, executeTrade, isTrading, onSignal, limits, stats.profit, isPaused]);

  return { logs, isTrading, stats, isPaused, status, resume: () => setIsPaused(false) };
}
