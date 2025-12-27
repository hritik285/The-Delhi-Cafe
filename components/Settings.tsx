
import React, { useState } from 'react';
import { AppSettings, GoogleAuthState } from '../types';

interface SettingsProps {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  auth: GoogleAuthState;
  onLogout: () => void;
  onLogin: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, updateSettings, auth, onLogout, onLogin }) => {
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const currentOrigin = window.location.origin;

  const copyOrigin = () => {
    navigator.clipboard.writeText(currentOrigin);
    setShowCopyTooltip(true);
    setTimeout(() => setShowCopyTooltip(false), 2000);
  };

  return (
    <div className="p-6 sm:p-12 space-y-8 pb-32 max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">System Configuration</h2>
          <p className="text-xs text-zinc-500 font-black uppercase tracking-[0.4em] mt-1">Delhi Cafe Web Dashboard</p>
        </div>
      </div>

      {/* Identity Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-600/5 rounded-full blur-[50px] group-hover:bg-rose-600/10 transition-colors" />
        
        <h3 className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-6 flex items-center gap-3">
          <span className="w-2 h-2 bg-rose-600 rounded-full" />
          Operator Authentication
        </h3>

        {auth.user ? (
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="flex items-center gap-6 flex-1">
              <img src={auth.user.picture} className="w-20 h-20 rounded-[1.5rem] shadow-2xl border-2 border-zinc-800" alt="Profile" />
              <div className="min-w-0">
                <p className="font-black text-2xl text-white truncate">{auth.user.name}</p>
                <p className="text-xs text-zinc-500 truncate font-mono tracking-tight mt-1">{auth.user.email}</p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase">Secure Active Session</span>
                </div>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full sm:w-auto px-10 py-5 bg-zinc-800 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-95"
            >
              Disconnect Terminal
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6">
            <div className="bg-rose-500/10 w-16 h-16 rounded-3xl flex items-center justify-center mb-6 border border-rose-500/20">
               <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <p className="text-zinc-500 font-bold text-sm mb-8">Authorisation required for cloud synchronization</p>
            <button 
              onClick={onLogin}
              className="px-12 py-5 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-2xl"
            >
              Log In as Administrator
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Connection Setup */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-8 flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            Cloud Database Links
          </h3>
          
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">OAuth Client Identifier</label>
                <button 
                  onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                  className="text-rose-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-rose-400 transition-colors"
                >
                  GCP Console
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
              <input 
                type="text" 
                value={settings.googleClientId}
                onChange={(e) => updateSettings({ googleClientId: e.target.value.trim() })}
                placeholder="xxxx-xxxx.apps.googleusercontent.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-5 text-xs focus:outline-none focus:border-rose-600 font-mono text-zinc-300 transition-all shadow-inner"
              />
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl mt-4">
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">Domain Whitelist Origin</p>
                 <div className="flex items-center gap-3">
                    <code className="flex-1 text-[11px] font-mono text-zinc-500 overflow-x-auto whitespace-nowrap">{currentOrigin}</code>
                    <button onClick={copyOrigin} className="text-[10px] font-black text-zinc-400 hover:text-white transition-colors">
                      {showCopyTooltip ? 'COPIED' : 'COPY'}
                    </button>
                 </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">Spreadsheet Resource ID</label>
              <input 
                type="text" 
                value={settings.spreadsheetId}
                onChange={(e) => updateSettings({ spreadsheetId: e.target.value.trim() })}
                placeholder="Unique ID from Google Sheets URL"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-5 text-xs focus:outline-none focus:border-rose-600 font-mono text-zinc-300 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Dashboard Tuning */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col">
          <h3 className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-8 flex items-center gap-3">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            Terminal Operations
          </h3>
          
          <div className="space-y-10 flex-1">
             <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-zinc-100 italic">Auditory Alerts</p>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Order Arrival Chime</p>
                </div>
                <button 
                  onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                  className={`relative w-16 h-8 rounded-full transition-all duration-500 ${settings.soundEnabled ? 'bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.4)]' : 'bg-zinc-800'}`}
                >
                  <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 ${settings.soundEnabled ? 'translate-x-8' : 'translate-x-0'}`} />
                </button>
             </div>
             
             <div className="space-y-6">
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-lg font-black text-zinc-100 italic">Data Frequency</p>
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Cloud Sync every {settings.pollingInterval}s</p>
                   </div>
                   <span className="text-2xl font-black text-rose-500 italic">{settings.pollingInterval}s</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="120" step="5"
                  value={settings.pollingInterval}
                  onChange={(e) => updateSettings({ pollingInterval: parseInt(e.target.value) })}
                  className="w-full h-2 bg-zinc-800 rounded-full appearance-none accent-rose-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-black text-zinc-700 uppercase tracking-widest">
                   <span>Performance</span>
                   <span>Stability</span>
                </div>
             </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-zinc-800">
             <p className="text-center text-[11px] text-zinc-700 font-black uppercase tracking-[0.6em] opacity-30 italic">Delhi Cafe Terminal Logic v2.4.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};
