import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/storage';

export interface PriceFilter {
  id: string;
  label: string;
  min: number;
  max: number | null;
}

const DEFAULT_LOGO = 'https://image2url.com/r2/default/images/1774387130560-80cd837b-a2e5-4a84-87d3-c5e277bf2b2d.png';

const DEFAULT_PRICE_FILTERS: PriceFilter[] = [
  { id: 'under-10k', label: 'Under KES 10,000', min: 0, max: 10000 },
  { id: '10k-20k', label: 'KES 10,000 - 20,000', min: 10000, max: 20000 },
  { id: 'over-20k', label: 'Over KES 20,000', min: 20000, max: null }
];

export interface CategoryImage {
  id: string;
  url: string;
  label: string;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
}

const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  { 
    id: '1', 
    imageUrl: 'https://image2url.com/r2/default/images/1774387813127-1c470e2f-78e2-4107-b6ce-b4c441c3bc29.png',
    title: 'Pure Opulence',
    subtitle: 'Natural Glow'
  }
];

const DEFAULT_HERO_CONTENT = {
  title1: 'Glow Soft.',
  title2: 'Glow Rich.',
  description: 'Experience the ultimate luxury in melanin-rich skincare. Handcrafted formulas for your most radiant self.',
  topSubtitle: 'Premium Skincare Essentials',
  ctaText: 'Explore Collection',
  secondaryCtaText: 'Our Story'
};

const DEFAULT_CATEGORY_IMAGES: CategoryImage[] = [
  { id: 'face', label: 'Face Care', url: 'https://image2url.com/r2/default/images/1774387277140-b194b186-425a-4c9b-b533-68730254dd3b.jpg' },
  { id: 'body', label: 'Body Care', url: 'https://image2url.com/r2/default/images/1774387247714-3d94387b-425a-4c9b-b533-68730254dd3b.jpg' },
  { id: 'oils', label: 'Luxury Oils', url: 'https://image2url.com/r2/default/images/1774387214771-4d94387b-425a-4c9b-b533-68730254dd3b.jpg' },
  { id: 'combos', label: 'Value Combos', url: 'https://image2url.com/r2/default/images/1774387184771-5d94387b-425a-4c9b-b533-68730254dd3b.jpg' },
  { id: 'wigs', label: 'Premium Wigs', url: 'https://picsum.photos/seed/wigs/400/500' }
];

export function useStoreSettings() {
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [priceFilters, setPriceFilters] = useState<PriceFilter[]>(DEFAULT_PRICE_FILTERS);
  const [categoryImages, setCategoryImages] = useState<CategoryImage[]>(DEFAULT_CATEGORY_IMAGES);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [heroContent, setHeroContent] = useState(DEFAULT_HERO_CONTENT);

  const updateLogoUrl = async (newUrl: string) => {
    const finalUrl = newUrl.trim() || DEFAULT_LOGO;
    try {
      await setDoc(doc(db, 'settings', 'store'), { logoUrl: finalUrl }, { merge: true });
    } catch (error) {
      console.error('Error updating logo:', error);
    }
  };

  const updatePriceFilters = async (newFilters: PriceFilter[]) => {
    try {
      await setDoc(doc(db, 'settings', 'store'), { priceFilters: newFilters }, { merge: true });
    } catch (error) {
      console.error('Error updating price filters:', error);
    }
  };

  const updateCategoryImage = async (categoryId: string, newUrl: string) => {
    try {
      const updatedImages = categoryImages.map(img => 
        img.id === categoryId ? { ...img, url: newUrl } : img
      );
      await setDoc(doc(db, 'settings', 'store'), { categoryImages: updatedImages }, { merge: true });
    } catch (error) {
      console.error('Error updating category image:', error);
    }
  };

  const updateHeroSlides = async (newSlides: HeroSlide[]) => {
    try {
      await setDoc(doc(db, 'settings', 'store'), { heroSlides: newSlides }, { merge: true });
    } catch (error) {
      console.error('Error updating hero slides:', error);
    }
  };

  const updateHeroContent = async (newContent: typeof DEFAULT_HERO_CONTENT) => {
    try {
      await setDoc(doc(db, 'settings', 'store'), { heroContent: newContent }, { merge: true });
    } catch (error) {
      console.error('Error updating hero content:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        if (data.priceFilters) setPriceFilters(data.priceFilters);
        if (data.categoryImages) setCategoryImages(data.categoryImages);
        if (data.heroSlides) setHeroSlides(data.heroSlides);
        if (data.heroContent) setHeroContent(data.heroContent);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/store');
    });
    
    return () => unsubscribe();
  }, []);

  return { 
    logoUrl, updateLogoUrl, 
    priceFilters, updatePriceFilters, 
    categoryImages, updateCategoryImage, 
    heroSlides, updateHeroSlides,
    heroContent, updateHeroContent
  };
}
