import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Star, CheckCircle2, MessageCircle, Send, User, Package } from 'lucide-react';
import { Product, Review } from '../types';
import { formatPrice } from '../lib/storage';
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, doc, getDoc } from 'firebase/firestore';

interface ProductQuickViewProps {
  product: Product | null;
  onClose: () => void;
}

const COLORS = {
  dark: '#110A08',
  light: '#FDFBF7',
  gold: '#D4AF37',
  goldLight: '#F3E5AB',
  textDark: '#2A1B18',
  textLight: '#FDFBF7',
};

export default function ProductQuickView({ product, onClose }: ProductQuickViewProps) {
  const { addToCart } = useCart();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    customerName: '',
    rating: 5,
    comment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [comboProducts, setComboProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!product || product.category !== 'combos' || !product.comboItems?.length) {
      setComboProducts([]);
      return;
    }

    const fetchComboProducts = async () => {
      const products: Product[] = [];
      for (const id of product.comboItems!) {
        try {
          const docRef = doc(db, 'products', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            products.push({ id: docSnap.id, ...docSnap.data() } as Product);
          }
        } catch (error) {
          console.error(`Error fetching combo product ${id}:`, error);
        }
      }
      setComboProducts(products);
    };

    fetchComboProducts();
  }, [product]);

  useEffect(() => {
    if (!product) return;

    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', product.id),
      where('approved', '==', true),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Review[];
      setReviews(reviewsData);
    });

    return () => unsubscribe();
  }, [product]);

  if (!product) return null;

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 5;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.customerName || !newReview.comment) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: product.id,
        customerName: newReview.customerName,
        rating: newReview.rating,
        comment: newReview.comment,
        date: new Date().toISOString(),
        approved: false // Requires admin approval
      });
      setSubmitSuccess(true);
      setNewReview({ customerName: '', rating: 5, comment: '' });
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowReviewForm(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
            <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-[#FDFBF7] rounded-[3rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.25)] flex flex-col md:flex-row max-h-[90vh]"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-8 right-8 z-20 p-3 rounded-full bg-white/80 backdrop-blur-md hover:bg-[#110A08] hover:text-white transition-all duration-500 text-[#110A08] shadow-lg"
            >
              <X size={20} />
            </button>

            {/* Product Image */}
            <div className="w-full md:w-1/2 h-80 md:h-auto relative overflow-hidden group">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              {product.isPopular && (
                <div className="absolute top-8 left-8 bg-[#D4AF37] text-[#110A08] text-[10px] font-bold uppercase tracking-[0.2em] py-2 px-5 rounded-full shadow-xl">
                  Best Seller
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="w-full md:w-1/2 p-10 md:p-16 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-1 mb-6 text-[#D4AF37]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill={i < Math.round(averageRating) ? "currentColor" : "none"} />
                ))}
                <span className="text-[10px] text-gray-400 ml-3 font-bold uppercase tracking-[0.2em]">
                  {averageRating.toFixed(1)} ({reviews.length} Reviews)
                </span>
              </div>

              <span className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold mb-3 block">{product.category}</span>
              <h2 className="text-4xl md:text-5xl font-serif mb-6 text-[#110A08] leading-tight">
                {product.name}
              </h2>
              
              <p className="text-3xl font-serif font-bold text-[#110A08] mb-8">
                {formatPrice(product.price)}
              </p>

              <div className="w-16 h-px bg-[#D4AF37]/30 mb-8"></div>

              <p className="text-gray-500 mb-10 leading-relaxed text-lg font-light">
                {product.description}
              </p>

              {product.category === 'combos' && comboProducts.length > 0 && (
                <div className="mb-12">
                  <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#110A08] mb-6 flex items-center gap-2">
                    <Package size={14} className="text-[#D4AF37]" />
                    Included in this Combo
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {comboProducts.map((p) => (
                      <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#110A08]">{p.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{p.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-12">
                {[
                  'Dermatologically Tested',
                  'Natural Ingredients',
                  'Cruelty Free',
                  'Sustainably Sourced'
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-[11px] text-gray-600 uppercase tracking-widest font-bold">
                    <div className="w-5 h-5 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                      <CheckCircle2 size={12} className="text-[#D4AF37]" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 mb-12">
                <button
                  onClick={() => {
                    addToCart(product);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-4 px-10 py-5 rounded-2xl bg-[#110A08] text-white font-bold hover:bg-[#D4AF37] transition-all duration-500 shadow-xl hover:shadow-2xl active:scale-[0.98]"
                >
                  <ShoppingBag size={18} />
                  <span className="uppercase tracking-[0.2em] text-[11px]">Add to Bag</span>
                </button>
                
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="w-full flex items-center justify-center gap-4 px-10 py-5 rounded-2xl border border-[#110A08]/10 text-[#110A08] font-bold hover:bg-gray-50 transition-all duration-500"
                >
                  <MessageCircle size={18} />
                  <span className="uppercase tracking-[0.2em] text-[11px]">Write a Review</span>
                </button>
              </div>

              {/* Review Form */}
              <AnimatePresence>
                {showReviewForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-12 overflow-hidden"
                  >
                    <form onSubmit={handleSubmitReview} className="bg-gray-50 p-8 rounded-3xl border border-gray-100 space-y-6">
                      {submitSuccess ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} />
                          </div>
                          <h4 className="text-xl font-serif text-[#110A08] mb-2">Review Submitted!</h4>
                          <p className="text-sm text-gray-500">Thank you for your feedback. It will be visible once approved by our team.</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-6">
                            <div>
                              <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Your Name</label>
                              <input
                                type="text"
                                required
                                value={newReview.customerName}
                                onChange={(e) => setNewReview({ ...newReview, customerName: e.target.value })}
                                className="w-full px-6 py-4 rounded-xl bg-white border-none focus:ring-2 focus:ring-[#D4AF37]/20 outline-none text-sm"
                                placeholder="Enter your name"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Rating</label>
                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setNewReview({ ...newReview, rating: star })}
                                    className={`p-2 transition-colors ${newReview.rating >= star ? 'text-[#D4AF37]' : 'text-gray-300'}`}
                                  >
                                    <Star size={24} fill={newReview.rating >= star ? "currentColor" : "none"} />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Your Review</label>
                              <textarea
                                required
                                value={newReview.comment}
                                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                className="w-full px-6 py-4 rounded-xl bg-white border-none focus:ring-2 focus:ring-[#D4AF37]/20 outline-none text-sm min-h-[120px]"
                                placeholder="Share your experience with this product..."
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#110A08] text-white text-[10px] uppercase tracking-widest font-bold hover:bg-[#D4AF37] transition-all duration-500 disabled:opacity-50"
                          >
                            {isSubmitting ? 'Submitting...' : (
                              <>
                                <Send size={14} />
                                <span>Submit Review</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reviews List */}
              <div className="space-y-10">
                <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#110A08] border-b border-[#110A08]/10 pb-4">
                  Customer Reviews ({reviews.length})
                </h4>
                
                {reviews.length > 0 ? (
                  <div className="space-y-10">
                    {reviews.map((review) => (
                      <div key={review.id} className="group">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#110A08]">
                              <User size={18} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-[#110A08] uppercase tracking-widest">{review.customerName}</div>
                              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                {new Date(review.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 text-[#D4AF37]">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600 font-light leading-relaxed italic">
                          "{review.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400 font-serif italic">No reviews yet. Be the first to share your experience!</p>
                  </div>
                )}
              </div>
              
              <p className="text-center text-[9px] text-gray-400 mt-16 uppercase tracking-[0.3em] font-bold">
                Free shipping on orders over KES 15,000
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
