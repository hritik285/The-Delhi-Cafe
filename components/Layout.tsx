
import React from 'react';
import { View, GoogleAuthState } from '../types';
import { ICONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onViewChange: (view: View) => void;
  isRefreshing: boolean;
  auth: GoogleAuthState;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange, isRefreshing, auth }) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-rose-600 w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold">D</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">The Delhi Cafe</h1>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-xs text-zinc-500 uppercase font-medium">{isRefreshing ? 'Syncing...' : 'Connected'}</span>
            </div>
          </div>
        </div>
        
        {auth.user && (
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-zinc-950 rounded-full border border-zinc-800">
            <img src={auth.user.picture} className="w-6 h-6 rounded-full" alt="User" />
            <span className="text-sm font-medium">{auth.user.name}</span>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar bg-zinc-950 relative">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex justify-around items-center px-4 py-2 bg-zinc-900 border-t border-zinc-800 sm:px-12 shrink-0">
        <button 
          onClick={() => onViewChange(View.ORDERS)}
          className={`flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all ${activeView === View.ORDERS ? 'text-rose-500 bg-rose-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <ICONS.Orders />
          <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
        </button>
        <button 
          onClick={() => onViewChange(View.MENU)}
          className={`flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all ${activeView === View.MENU ? 'text-rose-500 bg-rose-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <ICONS.Menu />
          <span className="text-[10px] font-bold uppercase tracking-wider">Menu</span>
        </button>
        <button 
          onClick={() => onViewChange(View.SETTINGS)}
          className={`flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all ${activeView === View.SETTINGS ? 'text-rose-500 bg-rose-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <ICONS.Settings />
          <span className="text-[10px] font-bold uppercase tracking-wider">Settings</span>
        </button>
      </nav>
    </div>
  );
};
