import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, ZoomIn } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ImageLightboxProps {
  src: string | null;
  onClose: () => void;
}

export default function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  const { t } = useLanguage();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!src) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [src, handleKeyDown]);

  const handleDownload = async () => {
    if (!src) return;
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'receipt.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          key="lightbox-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }}
          onClick={onClose}
        >
          {/* Top bar */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 z-10"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <ZoomIn size={13} style={{ color: 'rgba(212,175,55,0.7)' }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {t('img_receipt')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(212,175,55,0.12)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: '#D4AF37',
                }}
              >
                <Download size={12} />
                {t('img_download')}
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Image */}
          <motion.div
            key="lightbox-image"
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative max-w-full max-h-full"
            style={{ maxWidth: 'min(90vw, 900px)', maxHeight: '82vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={t('img_receipt')}
              className="rounded-xl object-contain"
              style={{
                maxWidth: '100%',
                maxHeight: '82vh',
                boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
              }}
            />
          </motion.div>

          {/* Bottom hint */}
          <p
            className="absolute bottom-5 left-0 right-0 text-center text-[9px] uppercase tracking-[0.25em] font-bold"
            style={{ color: 'rgba(255,255,255,0.15)' }}
          >
            {t('img_press_esc')}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
