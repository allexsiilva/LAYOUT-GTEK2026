
export type TickData = {
  quote: number;
  epoch: number;
  symbol: string;
};

export type AuthorizeResponse = {
  authorize: {
    email: string;
    fullname: string;
    balance: number;
    currency: string;
    loginid: string;
    scopes: string[];
    is_virtual: number;
    account_list: Array<{
      account_category: string;
      account_type: string;
      created_at: number;
      currency: string;
      is_disabled: number;
      is_virtual: number;
      landing_company_name: string;
      loginid: string;
    }>;
  };
};

export type AccountInfo = {
  loginid: string;
  currency: string;
  balance: number;
  email: string;
  name: string;
  isVirtual: boolean;
  accounts?: Array<{
    loginid: string;
    isVirtual: boolean;
    currency: string;
  }>;
};

const DEFAULT_APP_ID = '1089'; // App ID oficial de teste da Deriv

export enum ConnectionStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
  CLOSED = 'closed'
}

class DerivService {
  private socket: WebSocket | null = null;
  private currentToken: string | null = null;
  private tokens: Record<string, string> = {}; // loginid -> token
  private onMessageCallbacks: Set<(data: any) => void> = new Set();
  private onStatusChangeCallbacks: Set<(status: ConnectionStatus) => void> = new Set();
  private status: ConnectionStatus = ConnectionStatus.IDLE;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: any = null;
  private preferredEndpointIndex = 0;
  private connectPromise: Promise<WebSocket> | null = null;

  constructor() {
    this.currentToken = localStorage.getItem('deriv_token') || localStorage.getItem('deriv_api_token') || null;
    const savedTokens = localStorage.getItem('deriv_tokens');
    if (savedTokens) {
      try {
        this.tokens = JSON.parse(savedTokens);
      } catch (e) {
        this.tokens = {};
      }
    }
    const currentAppId = localStorage.getItem('deriv_app_id');
    if (!currentAppId || currentAppId === '01a14b32-5d76-7aab-97c5-8f62bd561632') {
      localStorage.setItem('deriv_app_id', DEFAULT_APP_ID);
    }
  }

  getAppId(): string {
    const saved = localStorage.getItem('deriv_app_id');
    if (saved && saved.trim()) return saved.trim();
    return import.meta.env.VITE_DERIV_APP_ID || DEFAULT_APP_ID;
  }

  setAppId(appId: string) {
    if (appId && appId.trim()) {
      localStorage.setItem('deriv_app_id', appId.trim());
      if (this.socket) {
        try { this.socket.close(); } catch (_) {}
      }
      this.connect().catch(() => {});
    }
  }

  getEndpoints(): string[] {
    const rawAppId = this.getAppId();
    // Deriv WebSocket v3 query param app_id requires a numeric integer (e.g. 1089 or 62953).
    // A UUID (like 01a14b32-5d76-7aab-97c5-8f62bd561632) is a Deriv Developer Portal App ID / REST client ID.
    // For the WebSocket transport handshake, use a valid numeric app_id (1089 or user's numeric id).
    const wsAppId = /^\d+$/.test(rawAppId) ? rawAppId : '1089';

    return [
      `wss://ws.derivws.com/websockets/v3?app_id=${wsAppId}&l=pt&brand=deriv`,
      `wss://ws.binaryws.com/websockets/v3?app_id=${wsAppId}&l=pt&brand=deriv`,
      `wss://ws.derivws.com/websockets/v3?app_id=1089&l=pt&brand=deriv`,
      `wss://ws.binaryws.com/websockets/v3?app_id=1089`
    ];
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      console.log(`[DerivService] Status changed to: ${newStatus}`);
      this.onStatusChangeCallbacks.forEach(cb => cb(newStatus));
    }
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  onStatusChange(cb: (status: ConnectionStatus) => void) {
    this.onStatusChangeCallbacks.add(cb);
    cb(this.status);
    return () => this.onStatusChangeCallbacks.delete(cb);
  }

