
import React, { useState } from 'react';
import { MenuItem } from '../types';

interface MenuEditorProps {
  items: MenuItem[];
  onUpdate: (item: MenuItem) => void;
}

export const MenuEditor: React.FC<MenuEditorProps> = ({ items, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');

  const handlePriceSave = (item: MenuItem) => {
    onUpdate({ ...item, price: tempPrice });
    setEditingId(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800">
        <div className="p-4 bg-zinc-800/50 flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-500 tracking-widest">MENU ITEMS</span>
          <span className="text-[10px] font-black text-zinc-500 tracking-widest">{items.length} TOTAL</span>
        </div>
        
        {items.map((item) => (
          <div key={item.item_id} className={`p-4 sm:p-6 flex items-center justify-between transition-opacity ${!item.available ? 'opacity-40' : ''}`}>
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-bold text-lg text-white truncate">{item.item_name}</h3>
              {editingId === item.item_id ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-zinc-500">₹</span>
                  <input 
                    type="number"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 w-24 text-white focus:outline-none focus:border-rose-500"
                    autoFocus
                  />
                  <button 
                    onClick={() => handlePriceSave(item)}
                    className="p-1.5 bg-emerald-500 rounded-lg text-black"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setEditingId(null)}
                    className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setEditingId(item.item_id);
                    setTempPrice(item.price);
                  }}
                  className="mt-1 text-emerald-400 font-bold hover:underline"
                >
                  ₹{item.price}
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className={`text-[10px] font-bold uppercase tracking-tighter ${item.available ? 'text-emerald-500' : 'text-rose-500'}`}>
                {item.available ? 'Available' : 'Sold Out'}
              </span>
              <button 
                onClick={() => onUpdate({ ...item, available: !item.available })}
                className={`relative w-12 h-6 rounded-full transition-colors ${item.available ? 'bg-emerald-600' : 'bg-zinc-800'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${item.available ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
