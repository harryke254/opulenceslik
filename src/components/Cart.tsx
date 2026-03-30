import React, { useState, useRef, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { formatPrice, saveOrder, getDeliveryLocations, handleFirestoreError, OperationType } from '../lib/storage';
import { DeliveryLocation, Order } from '../types';
import { X, Minus, Plus, ShoppingBag, ArrowRight, CheckCircle2, ArrowLeft, MapPin, CreditCard, Truck } from 'lucide-react';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const KENYAN_AREAS = [
  "Nairobi - CBD", "Nairobi - Westlands", "Nairobi - Kilimani", "Nairobi - Karen", "Nairobi - Langata",
  "Nairobi - South C", "Nairobi - South B", "Nairobi - Embakasi", "Nairobi - Roysambu", "Nairobi - Kasarani",
  "Nairobi - Lavington", "Nairobi - Runda", "Nairobi - Muthaiga", "Nairobi - Pangani", "Nairobi - Ngara",
  "Mombasa - Island", "Mombasa - Nyali", "Mombasa - Bamburi", "Mombasa - Likoni", "Mombasa - Changamwe",
  "Kisumu - CBD", "Kisumu - Milimani", "Kisumu - Kondele", "Kisumu - Manyatta",
  "Nakuru - CBD", "Nakuru - Lanet", "Nakuru - Milimani", "Nakuru - Naka",
  "Eldoret - CBD", "Eldoret - Kapsoya", "Eldoret - Langas",
  "Thika", "Kiambu", "Ruiru", "Juja", "Athi River", "Kitengela", "Ngong", "Rongai", "Syokimau",
  "Machakos", "Naivasha", "Nanyuki", "Malindi", "Diani", "Watamu", "Kericho", "Kakamega", "Garissa"
];

export default function Cart() {
  const { items, removeFromCart, updateQuantity, total, isCartOpen, setIsCartOpen, clearCart } = useCart();
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'delivery' | ''>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [view, setView] = useState<'cart' | 'checkout'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
  const { logoUrl } = useStoreSettings();
  const receiptRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        addressInputRef.current &&
        !addressInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddressChange = (value: string) => {
    setDeliveryAddress(value);
    if (value.length > 1) {
      const filtered = KENYAN_AREAS.filter(area => 
        area.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setDeliveryAddress(suggestion);
    setShowSuggestions(false);
  };

  const deliveryFee = 0;
  const deliveryZoneName = "Standard Delivery";
  const finalTotal = total + deliveryFee;

  const handleProceedToCheckout = () => {
    setView('checkout');
  };

  const handleConfirmOrder = async () => {
    if (!customerName || !customerPhone || !customerEmail) {
      alert('Please fill in all delivery details (Name, Email, and Phone)');
      return;
    }
    if (!deliveryAddress) {
      alert('Please provide a detailed delivery address');
      return;
    }
    if (!paymentMethod) {
      setPaymentMethod('delivery');
    }

    const processOrderSuccess = async (orderNum: string, status: 'pending' | 'paid' = 'pending') => {
      const newOrder: Order = {
        id: orderNum,
        orderNumber: orderNum,
        date: new Date().toISOString(),
        items: [...items],
        total,
        deliveryFee,
        finalTotal,
        customerName,
        customerPhone,
        customerEmail,
        deliveryZone: deliveryZoneName,
        deliveryAddress,
        paymentMethod: 'delivery',
        status: status
      };
      await saveOrder(newOrder);
      
      // Send email receipt
      try {
        const emailResponse = await fetch('/api/send-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: newOrder, customerEmail })
        });
        
        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error('Email receipt failed:', errorData);
          // We don't alert the user here to avoid interrupting the success flow, 
          // but we log it for debugging.
        } else {
          console.log('Email receipt sent successfully');
        }
      } catch (error) {
        console.error('Failed to send email receipt (network error):', error);
      }

      setConfirmedOrder(newOrder);
      setOrderNumber(orderNum);
      setShowReceipt(true);
      clearCart();
    };

    processOrderSuccess(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleWhatsAppSend = () => {
    if (!confirmedOrder) return;
    
    const phoneNumber = "254797008487";
    const orderDetails = confirmedOrder.items.map((item: any) => 
      `${item.quantity}x ${item.name} (${formatPrice(item.price * item.quantity)})`
    ).join('%0A');
    
    const message = `*Order Number:* ${confirmedOrder.orderNumber}%0A*Customer:* ${confirmedOrder.customerName} (${confirmedOrder.customerPhone})%0A*Delivery:* ${confirmedOrder.deliveryZone}${confirmedOrder.deliveryAddress ? ` - ${confirmedOrder.deliveryAddress}` : ''}%0A*Payment Method:* WhatsApp / Cash on Delivery%0A%0A${orderDetails}%0A%0A*Subtotal:* ${formatPrice(confirmedOrder.total)}%0A*Delivery Fee:* ${confirmedOrder.deliveryFee === 0 ? 'Free' : formatPrice(confirmedOrder.deliveryFee)}%0A*Total:* ${formatPrice(confirmedOrder.finalTotal)}`;
    
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    setIsCartOpen(false);
    setShowReceipt(false);
    setView('cart');
    setPaymentMethod('');
    setCustomerName('');
    setCustomerPhone('');
    setConfirmedOrder(null);
  };

  if (!isCartOpen && !showReceipt) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => {
          setIsCartOpen(false);
          setShowReceipt(false);
          setTimeout(() => setView('cart'), 300);
        }}
      />

      {/* Receipt Modal */}
      {showReceipt && confirmedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
          <div className="bg-[#FDFBF7] rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <div className="bg-[#FDFBF7]">
                <div className="bg-[#110A08] text-white p-12 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl"></div>
                  <button 
                    onClick={() => {
                      setShowReceipt(false);
                      setConfirmedOrder(null);
                    }}
                    className="absolute right-8 top-8 text-white/50 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <div className="w-20 h-20 bg-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <CheckCircle2 size={40} className="text-[#110A08]" />
                  </div>
                  <h2 className="text-4xl font-serif italic mb-2">Order Confirmed</h2>
                  <p className="text-[#D4AF37] text-[10px] uppercase tracking-[0.3em] font-bold">Thank you for choosing Opulence Slik</p>
                  <p className="text-white/60 text-[9px] mt-4 uppercase tracking-widest">A receipt has been sent to your email</p>
                </div>

                <div className="p-10 space-y-10">
                  <div className="grid grid-cols-2 gap-8 text-[10px] uppercase tracking-[0.2em] font-bold">
                    <div className="bg-white p-6 rounded-3xl border border-[#110A08]/5">
                      <p className="text-gray-400 mb-2">Order Number</p>
                      <p className="text-[#110A08] text-sm">{confirmedOrder.orderNumber}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-[#110A08]/5">
                      <p className="text-gray-400 mb-2">Date</p>
                      <p className="text-[#110A08] text-sm">{new Date(confirmedOrder.date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-[#110A08]/5">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-4">Delivery Details</p>
                    <div className="space-y-2">
                      <p className="font-serif text-xl text-[#110A08]">{confirmedOrder.customerName}</p>
                      <p className="text-sm text-gray-500 font-light">{confirmedOrder.customerPhone}</p>
                      <p className="text-sm text-gray-500 font-light flex items-center gap-2 pt-2">
                        <MapPin size={14} className="text-[#D4AF37]" />
                        {confirmedOrder.deliveryZone} {confirmedOrder.deliveryAddress ? `- ${confirmedOrder.deliveryAddress}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#110A08] border-b border-[#110A08]/5 pb-4">Order Summary</h3>
                    <div className="space-y-4">
                      {confirmedOrder.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm items-center">
                          <div className="flex gap-4 items-center">
                            <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-[10px] font-bold text-[#110A08]">
                              {item.quantity}
                            </span>
                            <span className="font-serif text-[#110A08]">{item.name}</span>
                          </div>
                          <span className="text-[#110A08] font-bold">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-6 border-t border-[#110A08]/5 space-y-4">
                      <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">
                        <span>Subtotal</span>
                        <span className="text-[#110A08]">{formatPrice(confirmedOrder.total)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">
                        <span>Delivery Fee</span>
                        <span className="text-[#110A08]">{confirmedOrder.deliveryFee === 0 ? 'Complimentary' : formatPrice(confirmedOrder.deliveryFee)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#110A08]">Total Amount</span>
                        <span className="text-3xl font-serif font-bold text-[#D4AF37]">{formatPrice(confirmedOrder.finalTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-white border-t border-[#110A08]/5">
              <button 
                onClick={handleWhatsAppSend}
                className="w-full bg-[#25D366] text-white py-5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-[#20bd5a] transition-all duration-500 flex items-center justify-center gap-3 shadow-xl shadow-green-100"
              >
                Confirm & Send via WhatsApp
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-[#FDFBF7] shadow-[0_0_80px_rgba(0,0,0,0.3)] z-50 flex flex-col transform transition-transform duration-500 ease-in-out ${showReceipt ? 'translate-x-full' : 'translate-x-0'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-[#110A08]/5 bg-[#FDFBF7] z-10">
          {view === 'checkout' ? (
            <button 
              onClick={() => setView('cart')} 
              className="flex items-center gap-3 text-[#110A08] hover:text-[#D4AF37] transition-all duration-300 text-[10px] uppercase tracking-[0.2em] font-bold"
            >
              <ArrowLeft size={16} />
              Back to Bag
            </button>
          ) : (
            <h2 className="text-3xl font-serif italic flex items-center gap-3 text-[#110A08]">
              <ShoppingBag className="text-[#D4AF37]" size={24} />
              Your Bag
            </h2>
          )}
          <button 
            onClick={() => {
              setIsCartOpen(false);
              setTimeout(() => setView('cart'), 300);
            }}
            className="p-3 hover:bg-[#110A08] hover:text-white rounded-full transition-all duration-500 text-[#110A08]"
          >
            <X size={20} />
          </button>
        </div>

        {view === 'cart' ? (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-6">
                  <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center">
                    <ShoppingBag size={40} className="opacity-20" />
                  </div>
                  <p className="text-xl font-serif italic">Your bag is empty</p>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#D4AF37] hover:text-[#110A08] transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-6 group">
                    <div className="w-28 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-white shadow-sm">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-serif text-lg text-[#110A08] leading-tight mb-1">{item.name}</h3>
                          <p className="text-[9px] text-[#D4AF37] uppercase tracking-[0.2em] font-bold">{item.category}</p>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-300 hover:text-[#110A08] transition-colors p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border border-[#110A08]/10 rounded-xl bg-white overflow-hidden">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 text-[#110A08] hover:bg-[#110A08] hover:text-white transition-all duration-300"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-10 text-center text-[11px] font-bold">
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-2 text-[#110A08] hover:bg-[#110A08] hover:text-white transition-all duration-300"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="font-serif font-bold text-[#110A08]">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-[#110A08]/5 p-8 bg-[#FDFBF7]">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Total Amount</span>
                  <span className="text-3xl font-serif font-bold text-[#110A08]">{formatPrice(total)}</span>
                </div>
                <p className="text-[9px] text-gray-400 mb-8 text-center uppercase tracking-[0.2em] font-bold">
                  Shipping and taxes calculated at checkout.
                </p>
                <button 
                  onClick={handleProceedToCheckout}
                  className="w-full bg-[#110A08] text-white py-5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-[#D4AF37] transition-all duration-500 flex items-center justify-center gap-3 group shadow-xl hover:shadow-2xl"
                >
                  Proceed to Checkout
                  <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform duration-500" />
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Checkout Flow */}
            <div className="flex-1 overflow-y-auto bg-[#FDFBF7] p-8 space-y-8 custom-scrollbar">
              
              {/* Delivery Details Card */}
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full bg-[#110A08] text-white flex items-center justify-center font-serif italic text-lg">1</div>
                  <h3 className="text-xl font-serif italic text-[#110A08]">Delivery Details</h3>
                </div>

                <div className="space-y-6">
                  <div className="relative group">
                    <label className="absolute -top-2 left-4 bg-[#FDFBF7] px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] z-10 transition-all group-focus-within:text-[#110A08]">Full Name</label>
                    <input 
                      placeholder="e.g. Jane Doe" 
                      value={customerName} 
                      onChange={e => setCustomerName(e.target.value)} 
                      className="w-full bg-transparent border border-[#110A08]/10 rounded-2xl px-6 py-4 text-sm focus:border-[#110A08] outline-none transition-all font-light" 
                    />
                  </div>
                  <div className="relative group">
                    <label className="absolute -top-2 left-4 bg-[#FDFBF7] px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] z-10 transition-all group-focus-within:text-[#110A08]">Email Address</label>
                    <input 
                      type="email"
                      placeholder="e.g. jane@example.com" 
                      value={customerEmail} 
                      onChange={e => setCustomerEmail(e.target.value)} 
                      className="w-full bg-transparent border border-[#110A08]/10 rounded-2xl px-6 py-4 text-sm focus:border-[#110A08] outline-none transition-all font-light" 
                    />
                  </div>
                  <div className="relative group">
                    <label className="absolute -top-2 left-4 bg-[#FDFBF7] px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] z-10 transition-all group-focus-within:text-[#110A08]">Phone Number</label>
                    <input 
                      placeholder="e.g. 0712 345 678" 
                      value={customerPhone} 
                      onChange={e => setCustomerPhone(e.target.value)} 
                      className="w-full bg-transparent border border-[#110A08]/10 rounded-2xl px-6 py-4 text-sm focus:border-[#110A08] outline-none transition-all font-light" 
                    />
                  </div>
                  
                  <div className="relative group">
                    <label className="absolute -top-2 left-4 bg-[#FDFBF7] px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] z-10 transition-all group-focus-within:text-[#110A08]">Delivery Address</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
                      <input 
                        ref={addressInputRef}
                        placeholder="Type your area, building or street..." 
                        value={deliveryAddress} 
                        onChange={e => handleAddressChange(e.target.value)} 
                        onFocus={() => deliveryAddress.length > 1 && setShowSuggestions(true)}
                        className="w-full bg-transparent border border-[#110A08]/10 rounded-2xl pl-14 pr-12 py-4 text-sm focus:border-[#110A08] outline-none transition-all font-light" 
                      />
                      {deliveryAddress && (
                        <button 
                          onClick={() => { setDeliveryAddress(''); setSuggestions([]); setShowSuggestions(false); }}
                          className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#110A08]"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                      <div 
                        ref={suggestionsRef}
                        className="absolute z-[70] left-0 right-0 mt-2 bg-white border border-[#110A08]/5 rounded-2xl shadow-2xl overflow-hidden"
                      >
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => selectSuggestion(suggestion)}
                            className="w-full text-left px-6 py-4 text-sm hover:bg-[#FDFBF7] hover:text-[#D4AF37] transition-all border-b border-[#110A08]/5 last:border-0 font-light"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Method Card */}
              <div className="space-y-6 pt-8 border-t border-[#110A08]/5">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full bg-[#110A08] text-white flex items-center justify-center font-serif italic text-lg">2</div>
                  <h3 className="text-xl font-serif italic text-[#110A08]">Payment Method</h3>
                </div>
                
                <div className="p-8 border border-[#110A08] bg-[#110A08] rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl"></div>
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="mt-1 text-[#D4AF37]">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <div className="font-serif text-xl mb-2 italic">WhatsApp / Cash on Delivery</div>
                      <div className="text-[11px] text-white/60 leading-relaxed uppercase tracking-widest font-bold">Place your order and we'll contact you on WhatsApp to finalize payment and delivery.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary Card */}
              <div className="space-y-6 pt-8 border-t border-[#110A08]/5">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full bg-[#110A08] text-white flex items-center justify-center font-serif italic text-lg">3</div>
                  <h3 className="text-xl font-serif italic text-[#110A08]">Order Summary</h3>
                </div>
                
                <div className="bg-white p-8 rounded-[2.5rem] border border-[#110A08]/5 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Items Total ({items.length})</span>
                    <span className="font-serif font-bold text-[#110A08]">{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Delivery Fee</span>
                    <span className="font-serif font-bold text-[#110A08]">
                      Free
                    </span>
                  </div>
                  <div className="pt-6 border-t border-[#110A08]/5 flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#110A08]">Final Total</span>
                    <span className="text-3xl font-serif font-bold text-[#D4AF37]">{formatPrice(finalTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#110A08]/5 p-8 bg-[#FDFBF7]">
              <button 
                onClick={handleConfirmOrder}
                disabled={isProcessingPayment}
                className="w-full bg-[#110A08] text-white py-5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-[#D4AF37] transition-all duration-500 flex items-center justify-center gap-3 group disabled:opacity-30 disabled:cursor-not-allowed shadow-xl"
              >
                Place Order via WhatsApp
                <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform duration-500" />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
