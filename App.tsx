
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
              setError('Secure session established, but profile load failed.');
            }
          },
          error_callback: (err: any) => {
            setError(`Security Handshake Failed: ${err.message || 'Check Authorized Origins'}`);
            setShowTroubleshooting(true);
          }
        });
      } catch (e: any) {
        setError("Init failure. Verify OAuth Client ID.");
      }
    }
  }, [isGisLoaded, settings.googleClientId]);

  const handleLogin = () => {
    if (!settings.googleClientId) {
      setError("Please configure your Google Client ID in Settings.");
      setActiveView(View.SETTINGS);
      return;
    }
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken();
    } else {
      setError("Login system initialising. Please wait a moment.");
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
      else setError('Live Sync Interrupted. Check connection.');
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
          <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-center">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
              {/* Decorative Glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-600/10 rounded-full blur-[100px]" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-600/5 rounded-full blur-[100px]" />
              
              <div className="relative z-10">
                <div className="bg-rose-600 w-24 h-24 rounded-[2rem] flex items-center justify-center text-5xl font-black mx-auto mb-8 shadow-2xl shadow-rose-900/40">D</div>
                <h2 className="text-4xl font-black mb-2 tracking-tighter text-white uppercase italic">Delhi Cafe</h2>
                <p className="text-zinc-500 text-[11px] mb-12 leading-relaxed font-black uppercase tracking-[0.6em] opacity-60">Management Dashboard</p>
                
                {error && (
                  <div className="mb-10 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-400 text-xs font-bold text-left shadow-inner">
                    <p className="font-black uppercase text-[10px] mb-2 tracking-widest text-rose-500">System Notice</p>
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <button 
                    onClick={handleLogin} 
                    disabled={!isGisLoaded} 
                    className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-[0.97] ${isGisLoaded ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                  >
                    {isGisLoaded ? "Authorise Secure Login" : "Initialising Dashboard..."}
                  </button>
                  <button onClick={() => setShowTroubleshooting(!showTroubleshooting)} className="w-full text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em] hover:text-rose-500 transition-colors py-4">
                    {showTroubleshooting ? 'Close Guide' : 'Connection Guide'}
                  </button>
                </div>
              </div>
            </div>

            {showTroubleshooting && (
              <div className="mt-8 bg-zinc-900 border border-zinc-800 p-10 rounded-[2.5rem] max-w-md w-full text-left animate-in slide-in-from-bottom-8 duration-700 relative shadow-2xl">
                {copyFeedback && <div className="absolute top-8 right-12 px-5 py-2 bg-emerald-500 text-black text-[10px] font-black rounded-full shadow-xl">COPIED</div>}
                <h4 className="text-rose-500 font-black text-sm uppercase tracking-[0.4em] mb-10 border-b border-zinc-800 pb-5">Web Console Whitelist</h4>
                <div className="space-y-10">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-black border border-zinc-700">1</span>
                      Domain Authorisation
                    </p>
                    <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-4">
                      <p className="text-xs text-zinc-400 font-medium leading-relaxed italic">Add this origin to your Google Cloud Console's "Authorized JavaScript origins":</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-black/40 px-4 py-3 rounded-2xl font-mono text-[11px] text-zinc-300 border border-zinc-800/50 break-all select-all">
                          {currentOrigin}
                        </div>
                        <button onClick={() => copyToClipboard(currentOrigin, 'ORIGIN')} className="p-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 active:scale-90 transition-all">
                          <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-black border border-zinc-700">2</span>
                      Web App Protocol
                    </p>
                    <p className="text-xs text-zinc-300 leading-normal pl-12 font-medium">Ensure your OAuth client type is <b>"Web application"</b>. Subfolder paths are not allowed in the origins field.</p>
                  </div>
                  <button onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')} className="w-full py-5 bg-rose-600 rounded-[1.75rem] text-[11px] font-black uppercase tracking-[0.5em] text-white shadow-2xl shadow-rose-900/40 hover:bg-rose-500 transition-all active:scale-[0.98]">Manage Credentials</button>
                </div>
              </div>
            )}
            <p className="mt-12 text-zinc-800 text-[11px] font-black uppercase tracking-[0.6em] shrink-0 italic opacity-50">Enterprise Management System</p>
          </div>
        );
      }

      if (!settings.spreadsheetId) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-8 text-center">
            <div className="bg-zinc-900 border border-zinc-800 p-16 rounded-[4rem] max-w-md shadow-2xl relative overflow-hidden">
               <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-600/10 rounded-full blur-[100px]" />
              <h2 className="text-4xl font-black text-white mb-6 tracking-tighter uppercase italic">Secure Connection</h2>
              <p className="text-zinc-500 text-sm mb-12 leading-relaxed font-bold">Authorised as <span className="text-zinc-200">{auth.user?.name}</span>.<br/><br/>Link your Cloud Database (Google Sheet) in settings to begin synchronizing orders.</p>
              <button onClick={() => setActiveView(View.SETTINGS)} className="w-full py-6 bg-rose-600 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs text-white shadow-2xl shadow-rose-900/50 active:scale-[0.97] transition-all">Setup Spreadsheet</button>
            </div>
          </div>
        );
      }
    }

    return (
      <Layout activeView={activeView} onViewChange={setActiveView} isRefreshing={isRefreshing} auth={auth}>
        {error && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-full max-w-xs sm:max-w-md px-4">
            <div className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-[0.5em] py-4 px-6 rounded-2xl shadow-2xl flex items-center justify-center gap-4 animate-in slide-in-from-top-4">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {error}
            </div>
          </div>
        )}
        
        {/* Quick Sync Action */}
        <div className="fixed bottom-28 right-8 sm:right-12 z-40">
           <button 
             onClick={fetchData} 
             disabled={isRefreshing}
             className={`p-5 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl text-rose-500 active:scale-90 transition-all hover:bg-zinc-800 ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
           >
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
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
