import React, { useState, useEffect } from 'react';
import { Product, Order, OrderStatus, DeliveryLocation, Review } from '../types';
import { getProducts, saveProduct, deleteProduct as deleteProductFromDb, formatPrice, getOrders, updateOrderStatus as updateOrderStatusInDb, deleteOrder as deleteOrderFromDb, getDeliveryLocations, saveDeliveryLocations, deleteDeliveryLocation, handleFirestoreError, OperationType } from '../lib/storage';
import { Trash2, Plus, ArrowLeft, Edit2, LogIn, Lock, Package, Image as ImageIcon, Save, X, Settings, Upload, FileText, Box, Clock, Truck, CheckCircle2, XCircle, LogOut, Download, ShoppingBag, Star, MessageSquare, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useStoreSettings } from '../hooks/useStoreSettings';
import ReceiptModal from '../components/ReceiptModal';
import { db, auth, loginWithEmail, logout } from '../firebase';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const { logoUrl, updateLogoUrl, priceFilters, updatePriceFilters, categoryImages, updateCategoryImage, heroSlides, updateHeroSlides, heroContent, updateHeroContent } = useStoreSettings();
  const [tempLogoUrl, setTempLogoUrl] = useState(logoUrl);
  const [tempHeroContent, setTempHeroContent] = useState(heroContent);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newSlideSubtitle, setNewSlideSubtitle] = useState('');
  const [newFilterLabel, setNewFilterLabel] = useState('');
  const [newFilterMin, setNewFilterMin] = useState('');
  const [newFilterMax, setNewFilterMax] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [newLocName, setNewLocName] = useState('');
  const [newLocFee, setNewLocFee] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'add-product' | 'orders' | 'reviews' | 'settings'>('dashboard');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    category: 'face',
    isPopular: false,
    comboItems: []
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        // Check if user is admin
        const adminEmails = ['harrisonreycaspian@gmail.com', 'opulenceslik7@gmail.com', 'devel0perharryke@gmail.com', 'anundaanunda7@gmail.com'];
        if (user.email && adminEmails.includes(user.email)) {
          setIsAdmin(true);
          // Create user doc if it doesn't exist
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
              await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                role: 'admin'
              });
              console.log('Admin user document created for:', user.email);
            }
          } catch (error) {
            console.error('Error ensuring admin user doc:', error);
          }
        } else {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
              setLoginError('You do not have admin privileges.');
            }
          } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
          }
        }
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
      setIsCheckingAuth(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    setTempHeroContent(heroContent);
  }, [heroContent]);

  const handleAddPriceFilter = async () => {
    if (newFilterLabel && newFilterMin !== '') {
      const newFilter = {
        id: Date.now().toString(),
        label: newFilterLabel,
        min: Number(newFilterMin),
        max: newFilterMax !== '' ? Number(newFilterMax) : null
      };
      await updatePriceFilters([...priceFilters, newFilter]);
      setNewFilterLabel('');
      setNewFilterMin('');
      setNewFilterMax('');
    }
  };

  const handleDeletePriceFilter = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this price filter?')) {
      await updatePriceFilters(priceFilters.filter(f => f.id !== id));
    }
  };

  const handleAddHeroSlide = async () => {
    if (newSlideUrl) {
      if (editingSlideId) {
        const updatedSlides = heroSlides.map(s => 
          s.id === editingSlideId 
            ? { ...s, imageUrl: newSlideUrl, title: newSlideTitle, subtitle: newSlideSubtitle } 
            : s
        );
        await updateHeroSlides(updatedSlides);
        setEditingSlideId(null);
      } else {
        const newSlide = {
          id: Date.now().toString(),
          imageUrl: newSlideUrl,
          title: newSlideTitle,
          subtitle: newSlideSubtitle
        };
        await updateHeroSlides([...heroSlides, newSlide]);
      }
      setNewSlideUrl('');
      setNewSlideTitle('');
      setNewSlideSubtitle('');
    }
  };

  const handleEditHeroSlide = (slide: any) => {
    setEditingSlideId(slide.id);
    setNewSlideUrl(slide.imageUrl);
    setNewSlideTitle(slide.title || '');
    setNewSlideSubtitle(slide.subtitle || '');
    // Scroll to the add slide form
    const settingsPanel = document.getElementById('hero-slide-form');
    settingsPanel?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteHeroSlide = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this hero slide?')) {
      await updateHeroSlides(heroSlides.filter(s => s.id !== id));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          callback(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  useEffect(() => {
    let unsubscribeProducts: () => void;
    let unsubscribeOrders: () => void;
    let unsubscribeLocations: () => void;
    let unsubscribeReviews: () => void;

    if (isAdmin) {
      // Listen to real-time updates directly
      // onSnapshot provides initial data as well
      unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'products');
      });
      
      unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'orders');
      });
      
      unsubscribeLocations = onSnapshot(collection(db, 'delivery_locations'), (snapshot) => {
        setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryLocation)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'delivery_locations');
      });
      
      const reviewsQuery = query(collection(db, 'reviews'), orderBy('date', 'desc'));
      unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
        setReviews(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Review)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'reviews');
      });
    }

    return () => {
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeLocations) unsubscribeLocations();
      if (unsubscribeReviews) unsubscribeReviews();
    };
  }, [isAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await loginWithEmail(email, password);
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || 'Failed to sign in. Please check your credentials.');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSaving(true);
    
    try {
      if (editingId) {
        const updatedProduct: Product = {
          id: editingId,
          name: formData.name || '',
          description: formData.description || '',
          price: Number(formData.price) || 0,
          imageUrl: formData.imageUrl || '',
          category: formData.category as any || 'face',
          isPopular: formData.isPopular || false,
          comboItems: formData.category === 'combos' ? formData.comboItems : [],
          createdAt: products.find(p => p.id === editingId)?.createdAt || Date.now()
        };
        await saveProduct(updatedProduct);
        setEditingId(null);
      } else {
        const newProduct: Product = {
          id: Date.now().toString(),
          name: formData.name || '',
          description: formData.description || '',
          price: Number(formData.price) || 0,
          imageUrl: formData.imageUrl || 'https://image2url.com/r2/default/images/1774387277140-b194b186-425a-4c9b-b533-68730254dd3b.jpg',
          category: formData.category as any || 'face',
          isPopular: formData.isPopular || false,
          comboItems: formData.category === 'combos' ? formData.comboItems : [],
          createdAt: Date.now()
        };
        await saveProduct(newProduct);
      }
      resetForm();
    } catch (error: any) {
      console.error("Error saving product:", error);
      if (error.message?.includes('Quota exceeded')) {
        setLoginError('Firestore quota exceeded. Please try again tomorrow.');
      } else if (error.message?.includes('too large')) {
        setLoginError('Image is too large. Please try a smaller image.');
      } else {
        setLoginError('Failed to save product. Please check your permissions and internet connection.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      isPopular: product.isPopular,
      comboItems: product.comboItems || []
    });
    setActiveTab('add-product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteProductFromDb(id);
      if (editingId === id) {
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      category: 'face',
      isPopular: false,
      comboItems: []
    });
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrderStatusInDb(orderId, newStatus);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      await deleteOrderFromDb(orderId);
    }
  };

  const handleAddLocation = async () => {
    if (newLocName && newLocFee !== '') {
      const updated = [...locations, { id: Date.now().toString(), name: newLocName, fee: Number(newLocFee) }];
      await saveDeliveryLocations(updated);
      setNewLocName('');
      setNewLocFee('');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this delivery location?')) {
      await deleteDeliveryLocation(id);
    }
  };

  const handleApproveReview = async (id: string, approved: boolean) => {
    try {
      await updateDoc(doc(db, 'reviews', id), { approved });
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await deleteDoc(doc(db, 'reviews', id));
      } catch (error) {
        console.error('Error deleting review:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment': return <Clock className="text-orange-500" size={16} />;
      case 'paid': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'pending': return <Clock className="text-yellow-500" size={16} />;
      case 'processing': return <Package className="text-blue-500" size={16} />;
      case 'dispatched': return <Truck className="text-purple-500" size={16} />;
      case 'delivered': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'cancelled': return <XCircle className="text-red-500" size={16} />;
      default: return <Clock className="text-gray-500" size={16} />;
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

  const handleExportOrders = () => {
    if (orders.length === 0) {
      alert('No orders to export.');
      return;
    }

    const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'Zone', 'Address', 'Total', 'Status', 'Items'];
    const csvContent = [
      headers.join(','),
      ...orders.map(order => [
        order.orderNumber,
        new Date(order.date).toLocaleDateString(),
        `"${order.customerName}"`,
        order.customerPhone,
        order.deliveryZone,
        `"${order.deliveryAddress || ''}"`,
        order.finalTotal,
        order.status,
        `"${order.items.map(i => `${i.quantity}x ${i.name}`).join('; ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#110A08] mx-auto mb-4"></div>
          <p className="text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <img src={logoUrl} alt="Opulence Slik" className="h-20 w-auto object-contain rounded-full shadow-sm bg-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-center mb-2">Admin Access</h1>
          <p className="text-gray-500 text-center mb-8 text-sm">Sign in with your email and password to manage the store.</p>
          
          {isAuthenticated && !isAdmin ? (
            <div className="text-center space-y-4">
              <p className="text-red-500 text-sm">{loginError}</p>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input 
                  type="email" 
                  placeholder="Email address"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all mb-3"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                />
                <input 
                  type="password" 
                  placeholder="Password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                {loginError && <p className="text-red-500 text-sm mt-2">{loginError}</p>}
              </div>
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#110A08] text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
              >
                <LogIn size={18} />
                Sign In
              </button>
            </form>
          )}
          
          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-[#D4AF37] transition-colors flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/" className="text-gray-400 hover:text-gray-900 transition-colors p-2 -ml-2">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg sm:text-xl font-serif font-bold flex items-center gap-2 sm:gap-3">
              <img src={logoUrl} alt="Opulence Slik" className="h-8 sm:h-10 w-auto object-contain rounded-full bg-white shadow-sm" />
              <span className="hidden xs:inline">Store Manager</span>
              <span className="xs:hidden">Manager</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={handleExportOrders}
              className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export Orders</span>
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8">
        {/* Tabs */}
        <div className="sticky top-16 sm:top-20 z-30 bg-[#FAFAFA] pt-2">
          <div className="flex gap-2 sm:gap-8 mb-8 border-b border-gray-100 overflow-x-auto no-scrollbar pb-px">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-4 font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === 'dashboard' 
                  ? 'text-[#110A08]' 
                  : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              <Box size={16} />
              Dashboard
              {activeTab === 'dashboard' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-4 py-4 font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === 'inventory' 
                  ? 'text-[#110A08]' 
                  : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              <ShoppingBag size={16} />
              Inventory
              {activeTab === 'inventory' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('add-product')}
              className={`flex items-center gap-2 px-4 py-4 font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === 'add-product' 
                  ? 'text-[#110A08]' 
                  : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              <Plus size={16} />
              {editingId ? 'Edit Product' : 'Add Product'}
              {activeTab === 'add-product' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-4 font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === 'orders' 
                  ? 'text-[#110A08]' 
                  : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              <Package size={16} />
              Orders
              {activeTab === 'orders' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center gap-2 px-4 py-4 font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === 'reviews' 
                  ? 'text-[#110A08]' 
                  : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              <Star size={16} />
              Reviews
              {activeTab === 'reviews' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-4 font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === 'settings' 
                  ? 'text-[#110A08]' 
                  : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              <Settings size={16} />
              Settings
              {activeTab === 'settings' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-t-full" />
              )}
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <button 
                onClick={() => setActiveTab('inventory')}
                className="group bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-[#D4AF37] hover:shadow-xl hover:-translate-y-1 transition-all text-left"
              >
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
                  <ShoppingBag size={24} />
                </div>
                <h3 className="text-lg font-serif font-bold mb-2">Inventory</h3>
                <p className="text-xs text-gray-500 font-light leading-relaxed">Manage your products, update prices, and track stock levels.</p>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                  View Products <ArrowLeft size={12} className="rotate-180" />
                </div>
              </button>

              <button 
                onClick={() => setActiveTab('add-product')}
                className="group bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-[#D4AF37] hover:shadow-xl hover:-translate-y-1 transition-all text-left"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
                  <Plus size={24} />
                </div>
                <h3 className="text-lg font-serif font-bold mb-2">Add Product</h3>
                <p className="text-xs text-gray-500 font-light leading-relaxed">Create new product listings with images and detailed descriptions.</p>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                  Create New <ArrowLeft size={12} className="rotate-180" />
                </div>
              </button>

              <button 
                onClick={() => setActiveTab('orders')}
                className="group bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-[#D4AF37] hover:shadow-xl hover:-translate-y-1 transition-all text-left"
              >
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6 group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
                  <Package size={24} />
                </div>
                <h3 className="text-lg font-serif font-bold mb-2">Orders</h3>
                <p className="text-xs text-gray-500 font-light leading-relaxed">Track customer orders, update delivery status, and export data.</p>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                  Manage Orders <ArrowLeft size={12} className="rotate-180" />
                </div>
              </button>

              <button 
                onClick={() => setActiveTab('reviews')}
                className="group bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-[#D4AF37] hover:shadow-xl hover:-translate-y-1 transition-all text-left"
              >
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-6 group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
                  <Star size={24} />
                </div>
                <h3 className="text-lg font-serif font-bold mb-2">Reviews</h3>
                <p className="text-xs text-gray-500 font-light leading-relaxed">Moderate customer feedback and approve product reviews.</p>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                  Moderate <ArrowLeft size={12} className="rotate-180" />
                </div>
              </button>

              <button 
                onClick={() => setActiveTab('settings')}
                className="group bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-[#D4AF37] hover:shadow-xl hover:-translate-y-1 transition-all text-left"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600 mb-6 group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
                  <Settings size={24} />
                </div>
                <h3 className="text-lg font-serif font-bold mb-2">Settings</h3>
                <p className="text-xs text-gray-500 font-light leading-relaxed">Configure store logo, delivery zones, and price range filters.</p>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                  Store Config <ArrowLeft size={12} className="rotate-180" />
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-serif font-bold">Recent Orders</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#D4AF37] transition-colors">View All</button>
                </div>
                <div className="space-y-4">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{order.customerName}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{order.orderNumber} • {new Date(order.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="font-bold text-sm">{formatPrice(order.finalTotal)}</p>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm italic">No orders yet</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-lg font-serif font-bold mb-6">Quick Stats</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Total Products</p>
                    <p className="text-3xl font-serif font-bold text-[#110A08]">{products.length}</p>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Total Orders</p>
                    <p className="text-3xl font-serif font-bold text-[#110A08]">{orders.length}</p>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Pending Reviews</p>
                    <p className="text-3xl font-serif font-bold text-[#110A08]">{reviews.filter(r => !r.approved).length}</p>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Best Sellers</p>
                    <p className="text-3xl font-serif font-bold text-[#110A08]">{products.filter(p => p.isPopular).length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="bg-white p-5 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-serif font-bold">Inventory ({products.length})</h2>
              <button 
                onClick={() => setActiveTab('add-product')}
                className="flex items-center gap-2 px-4 py-2 bg-[#110A08] text-white rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-gray-800 transition-all"
              >
                <Plus size={14} /> Add Product
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              {products.length === 0 ? (
                <div className="sm:col-span-2 xl:col-span-3 text-center py-16 border-2 border-dashed border-gray-100 rounded-[2rem]">
                  <Package className="mx-auto h-12 w-12 text-gray-200 mb-4" />
                  <p className="text-gray-500 font-medium">No products found</p>
                  <p className="text-xs text-gray-400 mt-1">Add your first product to get started.</p>
                </div>
              ) : (
                products.map(product => (
                  <div 
                    key={product.id} 
                    className={`flex flex-col p-5 border rounded-[2rem] transition-all duration-500 group ${
                      editingId === product.id 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 ring-1 ring-[#D4AF37]' 
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-xl hover:-translate-y-1'
                    }`}
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-4 relative">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      {product.isPopular && (
                        <div className="absolute top-3 left-3 px-3 py-1 text-[8px] uppercase tracking-widest bg-[#D4AF37] text-[#110A08] rounded-full font-bold shadow-lg">
                          Best Seller
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-serif font-bold text-gray-900 leading-tight">{product.name}</h3>
                        <span className="font-bold text-[#D4AF37] text-sm whitespace-nowrap">{formatPrice(product.price)}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-4 font-light leading-relaxed">{product.description}</p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{product.category}</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleEdit(product)}
                            className={`p-2.5 rounded-xl transition-all ${
                              editingId === product.id 
                                ? 'bg-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20' 
                                : 'text-gray-400 hover:bg-[#110A08] hover:text-white'
                            }`}
                            title="Edit Product"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="p-2.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                            title="Delete Product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'add-product' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                    {editingId ? <Edit2 size={24} /> : <Plus size={24} />}
                  </div>
                  <h2 className="text-2xl font-serif font-bold">
                    {editingId ? 'Edit Product' : 'Add New Product'}
                  </h2>
                </div>
                {editingId && (
                  <button 
                    onClick={resetForm}
                    className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-gray-900 flex items-center gap-1"
                  >
                    <X size={14} /> Cancel
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Product Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Glow Serum"
                    className="w-full px-5 py-4 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all bg-gray-50/50"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Description</label>
                  <textarea 
                    required
                    placeholder="Brief description of the product..."
                    className="w-full px-5 py-4 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all resize-none bg-gray-50/50"
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Price (KES)</label>
                    <input 
                      required
                      type="number" 
                      min="0"
                      placeholder="0"
                      className="w-full px-5 py-4 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all bg-gray-50/50"
                      value={formData.price || ''}
                      onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Category</label>
                    <select 
                      className="w-full px-5 py-4 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all bg-gray-50/50 cursor-pointer"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as any})}
                    >
                      <option value="face">Face Care</option>
                      <option value="body">Body Care</option>
                      <option value="oils">Oils</option>
                      <option value="combos">Combos</option>
                      <option value="wigs">Wigs</option>
                    </select>
                  </div>
                </div>

                {formData.category === 'combos' && (
                  <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-amber-600 mb-4">Select Products for this Combo</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {products.filter(p => p.category !== 'combos').map(product => (
                        <div 
                          key={product.id}
                          onClick={() => {
                            const currentItems = formData.comboItems || [];
                            const newItems = currentItems.includes(product.id)
                              ? currentItems.filter(id => id !== product.id)
                              : [...currentItems, product.id];
                            setFormData({...formData, comboItems: newItems});
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            (formData.comboItems || []).includes(product.id)
                              ? 'bg-white border-[#D4AF37] shadow-sm'
                              : 'bg-white/50 border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{product.name}</p>
                            <p className="text-[10px] text-gray-500">{formatPrice(product.price)}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            (formData.comboItems || []).includes(product.id)
                              ? 'bg-[#D4AF37] border-[#D4AF37] text-white'
                              : 'border-gray-200'
                          }`}>
                            {(formData.comboItems || []).includes(product.id) && <CheckCircle2 size={12} />}
                          </div>
                        </div>
                      ))}
                    </div>
                    {products.filter(p => p.category !== 'combos').length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-4">No products available to add to combo</p>
                    )}
                    <p className="mt-4 text-[10px] text-amber-600/70 italic">
                      Selected: {(formData.comboItems || []).length} products
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                  <input
                    type="checkbox"
                    id="isPopular"
                    checked={formData.isPopular || false}
                    onChange={e => setFormData({...formData, isPopular: e.target.checked})}
                    className="w-5 h-5 text-[#D4AF37] border-gray-200 rounded-lg focus:ring-[#D4AF37] cursor-pointer"
                  />
                  <label htmlFor="isPopular" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                    Mark as Best Seller
                  </label>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Product Image</label>
                  <div className="flex gap-4">
                    <label 
                      htmlFor="product-image-upload"
                      className="flex-1 cursor-pointer px-6 py-4 bg-white border border-dashed border-gray-200 text-gray-500 rounded-2xl hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all flex items-center justify-center gap-3" 
                      title="Upload Image"
                    >
                      <Upload size={20} />
                      <span className="text-sm font-bold uppercase tracking-widest">Choose File</span>
                    </label>
                    <input 
                      id="product-image-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageUpload(e, (url) => setFormData({...formData, imageUrl: url}))}
                    />
                  </div>
                  {formData.imageUrl && (
                    <div className="mt-4 rounded-3xl overflow-hidden border border-gray-100 aspect-video bg-gray-50 flex items-center justify-center relative group">
                      <img 
                        src={formData.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-[10px] uppercase tracking-widest font-bold">Image Preview</p>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={isSaving}
                  className={`w-full flex items-center justify-center gap-3 px-8 py-5 bg-[#110A08] text-white rounded-2xl hover:bg-gray-800 transition-all font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-black/10 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : editingId ? (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Add Product
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="bg-white p-5 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-serif font-bold">Review Management</h2>
              <div className="flex gap-4 text-[10px] uppercase tracking-widest font-bold">
                <span className="text-gray-400">{reviews.length} Total</span>
                <span className="text-orange-500">{reviews.filter(r => !r.approved).length} Pending</span>
              </div>
            </div>
            
            {reviews.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-[2rem]">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map(review => {
                  const product = products.find(p => p.id === review.productId);
                  return (
                    <div key={review.id} className={`border rounded-[2rem] p-6 sm:p-8 transition-all duration-500 ${review.approved ? 'border-gray-100 bg-white' : 'border-orange-100 bg-orange-50/30'}`}>
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex gap-6">
                          <div className="hidden sm:block w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                            {product ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300"><Box size={24} /></div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-[#110A08]">{review.customerName}</h4>
                              <div className="flex gap-0.5 text-[#D4AF37]">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />
                                ))}
                              </div>
                            </div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-4">
                              Review for: <span className="text-[#110A08]">{product?.name || 'Unknown Product'}</span> • {new Date(review.date).toLocaleDateString()}
                            </p>
                            <p className="text-gray-600 font-light leading-relaxed italic mb-6">
                              "{review.comment}"
                            </p>
                            <div className="flex items-center gap-3">
                              {!review.approved ? (
                                <button
                                  onClick={() => handleApproveReview(review.id, true)}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-green-700 transition-all"
                                >
                                  <CheckCircle2 size={14} /> Approve
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApproveReview(review.id, false)}
                                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-gray-200 transition-all"
                                >
                                  <XCircle size={14} /> Unapprove
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteReview(review.id)}
                                className="flex items-center gap-2 px-4 py-2 border border-red-100 text-red-500 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-red-50 transition-all"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                        {!review.approved && (
                          <div className="px-3 py-1 bg-orange-100 text-orange-600 text-[8px] uppercase tracking-widest font-bold rounded-full self-start">
                            Pending Approval
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Store Settings */}
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <Settings size={24} />
                </div>
                <h2 className="text-xl font-serif font-bold">Store Settings</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">Store Logo</label>
                  <div className="flex gap-3">
                    <label 
                      htmlFor="logo-upload"
                      className="flex-1 cursor-pointer px-4 py-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 border border-gray-100" 
                    >
                      <Upload size={18} />
                      <span className="text-xs font-bold uppercase tracking-widest">Upload</span>
                    </label>
                    <input 
                      id="logo-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageUpload(e, setTempLogoUrl)}
                    />
                    <button 
                      onClick={() => updateLogoUrl(tempLogoUrl)}
                      className="px-6 py-3 bg-[#110A08] text-white rounded-xl hover:bg-gray-800 transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                      Save
                    </button>
                  </div>
                </div>
                {logoUrl && (
                  <div className="rounded-2xl overflow-hidden border border-gray-100 h-24 bg-gray-50 flex items-center justify-center p-4">
                    <img 
                      src={logoUrl} 
                      alt="Logo Preview" 
                      className="h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Locations Settings */}
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <Truck size={24} />
                </div>
                <h2 className="text-xl font-serif font-bold">Delivery Locations</h2>
              </div>
              
              <div className="space-y-4">
                <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-3 pr-1">
                  {locations.map(loc => (
                    <div key={loc.id} className="flex justify-between items-center p-4 border border-gray-50 rounded-2xl bg-gray-50/50">
                      <div>
                        <p className="font-bold text-sm text-[#110A08]">{loc.name}</p>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37] mt-0.5">{formatPrice(loc.fee)}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteLocation(loc.id)} 
                        className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="pt-6 border-t border-gray-100">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">Add New Location</p>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Name (e.g. Karen)" 
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                      value={newLocName} 
                      onChange={e => setNewLocName(e.target.value)} 
                    />
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Fee" 
                        className="flex-1 px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                        value={newLocFee} 
                        onChange={e => setNewLocFee(e.target.value)} 
                      />
                      <button 
                        onClick={handleAddLocation} 
                        className="px-4 py-3 bg-[#110A08] text-white rounded-xl hover:bg-gray-800 transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Filters Settings */}
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <Settings size={24} />
                </div>
                <h2 className="text-xl font-serif font-bold">Price Filters</h2>
              </div>
              
              <div className="space-y-4">
                <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-3 pr-1">
                  {priceFilters.map(filter => (
                    <div key={filter.id} className="flex justify-between items-center p-4 border border-gray-50 rounded-2xl bg-gray-50/50">
                      <div>
                        <p className="font-bold text-sm text-[#110A08]">{filter.label}</p>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37] mt-0.5">
                          {formatPrice(filter.min)} - {filter.max ? formatPrice(filter.max) : '∞'}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleDeletePriceFilter(filter.id)} 
                        className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="pt-6 border-t border-gray-100">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">Add New Filter</p>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Label (e.g. Under 5k)" 
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                      value={newFilterLabel} 
                      onChange={e => setNewFilterLabel(e.target.value)} 
                    />
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Min" 
                        className="flex-1 px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                        value={newFilterMin} 
                        onChange={e => setNewFilterMin(e.target.value)} 
                      />
                      <input 
                        type="number" 
                        placeholder="Max" 
                        className="flex-1 px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                        value={newFilterMax} 
                        onChange={e => setNewFilterMax(e.target.value)} 
                      />
                      <button 
                        onClick={handleAddPriceFilter} 
                        className="px-4 py-3 bg-[#110A08] text-white rounded-xl hover:bg-gray-800 transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Images Settings */}
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <ImageIcon size={24} />
                </div>
                <h2 className="text-xl font-serif font-bold">Category Images</h2>
              </div>
              
              <div className="space-y-6">
                {categoryImages.map(cat => (
                  <div key={cat.id} className="p-4 border border-gray-50 rounded-2xl bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-[#110A08]">{cat.label}</p>
                    </div>
                    <div className="flex gap-2">
                      <label 
                        htmlFor={`category-upload-${cat.id}`}
                        className="flex-1 cursor-pointer px-4 py-2 bg-white border border-dashed border-gray-200 text-gray-500 rounded-xl hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                      >
                        <Upload size={14} />
                        Choose File
                      </label>
                      <input 
                        id={`category-upload-${cat.id}`}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleImageUpload(e, (url) => updateCategoryImage(cat.id, url))}
                      />
                    </div>
                    <div className="h-20 rounded-xl overflow-hidden border border-gray-100">
                      <img 
                        src={cat.url} 
                        alt={cat.label} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Main Content Settings */}
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <FileText size={24} />
                </div>
                <h2 className="text-xl font-serif font-bold">Hero Main Content</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Title Line 1</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                    value={tempHeroContent.title1} 
                    onChange={e => setTempHeroContent({...tempHeroContent, title1: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Title Line 2</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                    value={tempHeroContent.title2} 
                    onChange={e => setTempHeroContent({...tempHeroContent, title2: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Description</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50 resize-none" 
                    value={tempHeroContent.description} 
                    onChange={e => setTempHeroContent({...tempHeroContent, description: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Top Subtitle</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                    value={tempHeroContent.topSubtitle} 
                    onChange={e => setTempHeroContent({...tempHeroContent, topSubtitle: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Primary CTA Text</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                      value={tempHeroContent.ctaText} 
                      onChange={e => setTempHeroContent({...tempHeroContent, ctaText: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Secondary CTA Text</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                      value={tempHeroContent.secondaryCtaText} 
                      onChange={e => setTempHeroContent({...tempHeroContent, secondaryCtaText: e.target.value})} 
                    />
                  </div>
                </div>
                <button 
                  onClick={() => updateHeroContent(tempHeroContent)}
                  className="w-full py-3 bg-[#110A08] text-white rounded-xl hover:bg-gray-800 transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Save Hero Content
                </button>
              </div>
            </div>

            {/* Hero Slides Settings */}
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <Sparkles size={24} />
                </div>
                <h2 className="text-xl font-serif font-bold">Hero Slides</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  {heroSlides.map(slide => (
                    <div key={slide.id} className="p-4 border border-gray-50 rounded-2xl bg-gray-50/50 space-y-3 relative group">
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditHeroSlide(slide)}
                          className="p-2 bg-white text-gray-400 hover:text-[#D4AF37] rounded-full shadow-sm"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteHeroSlide(slide.id)}
                          className="p-2 bg-white text-gray-400 hover:text-red-500 rounded-full shadow-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="h-32 rounded-xl overflow-hidden border border-gray-100">
                        <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#110A08]">{slide.title || 'Untitled Slide'}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{slide.subtitle || 'No subtitle'}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div id="hero-slide-form" className="pt-6 border-t border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                      {editingSlideId ? 'Edit Slide' : 'Add New Slide'}
                    </p>
                    {editingSlideId && (
                      <button 
                        onClick={() => {
                          setEditingSlideId(null);
                          setNewSlideUrl('');
                          setNewSlideTitle('');
                          setNewSlideSubtitle('');
                        }}
                        className="text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label 
                      htmlFor="hero-slide-upload"
                      className="w-full cursor-pointer px-4 py-3 bg-gray-50 border border-dashed border-gray-200 text-gray-500 rounded-xl hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest"
                    >
                      <Upload size={18} />
                      {newSlideUrl ? 'Change Image' : 'Upload Slide Image'}
                    </label>
                    <input 
                      id="hero-slide-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageUpload(e, setNewSlideUrl)}
                    />
                    {newSlideUrl && (
                      <div className="h-20 rounded-xl overflow-hidden border border-gray-100">
                        <img src={newSlideUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <input 
                      type="text" 
                      placeholder="Title (e.g. Pure Opulence)" 
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                      value={newSlideTitle} 
                      onChange={e => setNewSlideTitle(e.target.value)} 
                    />
                    <input 
                      type="text" 
                      placeholder="Subtitle (e.g. Natural Glow)" 
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none bg-gray-50/50" 
                      value={newSlideSubtitle} 
                      onChange={e => setNewSlideSubtitle(e.target.value)} 
                    />
                    <button 
                      onClick={handleAddHeroSlide}
                      className="w-full py-3 bg-[#110A08] text-white rounded-xl hover:bg-gray-800 transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {editingSlideId ? <Save size={18} /> : <Plus size={18} />}
                      {editingSlideId ? 'Save Slide' : 'Add Slide'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white p-5 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-serif font-bold">Order Management</h2>
              <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                {orders.length} Total Orders
              </div>
            </div>
            
            {orders.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-[2rem]">
                <Package className="mx-auto h-12 w-12 text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map(order => (
                  <div key={order.id} className="border border-gray-100 rounded-[2rem] p-5 sm:p-8 hover:shadow-xl transition-all duration-500 group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[#110A08]">
                          <FileText size={20} className="sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            className="font-serif font-bold text-lg sm:text-xl hover:text-[#D4AF37] transition-colors text-left block"
                          >
                            {order.orderNumber}
                          </button>
                          <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-gray-400 mt-0.5 sm:mt-1">
                            {new Date(order.date).toLocaleDateString()} at {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[9px] sm:text-[10px] uppercase tracking-widest font-bold border outline-none cursor-pointer transition-all ${getStatusColor(order.status)}`}
                        >
                          <option value="pending_payment">Pending Payment</option>
                          <option value="paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button 
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                            <CheckCircle2 size={14} />
                          </div>
                          <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#110A08]">Customer Details</h4>
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400 font-light">Name</span>
                            <span className="font-medium">{order.customerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 font-light">Phone</span>
                            <span className="font-medium">{order.customerPhone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 font-light">Zone</span>
                            <span className="font-medium">{order.deliveryZone === 'cbd' ? 'Nairobi CBD' : 'Outside CBD'}</span>
                          </div>
                          {order.deliveryAddress && (
                            <div className="flex flex-col gap-1">
                              <span className="text-gray-400 font-light">Address</span>
                              <span className="font-medium">{order.deliveryAddress}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                            <ShoppingBag size={14} />
                          </div>
                          <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#110A08]">Order Summary</h4>
                        </div>
                        <div className="space-y-3 mb-6 max-h-40 overflow-y-auto no-scrollbar">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="font-light"><span className="font-bold text-[#D4AF37]">{item.quantity}x</span> {item.name}</span>
                              <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 pt-4 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400 font-light">Subtotal</span>
                            <span className="font-medium">{formatPrice(order.total)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400 font-light">Delivery</span>
                            <span className="font-medium">{order.deliveryFee === 0 ? 'Free' : formatPrice(order.deliveryFee)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-serif font-bold text-[#110A08] pt-2">
                            <span>Total</span>
                            <span>{formatPrice(order.finalTotal)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedOrder && (
        <ReceiptModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </div>
  );
}
