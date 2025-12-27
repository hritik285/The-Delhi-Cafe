
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
        // Clear previous client if it exists to avoid stale configs
        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets',
          prompt: 'consent select_account',
          callback: async (response: any) => {
            if (response.error) {
              setError(`Google Error: ${response.error_description || response.error}`);
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
              console.error('Failed to fetch user info', err);
              setError('Signed in, but profile fetch failed.');
            }
          },
          error_callback: (err: any) => {
            setError(`Config Error: ${err.message || 'Verification Failed'}`);
            setShowTroubleshooting(true);
          }
        });
      } catch (e: any) {
        console.error("GIS Init Error:", e);
        setError("Init failed. Check Client ID type.");
      }
    } else {
      tokenClientRef.current = null;
    }
  }, [isGisLoaded, settings.googleClientId]);

  const handleLogin = () => {
    if (!settings.googleClientId) {
      setError("Enter Client ID in Settings first.");
      setActiveView(View.SETTINGS);
      return;
    }

    if (tokenClientRef.current) {
      try {
        tokenClientRef.current.requestAccessToken();
      } catch (e: any) {
        setError(`Request failed: ${e.message}`);
        setShowTroubleshooting(true);
      }
    } else {
      setError("Login system failed to load. Use the guide below.");
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
    } else {
      serviceRef.current = null;
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
      if (latestOrder) {
        if (metaTimestamp && latestOrder.created_at > metaTimestamp) {
          const newlyArrived = fetchedOrders
            .filter(o => o.created_at > metaTimestamp)
            .map(o => o.order_id);
          if (newlyArrived.length > 0) {
            setNewOrderIds(prev => Array.from(new Set([...prev, ...newlyArrived])));
            if (settings.soundEnabled && audioRef.current) audioRef.current.play().catch(() => {});
            if (settings.vibrateEnabled && navigator.vibrate) navigator.vibrate([200, 100, 200]);
            await serviceRef.current.updateMeta('last_seen_order_timestamp', latestOrder.created_at);
          }
        } else if (!metaTimestamp) {
          await serviceRef.current.updateMeta('last_seen_order_timestamp', latestOrder.created_at);
        }
      }
    } catch (err: any) {
      if (err.status === 401) setAuth({ accessToken: null, user: null });
      else setError('Google Sheets sync failed.');
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
    } catch (err) { setError('Update failed.'); } finally { setIsRefreshing(false); }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const currentOrigin = window.location.origin;

  const renderContent = () => {
    if (activeView !== View.SETTINGS) {
      if (!auth.accessToken) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-center overflow-y-auto no-scrollbar">
            {/* Origin Diagnostic Badge - CRITICAL FOR FIXING ERROR 400 */}
            <div className="mb-6 animate-bounce">
               <div className="inline-flex flex-col bg-rose-600 px-4 py-2 rounded-2xl shadow-xl border-2 border-white/20">
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/60 mb-1">Critical: Use this Origin</span>
                  <span className="text-[11px] font-mono font-black text-white">{currentOrigin}</span>
               </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl relative overflow-hidden shrink-0">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-rose-600/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="bg-rose-600 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-6 shadow-lg shadow-rose-600/30">D</div>
                <h2 className="text-2xl font-black mb-2 tracking-tight text-white uppercase italic">Delhi Cafe</h2>
                <p className="text-zinc-500 text-sm mb-8 leading-relaxed font-black uppercase tracking-widest text-[10px] opacity-60">Admin Terminal</p>
                {error && (
                  <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-bold text-left leading-normal">
                    <p className="font-black uppercase text-[10px] mb-2 tracking-widest text-rose-500">SYSTEM ALERT: INVALID REQUEST</p>
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <button onClick={handleLogin} disabled={!isGisLoaded} className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.95] ${isGisLoaded ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}>
                    {isGisLoaded ? "Retry Auth Flow" : "Initialising..."}
                  </button>
                  <button onClick={() => setShowTroubleshooting(!showTroubleshooting)} className="w-full text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-rose-500 transition-colors py-2">
                    {showTroubleshooting ? 'Close Guide' : 'Fix Error 400 Guide'}
                  </button>
                  <button onClick={() => setActiveView(View.SETTINGS)} className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em] hover:text-zinc-500 transition-colors">Manual Config</button>
                </div>
              </div>
            </div>

            {showTroubleshooting && (
              <div className="mt-6 bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] max-w-sm w-full text-left animate-in slide-in-from-bottom-6 duration-500 relative shadow-2xl">
                {copyFeedback && <div className="absolute top-4 right-8 px-3 py-1 bg-emerald-500 text-black text-[10px] font-black rounded-full animate-bounce shadow-lg">COPIED</div>}
                <h4 className="text-rose-500 font-black text-[12px] uppercase tracking-[0.25em] mb-6 border-b border-zinc-800 pb-3 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" /> Final Fix List
                </h4>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">1</span>
                      Origin Whitelist
                    </p>
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3">
                      <p className="text-[11px] text-zinc-300 leading-normal font-bold uppercase tracking-tight">Paste this exactly in Google Console's "JavaScript Origins":</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-black/40 px-3 py-2 rounded-xl font-mono text-[10px] text-emerald-400 overflow-x-auto whitespace-nowrap border border-zinc-800/50">
                          {currentOrigin}
                        </div>
                        <button onClick={() => copyToClipboard(currentOrigin, 'ORIGIN')} className="shrink-0 p-2 bg-emerald-600 rounded-lg text-black active:scale-90">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2v-2" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">2</span>
                      Web App Type
                    </p>
                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                      <p className="text-[11px] text-zinc-200 leading-normal font-bold">
                        Ensure you are using a <span className="text-rose-500">"Web application"</span> client. "Android" clients will NOT work here.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">3</span>
                      Browser Cookies
                    </p>
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                      <p className="text-[11px] text-zinc-300 leading-normal">
                        If using Incognito/Private mode, you must <b>"Allow third-party cookies"</b> or the Google popup will fail.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')} className="w-full py-4 bg-rose-600 rounded-[1.2rem] text-[11px] font-black uppercase tracking-[0.3em] text-white shadow-xl shadow-rose-600/30 hover:bg-rose-500 transition-all">Open Google Console</button>
                </div>
              </div>
            )}
            <p className="mt-8 text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em] shrink-0 opacity-40">System Awaiting Correct Origin</p>
          </div>
        );
      }

      if (!settings.spreadsheetId) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-8 text-center">
            <div className="bg-rose-600/10 border border-rose-500/20 p-8 rounded-[3.5rem] max-w-sm shadow-2xl relative overflow-hidden">
               <div className="absolute -top-10 -left-10 w-24 h-24 bg-rose-600/10 rounded-full blur-3xl" />
              <h2 className="text-2xl font-black text-white mb-4 tracking-tight uppercase italic">Terminal Online</h2>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed font-medium">Authorised as <b>{auth.user?.name}</b>.<br/><br/>Link your <b>Spreadsheet ID</b> in the settings to activate the order database.</p>
              <button onClick={() => setActiveView(View.SETTINGS)} className="w-full py-5 bg-rose-600 rounded-[1.5rem] font-black uppercase tracking-widest text-xs text-white shadow-2xl shadow-rose-600/30 active:scale-95 transition-all">Link Database</button>
            </div>
          </div>
        );
      }
    }

    return (
      <Layout activeView={activeView} onViewChange={setActiveView} isRefreshing={isRefreshing} auth={auth}>
        {error && <div className="sticky top-0 z-40 bg-rose-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-3 text-center shadow-2xl animate-pulse">{error}</div>}
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
