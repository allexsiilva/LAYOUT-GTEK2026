import { useState, useEffect } from 'react';
import { derivService, TickData, ConnectionStatus } from '../services/derivService';

export type { TickData };
export { ConnectionStatus };

export type DigitStat = {
  digit: number;
  count: number;
  percentage: number;
};

export type CandleData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export function useDerivConnection() {
  const [status, setStatus] = useState<ConnectionStatus>(derivService.getStatus());

  useEffect(() => {
    return derivService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  return { 
    status, 
    isConnected: status === ConnectionStatus.CONNECTED,
    isConnecting: status === ConnectionStatus.CONNECTING || status === ConnectionStatus.RECONNECTING,
    isError: status === ConnectionStatus.ERROR
  };
}

export const DEFAULT_PRICES: Record<string, number> = {
  'R_10': 6420.521,
  'R_25': 2841.135,
  'R_50': 245.8921,
  'R_75': 892.4182,
  'R_100': 1054.82,
  '1HZ10V': 452.12,
  '1HZ25V': 812.45,
  '1HZ50V': 324.90,
  '1HZ75V': 910.15,
  '1HZ100V': 1250.60,
  'frxEURUSD': 1.08542,
  'frxGBPUSD': 1.29415,
  'frxUSDJPY': 152.410,
  'frxAUDUSD': 0.66520,
  'BTCUSD': 68450.00,
  'ETHUSD': 2640.50,
};

export const SYMBOL_PRECISION: Record<string, number> = {
  'R_10': 3,
  'R_25': 3,
  'R_50': 4,
  'R_75': 4,
  'R_100': 2,
  '1HZ10V': 2,
  '1HZ25V': 2,
  '1HZ50V': 2,
  '1HZ75V': 2,
  '1HZ100V': 2,
  'frxEURUSD': 5,
  'frxGBPUSD': 5,
  'frxUSDJPY': 3,
  'frxAUDUSD': 5,
  'BTCUSD': 2,
  'ETHUSD': 2,
};

export function useDerivCandles(symbol: string = 'R_100', granularity: number = 60) {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected } = useDerivConnection();

  useEffect(() => {
    let isMounted = true;
    const basePrice = DEFAULT_PRICES[symbol] || 1000.00;
    const stepSeconds = granularity || 60;

    // Conexão ativa via WebSocket da Deriv
    if (isConnected) {
      setIsLoading(true);
      const handleMessage = (data: any) => {
        if (!isMounted) return;

        if ((data.msg_type === 'history' || data.msg_type === 'candles') && data.candles) {
          const history = data.candles.map((c: any) => ({
            time: c.epoch,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close)
          }));
          setCandles(history);
          setIsLoading(false);
        }
        
        if (data.msg_type === 'ohlc' && data.ohlc && data.ohlc.symbol === symbol) {
          const ohlc = data.ohlc;
          const newCandle = {
            time: ohlc.open_time || (ohlc.epoch - (ohlc.epoch % stepSeconds)),
            open: parseFloat(ohlc.open),
            high: parseFloat(ohlc.high),
            low: parseFloat(ohlc.low),
            close: parseFloat(ohlc.close)
          };
          
          setCandles(prev => {
            if (prev.length === 0) return [newCandle];
            const lastCandle = prev[prev.length - 1];
            if (lastCandle.time === newCandle.time) {
              return [...prev.slice(0, -1), newCandle];
            } else if (newCandle.time > lastCandle.time) {
              return [...prev, newCandle].slice(-200);
            }
            return prev;
          });
        }
      };

      derivService.onMessage(handleMessage);
      derivService.send({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: 200,
        end: 'latest',
        granularity: stepSeconds,
        style: 'candles',
        subscribe: 1
      });

      return () => {
        isMounted = false;
        derivService.removeOnMessage(handleMessage);
      };
    }

    // Modo Demonstração / Simulação quando sem conexão direta: Gera velas e atualiza em tempo real
    const nowEpoch = Math.floor(Date.now() / 1000);
    const count = 120;
    const initialCandles: CandleData[] = [];
    let currentClose = basePrice;
    const startTime = nowEpoch - (count * stepSeconds);

    for (let i = 0; i < count; i++) {
      const time = startTime + (i * stepSeconds);
      const delta = (Math.random() - 0.495) * (basePrice * 0.0012);
      const open = currentClose;
      currentClose = Math.max(0.01, currentClose + delta);
      const spread = Math.random() * (basePrice * 0.0006);
      const high = Math.max(open, currentClose) + spread;
      const low = Math.min(open, currentClose) - spread;

      initialCandles.push({
        time,
        open: Number(open.toFixed(4)),
        high: Number(high.toFixed(4)),
        low: Number(low.toFixed(4)),
        close: Number(currentClose.toFixed(4))
      });
    }

    setCandles(initialCandles);
    setIsLoading(false);

    // Loop de ticks simulados em tempo real atualizando a vela corrente
    const interval = setInterval(() => {
      if (!isMounted) return;
      const tickDelta = (Math.random() - 0.495) * (basePrice * 0.0004);
      const now = Math.floor(Date.now() / 1000);
      const currentCandleTime = now - (now % stepSeconds);

      setCandles(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.time === currentCandleTime) {
          const newClose = Math.max(0.01, Number((last.close + tickDelta).toFixed(4)));
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              close: newClose,
              high: Math.max(last.high, newClose),
              low: Math.min(last.low, newClose)
            }
          ];
        } else if (currentCandleTime > last.time) {
          const newCandle: CandleData = {
            time: currentCandleTime,
            open: last.close,
            high: last.close,
            low: last.close,
            close: last.close
          };
          return [...prev.slice(-199), newCandle];
        }
        return prev;
      });
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbol, granularity, isConnected]);

  return { candles, isConnected, isLoading };
}

