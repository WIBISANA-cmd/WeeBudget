import { useState } from 'react';
import { UserCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function UserAvatar({
  src,
  alt,
  className,
  imageClassName,
  fallbackClassName,
  size = 40,
  priority = false,
}) {
  const [isLoaded, setLoaded] = useState(false);
  const [hasError, setError] = useState(false);
  const showImage = Boolean(src) && !hasError;

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl',
        fallbackClassName,
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          'absolute inset-0 rounded-2xl border border-border-subtle bg-surface-100 transition-opacity duration-200',
          showImage && isLoaded ? 'opacity-0' : 'opacity-100',
        )}
      />

      <UserCircle
        size={size - 2}
        strokeWidth={1.5}
        className={cn(
          'relative z-[1] text-primary-500 transition-opacity duration-200',
          showImage && isLoaded ? 'opacity-0' : 'opacity-100',
        )}
      />

      {showImage && (
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'absolute inset-0 z-[2] h-full w-full object-cover transition-opacity duration-200',
            isLoaded ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
        />
      )}
    </span>
  );
}
