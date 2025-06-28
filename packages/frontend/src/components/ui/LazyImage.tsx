'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { createIntersectionObserver } from '../../lib/performance';
import OptimizedImage from './OptimizedImage';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
  // Lazy loading specific props
  threshold?: number;
  rootMargin?: string;
  fallbackSrc?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = '50px',
  fallbackSrc,
}) => {
  const [isInView, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState(priority ? src : '');
  const [hasErrored, setHasErrored] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = createIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setCurrentSrc(src);
            observer?.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (observer && imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [src, priority, isInView, threshold, rootMargin]);

  const handleImageError = () => {
    if (fallbackSrc && !hasErrored) {
      setCurrentSrc(fallbackSrc);
      setHasErrored(true);
    } else {
      onError?.();
    }
  };

  const handleImageLoad = () => {
    onLoad?.();
  };

  return (
    <div ref={imgRef} className={cn('relative', className)}>
      {isInView && currentSrc ? (
        <OptimizedImage
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          priority={priority}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          sizes={sizes}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="w-full h-full object-cover"
        />
      ) : (
        // Placeholder while loading
        <div
          className={cn(
            'flex items-center justify-center bg-gray-800/50 rounded-lg border border-purple-500/20',
            fill ? 'absolute inset-0' : '',
            !fill && width && height ? `w-[${width}px] h-[${height}px]` : 'w-full aspect-video'
          )}
        >
          <div className="text-center p-4">
            <div className="text-gray-400 mb-2 animate-pulse">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="w-16 h-2 bg-gray-700/50 rounded animate-pulse"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;