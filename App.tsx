
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Order, MenuItem, AppSettings, GoogleAuthState, OrderStatus } from './types';
import { GoogleSheetsService } from './services/googleSheets';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MenuEditor } from './components/MenuEditor';
import { Settings } from './components/Settings';
import { OrderDetails } from './components/OrderDetails';

const DEFAULT_SETTINGS: AppSettings = {
  pollingInterval: 20,
  soundEnabled: true,
  vibrateEnabled: true,
  spreadsheetId: '',
  googleClientId: '',
  googleClientSecret: '',
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.ORDERS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...parsed };
  });
  const [auth, setAuth] = useState<GoogleAuthState>({ accessToken: null, user: null });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const serviceRef = useRef<GoogleSheetsService | null>(null);
  const tokenClientRef = useRef<any>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.load();
  }, []);

  useEffect(() => {
    const checkGis = () => {
      if ((window as any).google?.accounts?.oauth2) {
        setIsGisLoaded(true);
      } else {
        setTimeout(checkGis, 500);
      }
    };
    checkGis();
  }, []);

  useEffect(() => {
    const google = (window as any).google;
    const clientId = settings.googleClientId?.trim();
    
    if (isGisLoaded && clientId && google?.accounts?.oauth2) {
      try {
        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets',
          prompt: 'consent select_account',
          callback: async (response: any) => {
            if (response.error) {
              setError(`Auth Flow Error: ${response.error_description || response.error}`);
              setShowTroubleshooting(true);
              return;
            }
            const accessToken = response.access_token;
            
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              const userData = await userRes.json();
              
              setAuth({
                accessToken,
                user: {
                  email: userData.email,
                  name: userData.name,
                  picture: userData.picture
                }
              });
              setError(null);
              setShowTroubleshooting(false);
              setActiveView(View.ORDERS);
            } catch (err) {
              setError('Connected, but profile load failed.');
            }
          },
          error_callback: (err: any) => {
            setError(`Handshake Failed: ${err.message || 'Check Console Origins'}`);
            setShowTroubleshooting(true);
          }
        });
      } catch (e: any) {
        setError("Init failure. Verify Client ID type.");
      }
    }
  }, [isGisLoaded, settings.googleClientId]);

  const handleLogin = () => {
    if (!settings.googleClientId) {
      setError("Provide Client ID in Settings.");
      setActiveView(View.SETTINGS);
      return;
    }
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken();
    } else {
      setError("Login system not ready. Verify Web App Client ID.");
      setShowTroubleshooting(true);
    }
  };

  const handleLogout = () => {
    setAuth({ accessToken: null, user: null });
    setOrders([]);
    setMenuItems([]);
    tokenClientRef.current = null;
  };

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (auth.accessToken && settings.spreadsheetId) {
      serviceRef.current = new GoogleSheetsService(settings.spreadsheetId.trim(), auth.accessToken);
    }
  }, [auth.accessToken, settings.spreadsheetId]);

  const fetchData = useCallback(async () => {
    if (!serviceRef.current || !settings.spreadsheetId) return;
    try {
      setIsRefreshing(true);
      setError(null);
      const fetchedOrders = await serviceRef.current.getOrders();
      const fetchedMenu = await serviceRef.current.getMenu();
      const metaTimestamp = await serviceRef.current.getMeta('last_seen_order_timestamp');
      setOrders(fetchedOrders);
      setMenuItems(fetchedMenu);
      
      const latestOrder = fetchedOrders[0];
      if (latestOrder && metaTimestamp && latestOrder.created_at > metaTimestamp) {
        const newlyArrived = fetchedOrders
          .filter(o => o.created_at > metaTimestamp)
          .map(o => o.order_id);
        if (newlyArrived.length > 0) {
          setNewOrderIds(prev => Array.from(new Set([...prev, ...newlyArrived])));
          if (settings.soundEnabled && audioRef.current) audioRef.current.play().catch(() => {});
          if (settings.vibrateEnabled && navigator.vibrate) navigator.vibrate([300, 100, 300]);
          await serviceRef.current.updateMeta('last_seen_order_timestamp', latestOrder.created_at);
        }
      } else if (latestOrder && !metaTimestamp) {
        await serviceRef.current.updateMeta('last_seen_order_timestamp', latestOrder.created_at);
      }
    } catch (err: any) {
      if (err.status === 401) setAuth({ accessToken: null, user: null });
      else setError('Sheets Sync Failed.');
    } finally {
      setIsRefreshing(false);
    }
  }, [settings.spreadsheetId, settings.soundEnabled, settings.vibrateEnabled]);

  useEffect(() => {
    if (auth.accessToken) {
      fetchData();
      const interval = setInterval(fetchData, settings.pollingInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchData, settings.pollingInterval, auth.accessToken]);

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    if (!serviceRef.current) return;
    try {
      setIsRefreshing(true);
      await serviceRef.current.updateOrderStatus(id, status);
      setOrders(prev => prev.map(o => o.order_id === id ? { ...o, order_status: status } : o));
      setNewOrderIds(prev => prev.filter(nid => nid !== id));
    } catch (err) { setError('Status update failed.'); } finally { setIsRefreshing(false); }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const currentOrigin = window.location.origin;
  const currentUrl = window.location.href;

  const renderContent = () => {
    if (activeView !== View.SETTINGS) {
      if (!auth.accessToken) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-center overflow-y-auto no-scrollbar">
            {/* GitHub Specific Diagnostic */}
            <div className="mb-8 w-full max-w-sm">
               <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-4">GitHub Pages Diagnostic</p>
                  
                  <div className="space-y-4">
                    <div className="text-left">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-rose-500 uppercase">1. Bare Origin (Add this)</span>
                        <button onClick={() => copyToClipboard(currentOrigin, 'ORIGIN')} className="text-[9px] text-zinc-400 underline">Copy</button>
                      </div>
                      <div className="bg-black/40 px-3 py-2 rounded-xl font-mono text-[10px] text-zinc-400 border border-zinc-800 break-all">{currentOrigin}</div>
                    </div>

                    <div className="text-left">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-emerald-500 uppercase">2. Redirect URI (Add this too)</span>
                        <button onClick={() => copyToClipboard(currentUrl, 'URL')} className="text-[9px] text-zinc-400 underline">Copy</button>
                      </div>
                      <div className="bg-black/40 px-3 py-2 rounded-xl font-mono text-[10px] text-zinc-400 border border-zinc-800 break-all">{currentUrl}</div>
                    </div>
                  </div>
               </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3.5rem] max-w-sm w-full shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-600/10 rounded-full blur-[80px]" />
              <div className="relative z-10">
                <div className="bg-rose-600 w-20 h-20 rounded-[1.75rem] flex items-center justify-center text-4xl font-black mx-auto mb-8 shadow-2xl shadow-rose-600/40">D</div>
                <h2 className="text-3xl font-black mb-3 tracking-tighter text-white uppercase italic">Delhi Cafe</h2>
                <p className="text-zinc-500 text-[10px] mb-10 leading-relaxed font-black uppercase tracking-[0.5em] opacity-50">Web Terminal</p>
                {error && (
                  <div className="mb-8 p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-400 text-[11px] font-bold text-left shadow-inner">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <button onClick={handleLogin} disabled={!isGisLoaded} className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-90 ${isGisLoaded ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                    {isGisLoaded ? "Sign In with Google" : "System Booting..."}
                  </button>
                  <button onClick={() => setShowTroubleshooting(!showTroubleshooting)} className="w-full text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] hover:text-rose-500 transition-colors py-4">
                    {showTroubleshooting ? 'Hide Guide' : 'GitHub Fix Guide'}
                  </button>
                </div>
              </div>
            </div>

            {showTroubleshooting && (
              <div className="mt-8 bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] max-w-sm w-full text-left animate-in slide-in-from-bottom-8 duration-700 relative shadow-2xl">
                {copyFeedback && <div className="absolute top-6 right-10 px-4 py-1.5 bg-emerald-500 text-black text-[10px] font-black rounded-full shadow-xl">COPIED</div>}
                <h4 className="text-rose-500 font-black text-[13px] uppercase tracking-[0.3em] mb-8 border-b border-zinc-800 pb-4">GitHub Deployment Guide</h4>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-500 uppercase">1. Application Type</p>
                    <p className="text-[11px] text-zinc-300 leading-normal">Delete any "Android" or "iOS" credentials. You MUST create a <b>Web Application</b> client.</p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-500 uppercase">2. Authorized Origins</p>
                    <p className="text-[11px] text-zinc-300 leading-normal">Google strictly forbids subfolders in origins. Add only <code>{currentOrigin}</code> to the origins list.</p>
                  </div>
                  <button onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')} className="w-full py-5 bg-rose-600 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.4em] text-white shadow-2xl shadow-rose-900/30 hover:bg-rose-500 transition-all">Go to Cloud Console</button>
                </div>
              </div>
            )}
            <p className="mt-12 text-zinc-800 text-[10px] font-black uppercase tracking-[0.5em] shrink-0 italic opacity-40">Ready for Global Deployment</p>
          </div>
        );
      }
    }

    return (
      <Layout activeView={activeView} onViewChange={setActiveView} isRefreshing={isRefreshing} auth={auth}>
        {error && <div className="sticky top-0 z-40 bg-rose-600 text-white text-[10px] font-black uppercase tracking-[0.4em] py-4 text-center shadow-2xl animate-pulse">{error}</div>}
        
        <div className="fixed bottom-24 right-6 z-30">
           <button 
             onClick={fetchData} 
             disabled={isRefreshing}
             className={`p-4 rounded-full bg-zinc-900 border border-zinc-800 shadow-2xl text-rose-500 active:scale-75 transition-all ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
           >
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
           </button>
        </div>

        {activeView === View.ORDERS && <Dashboard orders={orders} onUpdateStatus={updateOrderStatus} onSelectOrder={setSelectedOrder} newOrderIds={newOrderIds} />}
        {activeView === View.MENU && <MenuEditor items={menuItems} onUpdate={async (item) => { if (serviceRef.current) { await serviceRef.current.updateMenuItem(item); setMenuItems(prev => prev.map(m => m.item_id === item.item_id ? item : m)); } }} />}
        {activeView === View.SETTINGS && <Settings settings={settings} updateSettings={(s) => setSettings(prev => ({ ...prev, ...s }))} auth={auth} onLogout={handleLogout} onLogin={handleLogin} />}
        <OrderDetails order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdateStatus={updateOrderStatus} />
      </Layout>
    );
  };

  return renderContent();
};

export default App;
