import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStoreSettings } from '../hooks/useStoreSettings';

const COLORS = {
  dark: '#110A08',
  light: '#FDFBF7',
  gold: '#D4AF37',
  textDark: '#2A1B18',
  textLight: '#FDFBF7',
};

export default function About() {
  const { logoUrl } = useStoreSettings();

  return (
    <div className="min-h-screen font-sans selection:bg-[#D4AF37] selection:text-[#110A08]" style={{ backgroundColor: COLORS.light, color: COLORS.textDark }}>
      {/* Navigation */}
      <nav className="fixed w-full z-50 transition-all duration-500 bg-[#110A08]/95 backdrop-blur-xl border-b border-[#D4AF37]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            <Link to="/" className="flex-shrink-0 cursor-pointer group">
              <img src={logoUrl} alt="Opulence Slik" className="h-14 md:h-18 w-auto object-contain rounded-full bg-white transition-transform duration-500 group-hover:scale-105" />
            </Link>
            
            <Link 
              to="/"
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-white hover:text-[#D4AF37] transition-all duration-300"
            >
              <ArrowLeft size={16} />
              Back to Store
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              <div className="mb-8">
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37]">The Philosophy</span>
              </div>
              <h1 className="text-4xl md:text-7xl font-serif mb-10 italic leading-tight text-[#110A08]">
                The Essence of <br /><span className="not-italic font-bold">Pure Opulence</span>
              </h1>
              <div className="w-20 h-1 bg-[#D4AF37] mb-12 mx-auto"></div>
              
              <div className="space-y-8 text-lg md:text-xl text-gray-700 font-light leading-relaxed text-left">
                <p>
                  Opulence Slik is more than skincare — it's a daily ritual of self-love and luxury. We believe that everyone deserves to feel radiant in their own skin.
                </p>
                <p>
                  Our handcrafted formulas combine ancient wisdom with modern science to nourish your skin, restore confidence, and give you that soft, radiant, luxurious glow that only Opulence can provide.
                </p>
                <p>
                  Founded with a vision to redefine luxury skincare, we source the finest natural ingredients to create products that are as effective as they are indulgent. Every bottle is a testament to our commitment to quality and your skin's well-being.
                </p>
              </div>

              <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="p-8 bg-white rounded-[2rem] shadow-sm border border-gray-100">
                  <div className="text-4xl font-serif font-bold text-[#D4AF37] mb-4">100%</div>
                  <div className="text-xs uppercase tracking-widest font-bold text-gray-500">Natural Ingredients</div>
                  <p className="mt-4 text-sm text-gray-400 font-light">We use only the purest botanical extracts and essential oils.</p>
                </div>
                <div className="p-8 bg-white rounded-[2rem] shadow-sm border border-gray-100">
                  <div className="text-4xl font-serif font-bold text-[#D4AF37] mb-4">Cruelty</div>
                  <div className="text-xs uppercase tracking-widest font-bold text-gray-500">Free & Vegan</div>
                  <p className="mt-4 text-sm text-gray-400 font-light">Ethically sourced and never tested on animals.</p>
                </div>
              </div>

              <div className="mt-20 p-12 bg-[#110A08] rounded-[3rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-[80px]"></div>
                <h2 className="text-3xl font-serif italic mb-6">Our Promise</h2>
                <div className="space-y-4 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="text-[#D4AF37]" size={20} />
                    <span className="text-sm font-light">Visible results within 14 days</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="text-[#D4AF37]" size={20} />
                    <span className="text-sm font-light">No harmful chemicals or parabens</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="text-[#D4AF37]" size={20} />
                    <span className="text-sm font-light">Eco-friendly sustainable packaging</span>
                  </div>
                </div>
              </div>

              <div className="mt-20">
                <Link 
                  to="/"
                  className="inline-block px-12 py-4 rounded-full bg-[#D4AF37] text-[#110A08] font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#110A08] hover:text-white transition-all duration-500 shadow-xl"
                >
                  Start Your Glow Journey
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-gray-100 text-center text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">
        <p>&copy; {new Date().getFullYear()} Opulence Slik. All rights reserved.</p>
      </footer>
    </div>
  );
}
