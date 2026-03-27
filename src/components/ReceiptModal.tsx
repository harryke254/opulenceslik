import React, { useRef, useState } from 'react';
import { X, CheckCircle2, MapPin, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Order } from '../types';
import { formatPrice } from '../lib/storage';
import { useStoreSettings } from '../hooks/useStoreSettings';

interface ReceiptModalProps {
  order: Order;
  onClose: () => void;
  allowDownload?: boolean;
}

export default function ReceiptModal({ order, onClose, allowDownload = false }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { logoUrl } = useStoreSettings();

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;
    
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const link = document.createElement('a');
      link.download = `Receipt-${order.orderNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('There was an error generating your receipt. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] relative z-10">
        <div className="overflow-y-auto flex-1">
          <div ref={receiptRef} className="bg-white">
            <div className="bg-[#110A08] text-white p-6 text-center relative">
              <button 
                onClick={onClose}
                className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors"
                data-html2canvas-ignore
              >
                <X size={20} />
              </button>
              <div className="flex justify-center mb-4">
                <img src={logoUrl} alt="Opulence Slik" className="h-16 w-auto object-contain rounded-full bg-white" crossOrigin="anonymous" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-1">Order Receipt</h2>
              <p className="text-white/80 text-sm">Opulence Slik</p>
            </div>

            <div className="p-6">
              <div className="flex justify-between text-sm mb-6 bg-[#F9FAFB] p-4 rounded-xl">
                <div>
                  <p className="text-[#6B7280] mb-1">Order Number</p>
                  <p className="font-bold text-[#110A08]">{order.orderNumber}</p>
                  <p className="text-[#6B7280] mb-1 mt-3">Payment Method</p>
                  <p className="font-bold text-[#110A08]">WhatsApp / Cash on Delivery</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-[#6B7280] mb-1">Date</p>
                  <p className="font-bold text-[#110A08]">{new Date(order.date).toLocaleDateString()}</p>
                  <div className="mt-3">
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded ${order.status === 'paid' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
                      {order.status === 'paid' ? 'PAID' : 'PAY ON DELIVERY'}
                    </span>
                  </div>
                </div>
              </div>

              {order.customerName && (
                <div className="mb-6 text-sm bg-[#F9FAFB] p-4 rounded-xl">
                  <p className="text-[#6B7280] mb-1">Delivery To</p>
                  <p className="font-medium text-[#110A08]">{order.customerName}</p>
                  <p className="text-[#4B5563]">{order.customerPhone}</p>
                  <p className="text-[#4B5563] mt-1 flex items-center gap-1">
                    <MapPin size={14} />
                    {order.deliveryZone} {order.deliveryAddress ? `- ${order.deliveryAddress}` : ''}
                  </p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <h3 className="font-medium text-[#111827] border-b border-[#F3F4F6] pb-2">Order Summary</h3>
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm items-center">
                    <div className="flex gap-3 items-center">
                      <span className="bg-[#F3F4F6] text-[#4B5563] w-6 h-6 rounded flex items-center justify-center font-medium text-xs">
                        {item.quantity}
                      </span>
                      <span className="font-medium text-[#110A08]">{item.name}</span>
                    </div>
                    <span className="text-[#110A08] font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm items-center pt-2">
                  <span className="text-[#4B5563]">Subtotal</span>
                  <span className="text-[#110A08] font-medium">{formatPrice(order.total)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-[#4B5563]">Delivery Fee</span>
                  <span className="text-[#110A08] font-medium">{order.deliveryFee === 0 ? 'Free' : formatPrice(order.deliveryFee)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-[#E5E7EB] pt-4 flex justify-between items-center mt-6">
                <span className="font-bold text-[#6B7280] uppercase tracking-wider text-sm">Total Amount</span>
                <span className="font-bold text-2xl text-[#D4AF37]">{formatPrice(order.finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {allowDownload && (
          <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
            <button 
              onClick={downloadReceipt}
              disabled={isDownloading}
              className="w-full bg-[#110A08] text-white py-3.5 rounded-xl font-medium hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              {isDownloading ? 'Generating...' : 'Download Receipt'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
