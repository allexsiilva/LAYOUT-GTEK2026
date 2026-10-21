import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { derivService, AccountInfo } from '../services/derivService';

interface DerivContextType {
  account: AccountInfo | null;
  isLoading: boolean;
  error: string | null;
  logining: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  switchAccount: (loginid: string) => Promise<void>;
  refreshAccount: () => Promise<void>;
  verifyEmail: (email: string) => Promise<boolean>;
  createVirtualAccount: (params: any) => Promise<any>;
  loginDemoAccount: () => void;
  updateDemoBalance: (amount: number) => void;
  isConnected: boolean;
}

const DerivContext = createContext<DerivContextType | undefined>(undefined);

export const DerivProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<AccountInfo | null>(() => {
    if (localStorage.getItem('is_demo_test_mode') === 'true') {
      return {
        loginid: 'VRTC_TEST_DEMO',
        currency: 'USD',
        balance: 10000.00,
        email: 'trader.teste@smartbull.local',
        name: 'Trader Convidado (Modo Teste)',
        isVirtual: true,
        accounts: [
          { loginid: 'VRTC_TEST_DEMO', isVirtual: true, currency: 'USD' }
        ]
      };
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [logining, setLogining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(derivService.getStatus() === 'connected');

  useEffect(() => {
    const unsubStatus = derivService.onStatusChange((status) => {
      setIsConnected(status === 'connected');
    });

    const init = async () => {
      try {
        await Promise.race([
          derivService.connect(),
          new Promise(res => setTimeout(res, 800))
        ]);
      } catch (err: any) {
        console.warn('[DerivContext] Initial connection attempt in progress:', err?.message || err);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    const handleMessage = (data: any) => {
      if (data.msg_type === 'balance' && data.balance) {
        setAccount(prev => prev ? { ...prev, balance: data.balance.balance } : null);
      }
    };

    derivService.onMessage(handleMessage);

    return () => {
      unsubStatus();
      derivService.removeOnMessage(handleMessage);
    };
  }, []);

  const login = async (token: string) => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      setError('Por favor, insira um token de API válido.');
      return;
    }
    
    const cleanToken = token.trim();
    setLogining(true);
    setError(null);
    try {
      console.log('Attempting to authorize with token:', cleanToken.substring(0, 5) + '...');
      const info = await derivService.authorize(cleanToken);
      console.log('Authorization successful:', info.loginid);
      setAccount(info);
      // Subscribe to balance
      derivService.send({ balance: 1, subscribe: 1 });
    } catch (err: any) {
      console.warn('Login Error details:', err);
      let friendlyMessage = err?.message || 'Falha ao conectar com a Deriv. Verifique seu token.';
      if (err.code === 'InvalidToken') friendlyMessage = 'Token inválido ou expirado. Gere um novo no site da Deriv com permissões de Leitura e Negociação.';
      if (err.code === 'AuthorizationRequired') friendlyMessage = 'Sessão expirada. Por favor, conecte novamente.';
      if (err.code === 'RateLimit') friendlyMessage = 'Muitas tentativas. Aguarde um momento e tente novamente.';
      
      setError(friendlyMessage);
      throw err;
    } finally {
      setLogining(false);
    }
  };

  const loginDemoAccount = () => {
    const demoAccount: AccountInfo = {
      loginid: 'VRTC_TEST_DEMO',
      currency: 'USD',
      balance: 10000.00,
      email: 'trader.teste@smartbull.local',
      name: 'Trader Convidado (Modo Teste)',
      isVirtual: true,
      accounts: [
        { loginid: 'VRTC_TEST_DEMO', isVirtual: true, currency: 'USD' }
      ]
    };
    setAccount(demoAccount);
    setError(null);
    localStorage.setItem('is_demo_test_mode', 'true');
  };

  const updateDemoBalance = (diff: number) => {
    setAccount(prev => {
      if (!prev) return null;
      const newBal = Math.max(0, Number((prev.balance + diff).toFixed(2)));
      return { ...prev, balance: newBal };
    });
  };

  const logout = () => {
    derivService.logout();
    setAccount(null);
    setError(null);
    localStorage.removeItem('is_demo_test_mode');
  };

  const switchAccount = async (loginid: string) => {
    setLogining(true);
    setError(null);
    try {
      // First check if we have a token for this account
      const token = derivService.getTokenForAccount(loginid);
      if (!token) {
        // If no token, we need to ask for it
        setError(`A conta ${loginid} requer um novo token. Por favor, faça login nela.`);
        setLogining(false);
        return;
      }

      const info = await derivService.switchAccount(loginid);
      setAccount(info);
      // Wait a bit before subscribing to balance to ensure auth is processed
      setTimeout(() => {
        derivService.send({ balance: 1, subscribe: 1 });
      }, 500);
    } catch (err: any) {
      console.error('Account Switch Error:', err);
      // If switching fails, it's often a token issue. Logout might be too harsh, 
      // but we should definitely clear the error after a while.
      setError(`Erro ao trocar para ${loginid}: ${err.message || 'Token expirado'}`);
    } finally {
      setLogining(false);
    }
  };

  const refreshAccount = async () => {
    if (!account) return;
    setLogining(true);
    try {
      const token = derivService.getToken();
      if (token) {
        const info = await derivService.authorize(token);
        setAccount(info);
      }
    } catch (err) {
      console.error('Refresh failed', err);
    } finally {
      setLogining(false);
    }
  };

  const verifyEmail = async (email: string) => {
    return await derivService.verifyEmail(email);
  };

  const createVirtualAccount = async (params: any) => {
    return await derivService.createVirtualAccount(params);
  };

  return (
    <DerivContext.Provider value={{ account, isLoading, error, login, logout, switchAccount, logining, isConnected, refreshAccount, verifyEmail, createVirtualAccount, loginDemoAccount, updateDemoBalance }}>
      {children}
    </DerivContext.Provider>
  );
};

export const useDerivAuth = () => {
  const context = useContext(DerivContext);
  if (context === undefined) {
    throw new Error('useDerivAuth must be used within a DerivProvider');
  }
  return context;
};
