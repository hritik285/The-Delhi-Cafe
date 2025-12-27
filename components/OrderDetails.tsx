
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const content = `
      <html>
        <head>
          <title>Receipt #${order.order_id}</title>
          <style>
            body { font-family: monospace; padding: 20px; width: 300px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .items { margin: 20px 0; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .footer { text-align: center; font-size: 0.8em; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <h2>THE DELHI CAFE</h2>
            <p>Order #${order.order_id}</p>
            <p>${order.created_at}</p>
          </div>
          <div class="items">
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Type:</strong> ${order.order_type.toUpperCase()}</p>
            <hr/>
            ${order.items.split(',').map(item => `<div class="row"><span>${item.trim()}</span></div>`).join('')}
          </div>
          <div class="row" style="font-weight: bold; font-size: 1.2em;">
            <span>TOTAL</span>
            <span>₹${order.total_amount}</span>
          </div>
          <div class="footer">
            <p>Thank you for ordering!</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleWhatsApp = () => {
    const cleanPhone = order.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hello ${order.customer_name}, this is The Delhi Cafe regarding your order #${order.order_id}.`);
    window.open(`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-lg bg-zinc-900 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[95vh] border border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-800 flex justify-between items-center shrink-0">
          <div>
            <span className="text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase">Order Details</span>
            <h2 className="text-2xl font-black leading-tight text-white italic">#{order.order_id}</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all text-zinc-400 active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className={`px-5 py-1.5 rounded-full font-black border text-[10px] tracking-[0.2em] uppercase ${status.bg} ${status.color}`}>
              {status.label}
            </div>
            <span className="text-xs font-bold text-zinc-500">{order.created_at}</span>
          </div>

          <div className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
             </div>
             <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Customer Profile</span>
             </div>
             <p className="text-2xl font-black text-white mb-4">{order.customer_name}</p>
             
             <div className="flex gap-3">
               <a href={`tel:${order.phone}`} className="flex-1 py-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                 Call
               </a>
               <button onClick={handleWhatsApp} className="flex-1 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/20 transition-all active:scale-95">
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                 WhatsApp
               </button>
             </div>
          </div>

          <div>
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
              Kitchen Order Ticket
            </h4>
            <div className="bg-zinc-950 rounded-3xl border border-zinc-800 divide-y divide-zinc-800 shadow-inner">
              {order.items.split(',').map((item, idx) => (
                <div key={idx} className="p-5 flex justify-between items-center group hover:bg-zinc-900/50 transition-colors">
                  <span className="font-bold text-zinc-300 text-sm italic">{item.trim()}</span>
                  <span className="text-[10px] font-black text-rose-500/40 uppercase">Qty 1</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-end p-6 bg-zinc-950 rounded-[2rem] border border-zinc-800">
             <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Payment Logic</span>
                <p className="font-black text-zinc-300 uppercase text-xs flex items-center gap-2">
                   <span className={`w-2 h-2 rounded-full ${order.payment_status.toLowerCase().includes('paid') ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                   {order.payment_status}
                </p>
             </div>
             <div className="text-right">
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Settlement</span>
                <p className="text-4xl font-black text-emerald-400 tracking-tighter italic">₹{order.total_amount}</p>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-zinc-950 border-t border-zinc-800 shrink-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <button 
              onClick={handlePrint}
              className="py-4 bg-zinc-800 border border-zinc-700 rounded-2xl flex items-center justify-center gap-3 text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print Receipt
            </button>
            <button 
              onClick={() => onUpdateStatus(order.order_id, 'completed')}
              className="py-4 bg-emerald-600 rounded-2xl flex items-center justify-center gap-3 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-900/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              Quick Complete
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {ORDER_STATUS_FLOW.map((s) => {
              const isCurrent = order.order_status === s;
              const config = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => onUpdateStatus(order.order_id, s)}
                  disabled={isCurrent}
                  className={`px-4 py-3 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all border whitespace-nowrap shrink-0 ${isCurrent ? 'bg-zinc-800 border-zinc-700 text-zinc-600' : `${config.bg} ${config.color} active:scale-95`}`}
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
