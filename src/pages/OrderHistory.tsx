import React, { useState, useEffect } from 'react';
import { formatPrice, handleFirestoreError, OperationType, getOrderByDetails } from '../lib/storage';
import { Order } from '../types';
import { Package, Clock, Truck, CheckCircle2, XCircle, ArrowLeft, Search, History, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReceiptModal from '../components/ReceiptModal';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, documentId } from 'firebase/firestore';

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    const historyIds = JSON.parse(localStorage.getItem('opulence_order_history') || '[]');
    
    if (historyIds.length === 0) {
      setIsLoadingHistory(false);
      return;
    }

    // Fetch recent orders from history
    const q = query(collection(db, 'orders'), where(documentId(), 'in', historyIds.slice(-10)));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setIsLoadingHistory(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders/history');
      setIsLoadingHistory(false);
    });

    return () => unsubscribe();
  }, []);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchOrderNumber || !searchPhone) return;

    setIsSearching(true);
    setSearchError('');

    try {
      const order = await getOrderByDetails(searchOrderNumber, searchPhone);
      if (order) {
        setSelectedOrder(order);
        // Add to history if not already there
        const history = JSON.parse(localStorage.getItem('opulence_order_history') || '[]');
        if (!history.includes(order.id)) {
          localStorage.setItem('opulence_order_history', JSON.stringify([...history, order.id]));
          // The useEffect will pick this up if we were to refresh, but for now we just show the modal
        }
      } else {
        setSearchError('Order not found. Please check your details and try again.');
      }
    } catch (error) {
      setSearchError('An error occurred while searching. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment': return <Clock className="text-orange-500" size={20} />;
      case 'paid': return <CheckCircle2 className="text-green-500" size={20} />;
      case 'pending': return <Clock className="text-yellow-500" size={20} />;
      case 'processing': return <Package className="text-blue-500" size={20} />;
      case 'dispatched': return <Truck className="text-purple-500" size={20} />;
      case 'delivered': return <CheckCircle2 className="text-green-500" size={20} />;
      case 'cancelled': return <XCircle className="text-red-500" size={20} />;
      default: return <Clock className="text-gray-500" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'dispatched': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-gray-50 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-[#110A08]" />
            </Link>
            <h1 className="text-xl font-serif font-bold text-[#110A08]">Track Order</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Track Form */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 mb-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-[#110A08] text-white rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#110A08] mb-2">Find Your Order</h2>
            <p className="text-gray-500 mb-8 font-light">Enter your order details to track your package in real-time.</p>
            
            <form onSubmit={handleTrackOrder} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Order Number (e.g. OP-12345)"
                  value={searchOrderNumber}
                  onChange={(e) => setSearchOrderNumber(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all uppercase"
                  required
                />
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Phone Number used for order"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              {searchError && (
                <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{searchError}</p>
              )}
              <button
                type="submit"
                disabled={isSearching}
                className="w-full py-4 bg-[#110A08] text-white rounded-full text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-[#D4AF37] transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  'Track Now'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Recent History */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-6">
            <History size={20} className="text-[#D4AF37]" />
            <h3 className="text-lg font-serif font-bold text-[#110A08]">Recent Orders</h3>
          </div>

          {isLoadingHistory ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-[#D4AF37]" />
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center border border-dashed border-gray-200">
              <Package size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-light italic">No recent orders found in your history.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-[#D4AF37] group-hover:bg-[#110A08] group-hover:text-white transition-colors">
                        <Package size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-[#110A08]">{order.orderNumber}</span>
                          <span className={`px-3 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border flex items-center gap-1.5 ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(order.date).toLocaleDateString()} • {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#110A08]">{formatPrice(order.finalTotal)}</p>
                      <p className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold">View Details</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedOrder && (
        <ReceiptModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          allowDownload
        />
      )}
    </div>
  );
}