  async connect(): Promise<WebSocket> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return this.socket;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.internalConnect().finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  private tryConnectEndpoint(url: string, timeoutMs: number = 2500): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      let isSettled = false;
      let ws: WebSocket | null = null;

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try { ws?.close(); } catch (_) {}
          reject(new Error(`Tempo limite atingido para ${url}`));
        }
      }, timeoutMs);

      try {
        ws = new WebSocket(url);

        ws.onopen = () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            resolve(ws!);
          }
        };

        ws.onerror = (e) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            try { ws?.close(); } catch (_) {}
            reject(new Error(`Erro de socket ao conectar em ${url}`));
          }
        };

        ws.onclose = () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            reject(new Error(`Socket fechou prematuramente em ${url}`));
          }
        };
      } catch (err) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    });
  }

  private setupSocketHandlers(socket: WebSocket) {
    socket.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        this.onMessageCallbacks.forEach(cb => {
          try {
            cb(data);
          } catch (e) {
            console.warn('[DerivService] Callback error:', e);
          }
        });
      } catch (e) {
        console.warn('[DerivService] Error parsing message', e);
      }
    };

    socket.onclose = () => {
      if (this.socket === socket) {
        this.socket = null;
        if (this.status !== ConnectionStatus.CLOSED) {
          this.handleReconnect();
        }
      }
    };

    socket.onerror = () => {
      // Passive handler for opened socket; normal disconnect handled by onclose
    };
  }

  private async internalConnect(): Promise<WebSocket> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return this.socket;
    }

    if (this.status !== ConnectionStatus.RECONNECTING) {
      this.setStatus(ConnectionStatus.CONNECTING);
    }

    const endpoints = this.getEndpoints();
    let lastError: any = null;

    for (let i = 0; i < endpoints.length; i++) {
      const idx = (this.preferredEndpointIndex + i) % endpoints.length;
      const endpoint = endpoints[idx];
      try {
        console.log(`[DerivService] Conectando ao endpoint (${i + 1}/${endpoints.length}): ${endpoint}`);
        const ws = await this.tryConnectEndpoint(endpoint, 5000);
        
        // Connected successfully!
        this.preferredEndpointIndex = idx;
        this.socket = ws;
        this.reconnectAttempts = 0;
        this.setStatus(ConnectionStatus.CONNECTED);

        this.setupSocketHandlers(ws);

        if (this.currentToken) {
          this.authorize(this.currentToken).catch(e => {
            console.warn('[DerivService] Auto-auth note:', e?.message || e);
          });
        }
        return ws;
      } catch (err: any) {
        console.warn(`[DerivService] Falha ao conectar em ${endpoint}:`, err?.message || err);
        lastError = err;
      }
    }

    this.setStatus(ConnectionStatus.ERROR);
    throw new Error('Não foi possível conectar aos servidores da Deriv. Verifique sua conexão de rede ou tente novamente em instantes.');
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[DerivService] Max reconnection attempts reached. Will pause and retry.');
      this.setStatus(ConnectionStatus.ERROR);
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect().catch(() => {});
      }, 15000);
      return;
    }

    this.setStatus(ConnectionStatus.RECONNECTING);
    this.reconnectAttempts++;
    this.preferredEndpointIndex = (this.preferredEndpointIndex + 1) % this.getEndpoints().length;
    
    // Exponential backoff
    const backoff = Math.min(1000 * Math.pow(1.4, Math.min(this.reconnectAttempts, 8)), 10000);
    console.log(`[DerivService] Reconnecting in ${Math.round(backoff)}ms (Attempt ${this.reconnectAttempts})`);

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(err => {
        console.warn('[DerivService] Reconnection attempt failed:', err?.message || err);
      });
    }, backoff);
  }

  async authorize(token: string): Promise<AccountInfo> {
    const cleanToken = token.trim();
    if (!cleanToken) {
      throw new Error('Por favor, insira um token da Deriv.');
    }

    // Suporte especial a Personal Access Tokens (PAT pat_...) da nova API Deriv
    if (cleanToken.startsWith('pat_')) {
      try {
        console.log('[DerivService] Validando token PAT via REST API (App ID:', this.getAppId(), ')...');
        const restRes = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Deriv-App-ID': this.getAppId()
          }
        });

        if (restRes.ok) {
          const restData = await restRes.json();
          console.log('[DerivService] PAT validado com sucesso via REST:', restData);
          const accounts = restData.accounts || restData.data || [];
          const primaryAcc = accounts[0];

          if (primaryAcc) {
            // Obter OTP para abrir WebSocket autenticado
            try {
              const accId = primaryAcc.id || primaryAcc.account_id || primaryAcc.loginid;
              const otpRes = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${accId}/otp`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${cleanToken}`,
                  'Deriv-App-ID': this.getAppId(),
                  'Content-Type': 'application/json'
                }
              });
              if (otpRes.ok) {
                const otpData = await otpRes.json();
                console.log('[DerivService] URL autenticada OTP obtida:', otpData);
                if (otpData.url) {
                  const patWs = await this.tryConnectEndpoint(otpData.url, 6000);
                  this.socket = patWs;
                  this.setupSocketHandlers(patWs);
                }
              }
            } catch (otpErr) {
              console.warn('[DerivService] OTP falhou, utilizando fallback:', otpErr);
            }

            this.currentToken = cleanToken;
            localStorage.setItem('deriv_token', cleanToken);
            localStorage.setItem('deriv_api_token', cleanToken);

            return {
              loginid: primaryAcc.id || primaryAcc.loginid || 'PAT-USER',
              currency: primaryAcc.currency || 'USD',
              balance: typeof primaryAcc.balance === 'number' ? primaryAcc.balance : parseFloat(primaryAcc.balance || '0'),
              email: restData.email || 'Usuário Deriv',
              name: restData.name || 'Conta Deriv PAT',
              isVirtual: primaryAcc.type === 'demo' || !!primaryAcc.is_virtual,
              accounts: accounts.map((a: any) => ({
                loginid: a.id || a.loginid,
                isVirtual: a.type === 'demo' || !!a.is_virtual,
                currency: a.currency || 'USD'
              }))
            };
          }
        }
      } catch (patErr: any) {
        console.warn('[DerivService] Verificação REST PAT gerou aviso, prosseguindo com WebSocket:', patErr?.message);
      }
    }

    const socket = await this.connect();
    
    return new Promise((resolve, reject) => {
      let timeoutId: any = null;

      const msgHandler = (data: any) => {
        if (data.msg_type === 'authorize') {
          if (timeoutId) clearTimeout(timeoutId);
          this.removeOnMessage(msgHandler);

          if (data.error) {
            console.warn('[DerivService] Deriv Auth Error:', data.error);
            let friendlyMessage = data.error.message || 'Falha ao autenticar com a Deriv.';
            if (data.error.code === 'InvalidToken') {
              if (cleanToken.startsWith('pat_')) {
                friendlyMessage = `Token PAT rejeitado pela Deriv. Verifique se o seu App ID (${this.getAppId()}) está correto no portal de desenvolvedores da Deriv ou crie um Token de API padrão com permissões de Leitura e Negociação em app.deriv.com/account/api-token.`;
              } else {
                friendlyMessage = 'Token inválido ou expirado. Verifique no portal da Deriv se o token possui permissões de Leitura e Negociação.';
              }
            } else if (data.error.code === 'AuthorizationRequired') {
              friendlyMessage = 'Autorização necessária para esta conta.';
            } else if (data.error.code === 'RateLimit') {
              friendlyMessage = 'Muitas tentativas simultâneas. Aguarde alguns instantes.';
            } else if (data.error.code === 'InputValidationFailed') {
              friendlyMessage = `Formato de token inválido: ${data.error.message}`;
            }

            const err = new Error(friendlyMessage);
            (err as any).code = data.error.code;
            (err as any).details = data.error;
            reject(err);
          } else {
            this.currentToken = cleanToken;
            localStorage.setItem('deriv_token', cleanToken);
            localStorage.setItem('deriv_api_token', cleanToken);
            const auth = data.authorize;
            
            // Map tokens for switching
            if (auth.account_list) {
              auth.account_list.forEach((acc: any) => {
                this.tokens[acc.loginid] = cleanToken;
              });
              localStorage.setItem('deriv_tokens', JSON.stringify(this.tokens));
            }

            // Automatically subscribe to balance after successful authorization
            this.send({ balance: 1, subscribe: 1 });

            resolve({
              loginid: auth.loginid,
              currency: auth.currency,
              balance: parseFloat(auth.balance),
              email: auth.email,
              name: auth.fullname,
              isVirtual: !!auth.is_virtual,
              accounts: auth.account_list?.map((a: any) => ({
                loginid: a.loginid,
                isVirtual: !!a.is_virtual,
                currency: a.currency
              }))
            });
          }
        }
      };

      timeoutId = setTimeout(() => {
        this.removeOnMessage(msgHandler);
        reject(new Error('Tempo limite atingido ao autenticar na Deriv. Verifique o token e tente novamente.'));
      }, 15000);

      this.onMessage(msgHandler);
      
      try {
        socket.send(JSON.stringify({ authorize: cleanToken }));
      } catch (e: any) {
        if (timeoutId) clearTimeout(timeoutId);
        this.removeOnMessage(msgHandler);
        reject(new Error('Erro ao enviar solicitação para a Deriv. Tente novamente.'));
      }
    });
  }

  async unsubscribe(id: string) {
    this.send({ forget: id });
  }

  async unsubscribeAll(type: 'ticks' | 'candles' | 'balance') {
    this.send({ forget_all: type });
  }

  async switchAccount(loginid: string): Promise<AccountInfo> {
    const token = this.tokens[loginid];
    if (!token) throw new Error('Token not found for this account');
    
    // Forget current balance subscription before switching
    await this.unsubscribeAll('balance');
    
    return this.authorize(token);
  }

  async buy(proposalId: string): Promise<any> {
    const socket = await this.connect();
    return new Promise((resolve, reject) => {
      const msgHandler = (data: any) => {
        if (data.msg_type === 'buy') {
          this.removeOnMessage(msgHandler);
          if (data.error) reject(data.error);
          else resolve(data.buy);
        }
      };
      this.onMessage(msgHandler);
      socket.send(JSON.stringify({ buy: proposalId, price: 10000 })); // Price is max price
    });
  }

  async waitForResult(contractId: number): Promise<any> {
    const socket = await this.connect();
    return new Promise((resolve, reject) => {
      const msgHandler = (data: any) => {
        if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract && data.proposal_open_contract.contract_id === contractId) {
          const contract = data.proposal_open_contract;
          if (contract.is_sold) {
            this.removeOnMessage(msgHandler);
            // Forget the contract subscription
            socket.send(JSON.stringify({ forget: data.subscription?.id }));
            resolve(contract);
          }
        }
      };
      this.onMessage(msgHandler);
      socket.send(JSON.stringify({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 }));
    });
  }

  async getProposal(contractType: string, amount: number, symbol: string, duration: number = 1, durationUnit: string = 't', barrier?: number): Promise<any> {
    const socket = await this.connect();
    return new Promise((resolve, reject) => {
      const msgHandler = (data: any) => {
        if (data.msg_type === 'proposal') {
          this.removeOnMessage(msgHandler);
          if (data.error) reject(data.error);
          else resolve(data.proposal);
        }
      };
      this.onMessage(msgHandler);
      socket.send(JSON.stringify({
        proposal: 1,
        amount: amount,
        basis: 'stake',
        contract_type: contractType,
        currency: 'USD',
        duration: duration,
        duration_unit: durationUnit,
        symbol: symbol,
        ...(barrier !== undefined ? { barrier: barrier.toString() } : {})
      }));
    });
  }

  async verifyEmail(email: string): Promise<boolean> {
    const socket = await this.connect();
    return new Promise((resolve, reject) => {
      const msgHandler = (data: any) => {
        if (data.msg_type === 'verify_email') {
          this.removeOnMessage(msgHandler);
          if (data.error) reject(data.error);
          else resolve(true);
        }
      };
      this.onMessage(msgHandler);
      socket.send(JSON.stringify({ verify_email: email, type: 'account_opening' }));
    });
  }

  async createVirtualAccount(params: {
    verification_code: string;
    client_password: string;
    residence: string;
    email: string;
  }): Promise<any> {
    const socket = await this.connect();
    return new Promise((resolve, reject) => {
      const msgHandler = (data: any) => {
        if (data.msg_type === 'new_account_virtual') {
          this.removeOnMessage(msgHandler);
          if (data.error) reject(data.error);
          else resolve(data.new_account_virtual);
        }
      };
      this.onMessage(msgHandler);
      socket.send(JSON.stringify({ 
        new_account_virtual: 1, 
        ...params 
      }));
    });
  }

  onMessage(cb: (data: any) => void) {
    this.onMessageCallbacks.add(cb);
  }

  removeOnMessage(cb: (data: any) => void) {
    this.onMessageCallbacks.delete(cb);
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  logout() {
    this.currentToken = null;
    this.tokens = {};
    localStorage.removeItem('deriv_token');
    localStorage.removeItem('deriv_tokens');
    localStorage.removeItem('deriv_api_token');
    if (this.socket) {
      this.socket.close();
    }
  }

  getToken() {
    return this.currentToken;
  }

  getTokenForAccount(loginid: string) {
    return this.tokens[loginid];
  }
}

export const derivService = new DerivService();
