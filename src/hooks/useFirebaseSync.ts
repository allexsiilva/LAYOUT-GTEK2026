import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo = {
    message: error.message,
    code: error.code,
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

export function useFirebaseSync() {
  const [user, setUser] = useState(auth.currentUser);
  const [clients, setClients] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [customBots, setCustomBots] = useState<any[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Histórico local com persistência no localStorage (funciona sempre, mesmo sem login Firebase)
  const [localHistory, setLocalHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('trading_history_local');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dbHistory, setDbHistory] = useState<any[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await setDoc(doc(db, 'users', u.uid), {
            email: u.email,
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch(e) {}
      } else {
        setClients([]);
        setPlans([]);
        setDbHistory([]);
        setCustomBots([]);
        setIsLoadingDb(false);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;
    setIsLoadingDb(true);

    const qClients = query(collection(db, 'clients'), where('userId', '==', user.uid));
    const unsubClients = onSnapshot(qClients, (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'clients'));

    const qPlans = query(collection(db, 'plans'), where('userId', '==', user.uid));
    const unsubPlans = onSnapshot(qPlans, (snap) => {
      setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, 'plans'));

    const qHistory = query(collection(db, 'history'), where('userId', '==', user.uid));
    const unsubHistory = onSnapshot(qHistory, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDbHistory(items);
      setIsLoadingDb(false);
    }, error => handleFirestoreError(error, OperationType.LIST, 'history'));

    const qBots = query(collection(db, 'customBots'), where('userId', '==', user.uid));
    const unsubBots = onSnapshot(qBots, (snap) => {
      setCustomBots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoadingDb(false);
    }, error => handleFirestoreError(error, OperationType.LIST, 'customBots'));

    return () => {
      unsubClients();
      unsubPlans();
      unsubHistory();
      unsubBots();
    };
  }, [user]);

  const loginFirebase = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error', error);
      throw error;
    }
  };

  const addHistory = async (trade: any) => {
    const formattedTrade = {
      id: String(trade.id || `trade-${Date.now()}`),
      time: String(trade.time || new Date().toLocaleTimeString('pt-BR')),
      type: String(trade.type || 'DIGIT'),
      entry: String(trade.entry || '0'),
      exit: String(trade.exit || '0'),
      price: String(trade.price || '0'),
      result: String(trade.result || '0'),
      isWin: Boolean(trade.isWin),
      market: String(trade.market || 'R_100'),
      createdAt: trade.createdAt || new Date().toISOString()
    };

    // Atualiza imediatamente o histórico local e o localStorage
    setLocalHistory(prev => {
      const updated = [formattedTrade, ...prev].slice(0, 300);
      try {
        localStorage.setItem('trading_history_local', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Se estiver conectado ao Firebase, salva também no Firestore
    if (user) {
      try {
        const dbTrade = {
          userId: user.uid,
          ...formattedTrade
        };
        await setDoc(doc(db, 'history', formattedTrade.id), dbTrade);
      } catch (e) {
        console.error("Error adding history to firestore", e);
      }
    }
  };

  const clearHistory = async (items?: any[]) => {
    setLocalHistory([]);
    try {
      localStorage.removeItem('trading_history_local');
    } catch (e) {}

    if (user && items && items.length > 0) {
      try {
        await Promise.all(items.map(i => deleteDoc(doc(db, 'history', i.id))));
      } catch(e) {
        console.error(e);
      }
    }
  };

  const upsertClient = async (client: any) => {
    if (!user) return;
    try {
        const payload: any = {
            userId: user.uid,
            name: String(client.name),
            email: String(client.email),
            planId: String(client.planId),
            expirationDate: String(client.expirationDate)
        };
        if (client.whatsapp !== undefined) payload.whatsapp = String(client.whatsapp);
        if (client.avatar !== undefined) payload.avatar = String(client.avatar);
        if (client.password !== undefined) payload.password = String(client.password);
        if (client.modules !== undefined) payload.modules = client.modules;

        await setDoc(doc(db, 'clients', client.id), payload, { merge: true });
    } catch(e) {
        console.error(e);
    }
  };
  
  const removeClient = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'clients', id));
  };

  const upsertPlan = async (plan: any) => {
     if (!user) return;
     try {
       const payload = {
         userId: user.uid,
         name: String(plan.name),
         price: Number(plan.price),
         periodDays: Number(plan.periodDays),
         status: String(plan.status)
       };
       await setDoc(doc(db, 'plans', plan.id), payload, { merge: true });
     } catch(e) {
        console.error(e);
     }
  };

  const removePlan = async (id: string) => {
     if (!user) return;
     await deleteDoc(doc(db, 'plans', id));
  };

  const upsertBot = async (bot: any) => {
    if (!user) return;
    try {
      const payload = {
        userId: user.uid,
        id: String(bot.id),
        name: String(bot.name),
        tag: String(bot.tag),
        color: String(bot.color),
        symbol: String(bot.symbol)
      };
      await setDoc(doc(db, 'customBots', bot.id), payload, { merge: true });
    } catch(e) {
      console.error(e);
    }
  };

  const removeBot = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'customBots', id));
  };

  // Histórico ativo: se tiver dados no Firestore usa os do Firestore, senão usa o histórico local
  const effectiveHistory = user && dbHistory.length > 0 ? dbHistory : localHistory;

  return {
    user,
    clients,
    plans,
    history: effectiveHistory,
    customBots,
    isLoadingDb,
    loginFirebase,
    addHistory,
    clearHistory,
    upsertClient,
    removeClient,
    upsertPlan,
    removePlan,
    upsertBot,
    removeBot
  };
}
