
import React from 'react';
import { Order, OrderStatus } from '../types';
import { STATUS_CONFIG, ORDER_STATUS_FLOW } from '../constants';

interface OrderDetailsProps {
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}

export const OrderDetails: React.FC<OrderDetailsProps> = ({ order, onClose, onUpdateStatus }) => {
  if (!order) return null;

  const status = STATUS_CONFIG[order.order_status];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 rounded-3xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center shrink-0">
          <div>
            <span className="text-xs font-bold mono text-zinc-500">ORDER DETAILS</span>
            <h2 className="text-xl font-bold leading-none">#{order.order_id}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className={`px-4 py-1 rounded-full font-black border text-xs tracking-widest ${status.bg} ${status.color}`}>
              {status.label}
            </div>
            <span className="text-sm font-medium text-zinc-500">{order.created_at}</span>
          </div>

          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
             <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Customer</span>
             </div>
             <p className="text-lg font-bold">{order.customer_name}</p>
             <a href={`tel:${order.phone}`} className="mt-2 inline-flex items-center gap-2 text-rose-500 font-bold hover:underline">
               <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
               </svg>
               {order.phone}
             </a>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Order Items</h4>
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 divide-y divide-zinc-800">
              {order.items.split(',').map((item, idx) => (
                <div key={idx} className="p-4 flex justify-between items-center">
                  <span className="font-medium text-zinc-300">{item.trim()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
             <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Payment</span>
                <p className="font-bold text-zinc-300 uppercase text-xs">{order.payment_status}</p>
             </div>
             <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Total Amount</span>
                <p className="text-2xl font-black text-emerald-400 tracking-tight">₹{order.total_amount}</p>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-zinc-950 border-t border-zinc-800 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            {ORDER_STATUS_FLOW.map((s) => {
              const isCurrent = order.order_status === s;
              const config = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => onUpdateStatus(order.order_id, s)}
                  disabled={isCurrent}
                  className={`py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${isCurrent ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : `${config.bg} ${config.color} active:scale-95`}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
