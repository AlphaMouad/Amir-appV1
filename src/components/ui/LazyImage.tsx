import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Image as ImageIcon } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function LazyImage({ src, alt, className = '' }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        />
      )}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <ImageIcon className="h-7 w-7 mb-2 opacity-40" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Unavailable</span>
        </div>
      ) : (
        <motion.img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </div>
  );
}
