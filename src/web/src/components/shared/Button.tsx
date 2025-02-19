import React, { useContext, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { ThemeContext } from '../../theme/themeProvider';

// Button Props Interface
export interface ButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error';
  disabled?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  loading?: boolean;
  dataTestId?: string;
}

// Styled Button Component
const StyledButton = styled.button<ButtonProps>`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  font-weight: 500;
  letter-spacing: 0.02857em;
  text-transform: uppercase;
  user-select: none;
  overflow: hidden;

  /* Size Variants */
  ${({ size }) => {
    switch (size) {
      case 'small':
        return `
          padding: 6px 16px;
          font-size: 0.8125rem;
          min-height: 32px;
        `;
      case 'large':
        return `
          padding: 12px 24px;
          font-size: 0.9375rem;
          min-height: 48px;
        `;
      default: // medium
        return `
          padding: 8px 20px;
          font-size: 0.875rem;
          min-height: 40px;
        `;
    }
  }}

  /* Style Variants */
  ${({ variant, color = 'primary', theme }) => {
    const colors = {
      primary: 'var(--color-primary-main)',
      secondary: 'var(--color-secondary-main)',
      error: 'var(--color-error-main)'
    };
    const baseColor = colors[color];

    switch (variant) {
      case 'outlined':
        return `
          border: 1px solid ${baseColor};
          background: transparent;
          color: ${baseColor};
          &:hover {
            background: ${baseColor}1A;
          }
        `;
      case 'text':
        return `
          background: transparent;
          color: ${baseColor};
          &:hover {
            background: ${baseColor}0D;
          }
        `;
      default: // contained
        return `
          background: ${baseColor};
          color: #FFFFFF;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          &:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            background: ${baseColor}E6;
          }
        `;
    }
  }}

  /* Width */
  ${({ fullWidth }) => fullWidth && 'width: 100%;'}

  /* Disabled State */
  ${({ disabled, loading }) => (disabled || loading) && `
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
    box-shadow: none;
  `}

  /* Focus State */
  &:focus-visible {
    outline: 2px solid var(--color-primary-main);
    outline-offset: 2px;
  }

  /* Active State */
  &:active {
    transform: scale(0.98);
  }

  /* Loading Spinner */
  .spinner {
    position: absolute;
    width: 18px;
    height: 18px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Ripple Effect */
  .ripple {
    position: absolute;
    border-radius: 50%;
    transform: scale(0);
    animation: ripple 0.6s linear;
    background-color: rgba(255, 255, 255, 0.3);
  }

  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;

export const Button: React.FC<ButtonProps> = ({
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  disabled = false,
  fullWidth = false,
  startIcon,
  endIcon,
  children,
  onClick,
  ariaLabel,
  loading = false,
  dataTestId,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { currentTheme } = useContext(ThemeContext);

  // Handle keyboard navigation
  const handleKeyPress = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!disabled && !loading && onClick) {
        onClick(event as unknown as React.MouseEvent<HTMLButtonElement>);
      }
    }
  };

  // Create ripple effect
  const createRippleEffect = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading || variant === 'text') return;

    const button = buttonRef.current;
    if (!button) return;

    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = 'ripple';

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  // Clean up ripples on unmount
  useEffect(() => {
    const button = buttonRef.current;
    return () => {
      if (button) {
        const ripples = button.getElementsByClassName('ripple');
        while (ripples.length > 0) {
          ripples[0].remove();
        }
      }
    };
  }, []);

  return (
    <StyledButton
      ref={buttonRef}
      variant={variant}
      size={size}
      color={color}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      onClick={(e) => {
        if (!disabled && !loading && onClick) {
          createRippleEffect(e);
          onClick(e);
        }
      }}
      onKeyPress={handleKeyPress}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-disabled={disabled || loading}
      data-testid={dataTestId}
      role="button"
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {!loading && startIcon && <span className="start-icon">{startIcon}</span>}
      <span style={{ opacity: loading ? 0 : 1 }}>{children}</span>
      {!loading && endIcon && <span className="end-icon">{endIcon}</span>}
    </StyledButton>
  );
};

export default Button;