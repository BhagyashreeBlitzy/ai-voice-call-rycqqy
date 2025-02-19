import React, { useCallback, useEffect, useState } from 'react';
import '../../styles/animations.css';
import '../../styles/components.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | string;
  ariaLabel?: string;
  className?: string;
  reducedMotion?: boolean;
  themeAware?: boolean;
}

const useSpinnerAnimation = (reducedMotion?: boolean) => {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(reducedMotion);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(reducedMotion || mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setShouldReduceMotion(reducedMotion || e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [reducedMotion]);

  return shouldReduceMotion;
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  ariaLabel = 'Loading...',
  className = '',
  reducedMotion = false,
  themeAware = true,
}) => {
  const shouldReduceMotion = useSpinnerAnimation(reducedMotion);

  const getSpinnerSize = useCallback(() => {
    const sizes = {
      small: 16,
      medium: 24,
      large: 32,
    };
    return sizes[size];
  }, [size]);

  const getSpinnerColor = useCallback(() => {
    if (color === 'primary') {
      return 'var(--color-primary)';
    }
    if (color === 'secondary') {
      return 'var(--color-secondary)';
    }
    return color;
  }, [color]);

  const spinnerSize = getSpinnerSize();
  const spinnerColor = getSpinnerColor();

  const spinnerStyles: React.CSSProperties = {
    width: spinnerSize,
    height: spinnerSize,
    color: spinnerColor,
    animation: shouldReduceMotion ? 'none' : 'rotate 1s linear infinite',
    willChange: 'transform',
    transform: 'translateZ(0)',
    minWidth: '44px',
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const svgStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 4,
    strokeLinecap: 'round',
    strokeDasharray: 150,
    strokeDashoffset: 75,
    transformOrigin: 'center',
  };

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-busy="true"
      className={`loading-spinner ${themeAware ? 'theme-aware' : ''} ${className}`}
      style={spinnerStyles}
      data-testid="loading-spinner"
    >
      <svg
        viewBox="0 0 50 50"
        style={svgStyles}
        className="gpu-accelerated"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
        />
      </svg>
    </div>
  );
};

export default LoadingSpinner;