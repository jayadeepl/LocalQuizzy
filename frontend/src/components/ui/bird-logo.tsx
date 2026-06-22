'use client';

import { useState } from 'react';

interface BirdLogoProps {
  size?: number;
  className?: string;
  variant?: 'default' | 'dark-bg';
}

export function BirdLogo({ size = 40, className = '', variant = 'default' }: BirdLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  if (variant === 'dark-bg') {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-lg bg-white/90 shrink-0 ${className}`}
        style={{ width: size + 8, height: size + 8 }}
      >
        <img
          src="/bird-logo.png"
          alt="BIRD Lucknow"
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <img
      src="/bird-logo.png"
      alt="BIRD Lucknow"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