export function useDeriv(symbol: string = 'R_100', accountId?: string) {
  const [lastTick, setLastTick] = useState<TickData | null>(null);
  const [digits, setDigits] = useState<number[]>([]);
  const { isConnected } = useDerivConnection();

  useEffect(() => {
    let isMounted = true;
    const precision = SYMBOL_PRECISION[symbol] || 2;
    const basePrice = DEFAULT_PRICES[symbol] || 1000.00;

    const extractLastDigit = (quote: number) => {
      const fixed = quote.toFixed(precision);
      return parseInt(fixed[fixed.length - 1]);
    };

    if (isConnected) {
      setDigits([]); // Limpa dígitos na troca de ativo
      const handleMessage = (data: any) => {
        if (!isMounted) return;
        
        if (data.msg_type === 'history' && data.history && data.echo_req.ticks_history === symbol) {
          const prices = data.history.prices || [];
          const historyDigits = prices.map((p: number) => extractLastDigit(p));
          setDigits(historyDigits.slice(-100));
        }

        if (data.msg_type === 'tick' && data.tick && data.tick.symbol === symbol) {
          const tick = data.tick;
          const lastDigit = extractLastDigit(tick.quote);
          
          setLastTick({
            quote: tick.quote,
            epoch: tick.epoch,
            symbol: tick.symbol
          });
          
          setDigits(prev => {
            const newDigits = [...prev, lastDigit];
            return newDigits.slice(-100);
          });
        }
      };

      derivService.onMessage(handleMessage);
      
      derivService.send({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: 100,
        end: 'latest',
        start: 1,
        style: 'ticks'
      });

      derivService.send({
        ticks: symbol,
        subscribe: 1
      });

      return () => {
        isMounted = false;
        derivService.removeOnMessage(handleMessage);
      };
    }

    // Modo Demonstração / Simulação com ticks contínuos a cada 1 segundo
    let currentQuote = basePrice;
    const initialDigits: number[] = [];
    for (let i = 0; i < 100; i++) {
      initialDigits.push(Math.floor(Math.random() * 10));
    }
    setDigits(initialDigits);

    setLastTick({
      quote: currentQuote,
      epoch: Math.floor(Date.now() / 1000),
      symbol
    });

    const interval = setInterval(() => {
      if (!isMounted) return;
      const delta = (Math.random() - 0.495) * (basePrice * 0.0004);
      currentQuote = Number((Math.max(0.01, currentQuote + delta)).toFixed(precision));
      const newDigit = extractLastDigit(currentQuote);
      
      setLastTick({
        quote: currentQuote,
        epoch: Math.floor(Date.now() / 1000),
        symbol
      });

      setDigits(prev => [...prev.slice(-99), newDigit]);
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbol, accountId, isConnected]);

  const stats: DigitStat[] = Array.from({ length: 10 }, (_, i) => {
    const count = digits.filter(d => d === i).length;
    return {
      digit: i,
      count,
      percentage: digits.length > 0 ? (count / digits.length) * 100 : 0
    };
  });

  const executeTrade = async (contractType: string, amount: number, barrier?: number, onBought?: () => void) => {
    try {
      // Se estiver no Modo de Teste/Demonstração (sem token ou conta demo interna)
      if (accountId?.includes('DEMO') || !derivService.getToken() || !isConnected) {
        // Etapa 1: COMPRANDO (envia proposta e executa compra)
        await new Promise(r => setTimeout(r, 1400));
        // Etapa 2: VENDENDO (ordem aberta, monitorando ticks do contrato)
        if (onBought) onBought();
        await new Promise(r => setTimeout(r, 2200));
        const isWin = Math.random() < 0.65;
        const profit = isWin ? Number((amount * 0.95).toFixed(2)) : -amount;
        const fakeContractId = Math.floor(Math.random() * 899999999 + 100000000);
        return {
          contract_id: fakeContractId,
          status: isWin ? 'won' : 'lost',
          profit,
          payout: isWin ? amount * 1.95 : 0,
          entry_tick_display_value: lastTick?.quote ? lastTick.quote.toFixed(2) : '1042.80',
          exit_tick_display_value: lastTick?.quote ? (lastTick.quote + (isWin ? 0.04 : -0.04)).toFixed(2) : '1042.84'
        };
      }

      const isForex = symbol.startsWith('frx');
      const duration = isForex ? 1 : 5;
      const durationUnit = isForex ? 'm' : 't';
      
      const proposal = await derivService.getProposal(contractType, amount, symbol, duration, durationUnit, barrier);
      const buyResult = await derivService.buy(proposal.id);
      if (onBought) onBought();
      const finalResult = await derivService.waitForResult(buyResult.contract_id);
      return finalResult;
    } catch (err: any) {
      console.error('Trade execution failed:', err);
      
      let friendly = 'Erro ao executar operação.';
      if (err.code === 'InsufficientBalance') friendly = 'Saldo insuficiente em sua conta Deriv.';
      if (err.code === 'MarketClosed') friendly = 'Mercado fechado no momento para este ativo.';
      if (err.code === 'InvalidToken') friendly = 'Token inválido. Verifique suas configurações.';
      if (err.code === 'AuthorizationRequired') friendly = 'Sessão expirada. Por favor, conecte novamente.';
      if (err.code === 'ClientUnverified') friendly = 'Sua conta Deriv precisa de verificação antes de operar.';
      if (err.code === 'ContractBuyValidationError') friendly = 'Valor da operação inválido ou fora dos limites.';
      
      const enhancedError: any = new Error(friendly);
      enhancedError.code = err.code;
      enhancedError.originalError = err;
      throw enhancedError;
    }
  };

  return { lastTick, digits, stats, isConnected, executeTrade };
}

export function useDerivMultiTicks(symbols: string[], accountId?: string) {
  const [ticks, setTicks] = useState<Record<string, TickData>>({});
  const { isConnected } = useDerivConnection();

  useEffect(() => {
    let isMounted = true;

    if (isConnected) {
      const handleMessage = (data: any) => {
        if (!isMounted) return;
        if (data.msg_type === 'tick' && data.tick) {
          const tick = data.tick;
          setTicks(prev => ({
            ...prev,
            [tick.symbol]: {
              quote: tick.quote,
              epoch: tick.epoch,
              symbol: tick.symbol
            }
          }));
        }
      };

      derivService.onMessage(handleMessage);
      symbols.forEach(symbol => {
        derivService.send({ ticks: symbol, subscribe: 1 });
      });

      return () => {
        isMounted = false;
        derivService.removeOnMessage(handleMessage);
      };
    }

    // Modo Demonstração para Múltiplos Pares
    const initialTicks: Record<string, TickData> = {};
    symbols.forEach(s => {
      const base = DEFAULT_PRICES[s] || 1.1000;
      initialTicks[s] = { quote: base, epoch: Math.floor(Date.now() / 1000), symbol: s };
    });
    setTicks(initialTicks);

    const interval = setInterval(() => {
      if (!isMounted) return;
      setTicks(prev => {
        const next = { ...prev };
        symbols.forEach(s => {
          const curr = next[s]?.quote || DEFAULT_PRICES[s] || 1.1000;
          const delta = (Math.random() - 0.495) * (curr * 0.0003);
          const precision = SYMBOL_PRECISION[s] || 4;
          next[s] = {
            quote: Number((curr + delta).toFixed(precision)),
            epoch: Math.floor(Date.now() / 1000),
            symbol: s
          };
        });
        return next;
      });
    }, 1200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbols.join(','), accountId, isConnected]);

  return ticks;
}
