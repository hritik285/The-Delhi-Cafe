
import React from 'react';
import { Order, OrderStatus } from '../types';
import { STATUS_CONFIG, ORDER_STATUS_FLOW } from '../constants';

interface DashboardProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onSelectOrder: (order: Order) => void;
  newOrderIds: string[];
}

export const Dashboard: React.FC<DashboardProps> = ({ orders, onUpdateStatus, onSelectOrder, newOrderIds }) => {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-4 opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="font-medium text-lg">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order) => {
        const status = STATUS_CONFIG[order.order_status];
        const isNew = newOrderIds.includes(order.order_id);
        const currentIndex = ORDER_STATUS_FLOW.indexOf(order.order_status);
        const nextStatus = currentIndex < ORDER_STATUS_FLOW.length - 1 ? ORDER_STATUS_FLOW[currentIndex + 1] : null;

        return (
          <div 
            key={order.order_id}
            onClick={() => onSelectOrder(order)}
            className={`flex flex-col border rounded-2xl transition-all duration-300 overflow-hidden cursor-pointer ${isNew ? 'ring-2 ring-rose-500 animate-pulse bg-rose-950/20' : 'bg-zinc-900 border-zinc-800'}`}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <span className="text-xs font-bold mono text-zinc-500">#{order.order_id}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border tracking-wider ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>

            {/* Body */}
            <div className="p-4 flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg leading-tight text-white">{order.customer_name}</h3>
                <span className="text-sm font-bold text-emerald-400">₹{order.total_amount}</span>
              </div>
              <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{order.items}</p>
              
              <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mt-auto">
                <span>{order.order_type}</span>
                <span>{order.created_at.split(' ')[1]}</span>
              </div>
            </div>

            {/* Actions */}
            {nextStatus && (
              <div className="p-2 bg-zinc-800/50 flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(order.order_id, nextStatus);
                  }}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-xl text-xs font-bold text-zinc-200 uppercase tracking-widest"
                >
                  Move to {nextStatus}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
