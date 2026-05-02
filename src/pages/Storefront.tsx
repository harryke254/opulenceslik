import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Star, CheckCircle2, MessageCircle, Instagram, ArrowRight, Menu, X, Search, ArrowUp, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, formatPrice, handleFirestoreError, OperationType } from '../lib/storage';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import Cart from '../components/Cart';
import AIAssistant from '../components/AIAssistant';
import ProductQuickView from '../components/ProductQuickView';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

const COLORS = {
  dark: '#110A08',
  light: '#FDFBF7',
  gold: '#D4AF37',
  goldLight: '#F3E5AB',
  textDark: '#2A1B18',
  textLight: '#FDFBF7',
};

export default function Storefront() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { items, setIsCartOpen, addToCart } = useCart();
  const { logoUrl, categoryImages, heroSlides, heroContent } = useStoreSettings();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [realReviews, setRealReviews] = useState<any[]>([]);

  useEffect(() => {
    // Fetch approved reviews for the homepage
    const q = query(
      collection(db, 'reviews'),
      where('approved', '==', true),
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRealReviews(reviewsData.slice(0, 6)); // Show latest 6 reviews
    }, (error) => {
      console.error("Error fetching reviews:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let unsubscribe: () => void;
    
    // Listen to real-time updates directly
    // onSnapshot provides initial data as well
    unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const shopProducts = products.filter(p => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = (p.name || '').toLowerCase().includes(query);
      const matchesDesc = (p.description || '').toLowerCase().includes(query);
      if (!matchesName && !matchesDesc) return false;
    }

    return true;
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'face', name: 'Face' },
    { id: 'body', name: 'Body' },
    { id: 'oils', name: 'Oils' },
    { id: 'combos', name: 'Combos' },
    { id: 'wigs', name: 'Wigs' }
  ];

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen font-sans selection:bg-[#D4AF37] selection:text-[#110A08]" style={{ backgroundColor: COLORS.light, color: COLORS.textDark }}>
      {/* Navigation */}
      <nav className="fixed w-full z-50 transition-all duration-500 bg-[#110A08]/95 backdrop-blur-xl border-b border-[#D4AF37]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            <div className="flex-shrink-0 cursor-pointer group" onClick={() => scrollToSection('home')}>
              <img src={logoUrl} alt="Opulence Slik" className="h-14 md:h-18 w-auto object-contain rounded-full bg-white transition-transform duration-500 group-hover:scale-105" />
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-12">
              {['Home', 'Shop', 'Reviews'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase())}
                  className="text-[11px] uppercase tracking-[0.2em] font-medium hover:text-[#D4AF37] transition-all duration-300 relative group"
                  style={{ color: COLORS.textLight }}
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#D4AF37] transition-all duration-300 group-hover:w-full"></span>
                </button>
              ))}
              <Link 
                to="/about"
                className="text-[11px] uppercase tracking-[0.2em] font-medium hover:text-[#D4AF37] transition-all duration-300 relative group"
                style={{ color: COLORS.textLight }}
              >
                About
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#D4AF37] transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link 
                to="/orders"
                className="text-[11px] uppercase tracking-[0.2em] font-medium hover:text-[#D4AF37] transition-all duration-300 relative group"
                style={{ color: COLORS.textLight }}
              >
                Track Order
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#D4AF37] transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-[#D4AF37] text-[#110A08] text-[11px] uppercase tracking-[0.15em] font-bold hover:bg-white transition-all duration-500 shadow-lg hover:shadow-[#D4AF37]/20 relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-white translate-y-full transition-transform duration-500 group-hover:translate-y-0"></div>
                <ShoppingBag size={16} className="relative z-10" />
                <span className="relative z-10">Bag</span>
                {cartItemCount > 0 && (
                  <span className="relative z-10 bg-[#110A08] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-6">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2"
                style={{ color: COLORS.gold }}
              >
                <ShoppingBag size={26} />
                {cartItemCount > 0 && (
                  <span className="absolute top-0 right-0 bg-white text-[#110A08] text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#110A08]">
                    {cartItemCount}
                  </span>
                )}
              </button>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ color: COLORS.gold }}>
                {isMenuOpen ? <X size={30} /> : <Menu size={30} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#110A08] border-b border-[#D4AF37]/10 overflow-hidden"
            >
              <div className="px-6 pt-4 pb-10 space-y-6">
                {['Home', 'Shop', 'Reviews'].map((item) => (
                  <button
                    key={item}
                    onClick={() => scrollToSection(item.toLowerCase())}
                    className="block w-full text-left text-xs uppercase tracking-[0.2em] font-medium py-2"
                    style={{ color: COLORS.textLight }}
                  >
                    {item}
                  </button>
                ))}
                <Link
                  to="/about"
                  className="block w-full text-left text-xs uppercase tracking-[0.2em] font-medium py-2"
                  style={{ color: COLORS.textLight }}
                >
                  About
                </Link>
                <Link
                  to="/orders"
                  className="block w-full text-left text-xs uppercase tracking-[0.2em] font-medium py-2"
                  style={{ color: COLORS.textLight }}
                >
                  Track Order
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center pt-24 overflow-hidden" style={{ backgroundColor: COLORS.dark }}>
        {/* Background Accents */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[120px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 text-center lg:text-left order-2 lg:order-1"
            >
              <div className="inline-block mb-6">
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] border-b border-[#D4AF37]/30 pb-2">
                  {heroContent.topSubtitle}
                </span>
              </div>
              <h2 className="text-6xl md:text-8xl lg:text-9xl font-serif leading-[0.9] mb-8" style={{ color: COLORS.gold }}>
                <span className="italic font-light block mb-2">{heroContent.title1}</span>
                <span className="text-white block">{heroContent.title2}</span>
              </h2>
              <p className="text-lg md:text-xl mb-12 max-w-lg mx-auto lg:mx-0 font-light leading-relaxed opacity-80" style={{ color: COLORS.textLight }}>
                {heroContent.description}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
                <button 
                  onClick={() => scrollToSection('shop')}
                  className="group relative px-12 py-4 rounded-full bg-[#D4AF37] text-[#110A08] font-bold text-xs uppercase tracking-[0.2em] overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(212,175,55,0.3)]"
                >
                  <span className="relative z-10">{heroContent.ctaText}</span>
                  <div className="absolute inset-0 bg-white translate-y-full transition-transform duration-500 group-hover:translate-y-0"></div>
                </button>
                <Link 
                  to="/about"
                  className="text-white text-xs uppercase tracking-[0.2em] font-bold border-b border-white/20 pb-2 hover:border-[#D4AF37] transition-all duration-300"
                >
                  {heroContent.secondaryCtaText}
                </Link>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 relative order-1 lg:order-2"
            >
              <div className="relative z-10 p-4 bg-white/5 backdrop-blur-sm rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden aspect-[4/5]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={heroSlides[currentSlide]?.id || 'default'}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-4"
                  >
                    <img 
                      src={heroSlides[currentSlide]?.imageUrl || "https://image2url.com/r2/default/images/1774387813127-1c470e2f-78e2-4107-b6ce-b4c441c3bc29.png"} 
                      alt={heroSlides[currentSlide]?.title || "Radiant skin"} 
                      className="w-full h-full rounded-[1.5rem] shadow-2xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {/* Slide Content Overlay */}
                    {(heroSlides[currentSlide]?.title || heroSlides[currentSlide]?.subtitle) && (
                      <div className="absolute bottom-8 left-8 right-8 p-6 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10">
                        {heroSlides[currentSlide]?.title && (
                          <h3 className="text-xl font-serif font-bold text-white mb-1">{heroSlides[currentSlide].title}</h3>
                        )}
                        {heroSlides[currentSlide]?.subtitle && (
                          <p className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">{heroSlides[currentSlide].subtitle}</p>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                
                {/* Slide Indicators */}
                {heroSlides.length > 1 && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {heroSlides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-[#D4AF37] w-6' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-2xl hidden md:block animate-bounce-slow z-20">
                <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Trusted By</div>
                <div className="text-xl font-serif font-bold text-[#110A08]">5000+ Glowers</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-center justify-between">
            <h2 className="text-2xl font-serif font-bold text-[#110A08] tracking-tight">Popular categories</h2>
            <button 
              onClick={() => scrollToSection('shop')}
              className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37] border-b border-[#D4AF37]/30 pb-1"
            >
              View All
            </button>
          </div>
          <div className="flex overflow-x-auto pb-8 gap-8 no-scrollbar snap-x">
            {categoryImages.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  scrollToSection('shop');
                }}
                className="flex-shrink-0 w-28 sm:w-36 snap-start group text-center"
              >
                <div className="aspect-square rounded-full overflow-hidden mb-4 bg-gray-100 border-2 border-transparent group-hover:border-[#D4AF37] transition-all duration-500 shadow-sm group-hover:shadow-xl">
                  <img src={cat.url} alt={cat.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 group-hover:text-[#110A08] transition-colors">{cat.label}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className="py-20 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-center justify-between">
            <div className="max-w-2xl">
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-4 block">Most Loved</span>
              <h2 className="text-3xl md:text-5xl font-serif italic text-[#110A08]">Best Sellers</h2>
            </div>
            <button 
              onClick={() => scrollToSection('shop')}
              className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37] border-b border-[#D4AF37]/30 pb-1"
            >
              View All Collection
            </button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {products.filter(p => p.isPopular).slice(0, 4).map((product, i) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                className="group cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] mb-4 bg-white shadow-sm group-hover:shadow-xl transition-all duration-500">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-[#110A08]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm sm:text-lg font-serif mb-1 text-[#110A08] group-hover:text-[#D4AF37] transition-colors">{product.name}</h3>
                  <p className="text-xs font-bold text-[#D4AF37]">{formatPrice(product.price)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop Section */}
      <section id="shop" className="py-16 md:py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-10">
            <div className="max-w-2xl">
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-4 block">Curated Selection</span>
              <h2 className="text-4xl md:text-6xl font-serif italic text-[#110A08]">Our Collection</h2>
            </div>
            
            <div className="flex flex-col gap-6 w-full lg:w-auto">
              <div className="flex flex-wrap items-center gap-3">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-6 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${
                      activeCategory === category.id
                        ? 'bg-[#110A08] text-white shadow-xl'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-12 max-w-2xl mx-auto">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search our collection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-5 rounded-full bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm sm:text-base font-serif italic"
              />
              <Search 
                size={20} 
                className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D4AF37] transition-colors" 
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#D4AF37] transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-8 sm:gap-y-16">
            {shopProducts.map((product, i) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                className="group cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] aspect-[4/5] mb-4 sm:mb-8 bg-gray-100">
                  {product.isPopular && (
                    <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-10 bg-[#D4AF37] text-[#110A08] text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] py-1.5 px-3 sm:py-2 sm:px-4 rounded-full shadow-xl">
                      Best Seller
                    </div>
                  )}
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-[#110A08]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                    <div className="bg-white text-[#110A08] px-4 sm:px-8 py-2 sm:py-3 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      Quick View
                    </div>
                  </div>
                </div>
                
                <div className="text-center px-2 sm:px-4">
                  <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold mb-1 sm:mb-2 block">{product.category}</span>
                  <h3 className="text-base sm:text-2xl font-serif mb-1 sm:mb-3 text-[#110A08] group-hover:text-[#D4AF37] transition-colors duration-300 leading-tight">{product.name}</h3>
                  <p className="text-[10px] sm:text-sm text-gray-500 mb-2 sm:mb-4 line-clamp-2 font-light leading-relaxed">{product.description}</p>
                  <p className="text-base sm:text-xl font-serif font-bold text-[#110A08] mb-4 sm:mb-6">{formatPrice(product.price)}</p>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    className="w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-[#110A08]/10 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#110A08] hover:text-white transition-all duration-500"
                  >
                    Add to Bag
                  </button>
                </div>
              </motion.div>
            ))}
            
            {shopProducts.length === 0 && (
              <div className="col-span-full text-center py-32 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                <p className="text-xl text-gray-400 font-serif italic mb-8">
                  {searchQuery 
                    ? `No treasures found matching "${searchQuery}"`
                    : "Your selection returned no results."}
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="px-10 py-3 bg-[#110A08] text-white rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#D4AF37] transition-all duration-500"
                >
                  {searchQuery ? "Clear Search" : "View All Products"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Delivery Banner */}
      <section className="bg-[#110A08] py-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-[80px]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-4xl md:text-6xl font-serif italic text-white mb-2">FREE & FAST</h2>
              <h2 className="text-4xl md:text-6xl font-serif font-bold text-[#D4AF37]">DELIVERY</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <CheckCircle2 className="text-[#D4AF37]" size={32} />
              </div>
              <p className="text-white/60 max-w-[200px] text-sm font-light leading-relaxed">
                On all orders above KES 5,000. Delivered to your doorstep within 24-48 hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section Link */}
      <section id="about" className="py-24 bg-[#FDFBF7] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <div className="mb-8">
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37]">The Philosophy</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-serif mb-10 italic leading-tight text-[#110A08]">
                The Essence of <br /><span className="not-italic font-bold">Pure Opulence</span>
              </h2>
              <div className="w-20 h-1 bg-[#D4AF37] mb-12 mx-auto"></div>
              <p className="text-lg md:text-xl text-gray-700 font-light leading-relaxed mb-12">
                Opulence Slik is more than skincare — it's a daily ritual of self-love and luxury. We believe that everyone deserves to feel radiant in their own skin.
              </p>
              <Link 
                to="/about"
                className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-bold text-[#110A08] border-b-2 border-[#D4AF37] pb-2 hover:text-[#D4AF37] transition-all duration-300"
              >
                Learn More About Us <ArrowRight size={16} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-24 md:py-40 bg-[#110A08] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#D4AF37 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-24">
            <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-4 block">Testimonials</span>
            <h2 className="text-4xl md:text-6xl font-serif italic text-white">What Our Customers Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {realReviews.length > 0 ? (
              realReviews.map((review, i) => (
                <motion.div 
                  key={review.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 1 }}
                  className="bg-white/5 backdrop-blur-sm p-10 rounded-[2.5rem] border border-white/10 relative group hover:bg-white/10 transition-all duration-500"
                >
                  <div className="flex gap-1 mb-8 text-[#D4AF37]">
                    {[...Array(5)].map((_, j) => <Star key={j} size={14} fill={j < review.rating ? "currentColor" : "none"} />)}
                  </div>
                  <p className="font-serif text-xl md:text-2xl mb-10 text-white leading-relaxed italic line-clamp-4">"{review.comment}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold text-xs">
                      {review.customerName[0]}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white tracking-widest uppercase">{review.customerName}</div>
                      <div className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold mt-1">Verified Glower</div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              [
                { text: "My skin has never looked better! The Glow Up Body Cream is a game changer.", author: "Sarah K.", role: "Verified Glower" },
                { text: "The best products I've ever used. The luxury feel is unmatched.", author: "Jessica M.", role: "Loyal Customer" },
                { text: "Luxurious and effective. I'm in love with the Therapy Oil!", author: "Emily R.", role: "Beauty Blogger" }
              ].map((review, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 1 }}
                  className="bg-white/5 backdrop-blur-sm p-10 rounded-[2.5rem] border border-white/10 relative group hover:bg-white/10 transition-all duration-500"
                >
                  <div className="flex gap-1 mb-8 text-[#D4AF37]">
                    {[...Array(5)].map((_, j) => <Star key={j} size={14} fill="currentColor" />)}
                  </div>
                  <p className="font-serif text-xl md:text-2xl mb-10 text-white leading-relaxed italic">"{review.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold text-xs">
                      {review.author[0]}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white tracking-widest uppercase">{review.author}</div>
                      <div className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold mt-1">{review.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Footer / CTA Section */}
      <footer id="contact" className="pt-24 pb-12 bg-[#FDFBF7] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Newsletter Section */}
          <div className="mb-24 p-12 md:p-20 bg-white rounded-[3rem] shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-[80px]"></div>
            <div className="max-w-xl text-center lg:text-left relative z-10">
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-4 block">Newsletter</span>
              <h3 className="text-3xl md:text-5xl font-serif italic text-[#110A08] mb-6">Join the inner circle</h3>
              <p className="text-gray-500 font-light leading-relaxed">Be the first to know about new collection drops, exclusive offers, and skincare rituals.</p>
            </div>
            <form className="w-full lg:w-auto flex flex-col sm:flex-row gap-4 relative z-10">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
                <input 
                  type="email" 
                  placeholder="Your email address" 
                  className="pl-12 pr-6 py-4 rounded-full bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-[#D4AF37]/20 focus:bg-white outline-none transition-all w-full sm:w-80 text-sm"
                />
              </div>
              <button className="px-10 py-4 rounded-full bg-[#110A08] text-white text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#D4AF37] transition-all duration-500 shadow-xl">
                Subscribe
              </button>
            </form>
          </div>

          <div className="bg-[#110A08] rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden mb-24">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-[80px]"></div>
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-6 block">Join The Elite</span>
              <h2 className="text-4xl md:text-7xl font-serif italic text-white mb-12 leading-tight">Start your glow journey today</h2>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-8">
                <button 
                  onClick={() => scrollToSection('shop')}
                  className="group relative px-12 py-4 rounded-full bg-[#D4AF37] text-[#110A08] font-bold text-xs uppercase tracking-[0.2em] overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] w-full sm:w-auto"
                >
                  <span className="relative z-10">Shop Now</span>
                  <div className="absolute inset-0 bg-white translate-y-full transition-transform duration-500 group-hover:translate-y-0"></div>
                </button>
                <a 
                  href="https://wa.me/254797008487" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 px-10 py-4 rounded-full border border-white/20 text-white font-bold text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-[#110A08] transition-all duration-500 w-full sm:w-auto"
                >
                  <MessageCircle size={18} />
                  WhatsApp Order
                </a>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-4 gap-16 mb-24">
            <div className="md:col-span-2">
              <img src={logoUrl} alt="Opulence Slik" className="h-20 w-auto object-contain rounded-full bg-white shadow-xl mb-8" />
              <p className="text-gray-500 max-w-sm leading-relaxed font-light">
                Luxury skincare for radiant, confident skin. Experience the ultimate glow with Opulence Slik.
              </p>
            </div>
            
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#110A08] mb-8">Navigation</h4>
              <ul className="space-y-4">
                {['Home', 'About', 'Shop', 'Reviews'].map(item => (
                  <li key={item}>
                    <button onClick={() => scrollToSection(item.toLowerCase())} className="text-sm text-gray-500 hover:text-[#D4AF37] transition-colors">{item}</button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#110A08] mb-8">Support</h4>
              <ul className="space-y-4">
                <li><Link to="/orders" className="text-sm text-gray-500 hover:text-[#D4AF37] transition-colors">Track Order</Link></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#D4AF37] transition-colors">Shipping Policy</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#D4AF37] transition-colors">Returns & Exchanges</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">
            <p>&copy; {new Date().getFullYear()} Opulence Slik. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-[#D4AF37] transition-colors">Instagram</a>
              <a href="#" className="hover:text-[#D4AF37] transition-colors">Facebook</a>
              <a href="#" className="hover:text-[#D4AF37] transition-colors">TikTok</a>
            </div>
          </div>
        </div>
      </footer>

      <Cart />
      <AIAssistant />
      <ProductQuickView 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />

      {/* Floating Buttons */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-4">
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-14 h-14 bg-white text-[#110A08] rounded-full shadow-2xl flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#110A08] transition-all duration-500 border border-gray-100"
              aria-label="Scroll to top"
            >
              <ArrowUp size={24} />
            </motion.button>
          )}
        </AnimatePresence>
        
        <motion.a
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          href="https://wa.me/254797008487"
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 bg-[#25D366] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-500"
          aria-label="Contact on WhatsApp"
        >
          <MessageCircle size={28} fill="currentColor" />
        </motion.a>
      </div>
    </div>
  );
}
