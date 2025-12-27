
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

  const isProbablyAndroidId = settings.googleClientId.includes('android');

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-20">
      {/* Account Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
        </div>
        
        <h3 className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-4">Identity</h3>
        {auth.user ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <img src={auth.user.picture} className="w-14 h-14 rounded-2xl shadow-xl border border-zinc-700" alt="Profile" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-xl truncate text-white">{auth.user.name}</p>
                <p className="text-xs text-zinc-500 truncate font-mono">{auth.user.email}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full py-3.5 bg-zinc-800 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-rose-500/10 transition-all active:scale-[0.98]"
            >
              Sign Out & Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
               <p className="text-xs font-bold uppercase tracking-wider">Terminal Offline</p>
            </div>
            <button 
              onClick={onLogin}
              className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl active:scale-[0.95] transition-all shadow-lg"
            >
              Authorise with Google
            </button>
          </div>
        )}
      </div>

      {/* API Configuration */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-zinc-800/30 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Connectivity Settings</span>
          <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-bold uppercase">v1.1.2</div>
        </div>

        <div className="p-5 space-y-6">
          {/* Client ID Field */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">OAuth Client ID</label>
              <button 
                onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                className="text-rose-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-rose-400 transition-colors"
              >
                Open Console
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            
            <input 
              type="text" 
              value={settings.googleClientId}
              onChange={(e) => updateSettings({ googleClientId: e.target.value.trim() })}
              placeholder="000000000-xxxx.apps.googleusercontent.com"
              className={`w-full bg-zinc-950 border ${isProbablyAndroidId ? 'border-rose-500' : 'border-zinc-800'} rounded-2xl px-4 py-4 text-xs focus:outline-none focus:border-rose-600 font-mono text-zinc-300 transition-all placeholder:text-zinc-800`}
            />

            {/* Crucial Fix Helper */}
            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-4">
              <div>
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Step 1: Application Type</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">Must select <b>"Web application"</b> in Google Console. (Android type will cause Error 400).</p>
              </div>
              
              <div className="pt-2 border-t border-zinc-900">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Step 2: Copy this Origin</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-black/40 px-3 py-2 rounded-xl font-mono text-[10px] text-zinc-500 overflow-x-auto whitespace-nowrap border border-zinc-800/50">
                    {currentOrigin}
                  </div>
                  <button 
                    onClick={copyOrigin}
                    className="shrink-0 h-9 w-9 flex items-center justify-center bg-emerald-500 rounded-xl text-black active:scale-90 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {showCopyTooltip ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-zinc-600 mt-2 italic font-medium uppercase tracking-tighter">Paste in "Authorised JavaScript origins" field.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">Spreadsheet ID</label>
            <input 
              type="text" 
              value={settings.spreadsheetId}
              onChange={(e) => updateSettings({ spreadsheetId: e.target.value.trim() })}
              placeholder="e.g. 1aBC-def_GHiJkLmNoPq"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-xs focus:outline-none focus:border-rose-600 font-mono text-zinc-300 transition-all placeholder:text-zinc-800"
            />
          </div>
        </div>

        <div className="p-5 bg-zinc-800/20 border-t border-zinc-800 space-y-4">
           <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-zinc-200">Alert Sounds</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">New Order Notifications</p>
              </div>
              <button 
                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`relative w-12 h-6 rounded-full transition-all duration-500 ${settings.soundEnabled ? 'bg-rose-600 shadow-lg shadow-rose-600/30' : 'bg-zinc-800'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
           </div>
           
           <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-zinc-200">Sync Frequency</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Auto-Refresh every {settings.pollingInterval}s</p>
              </div>
              <input 
                type="range" 
                min="10" max="60" step="5"
                value={settings.pollingInterval}
                onChange={(e) => updateSettings({ pollingInterval: parseInt(e.target.value) })}
                className="w-24 accent-rose-500"
              />
           </div>
        </div>
      </div>
      
      <p className="text-center text-[10px] text-zinc-700 uppercase font-black tracking-[0.4em] pt-8 opacity-40">
        The Delhi Cafe • Secure Terminal
      </p>
    </div>
  );
};
