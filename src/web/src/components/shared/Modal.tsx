import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { THEME_COLORS, Z_INDEX } from '../../constants/theme.constants';

// Modal size options
export enum MODAL_SIZES {
  SMALL = 'sm',
  MEDIUM = 'md',
  LARGE = 'lg'
}

// Modal width mappings
const MODAL_WIDTHS = {
  [MODAL_SIZES.SMALL]: '400px',
  [MODAL_SIZES.MEDIUM]: '600px',
  [MODAL_SIZES.LARGE]: '800px'
};

const ANIMATION_DURATION = 300; // ms

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: MODAL_SIZES;
  title?: string;
  closeOnOverlayClick?: boolean;
}

// Custom hook to handle escape key press
const useEscapeKey = (onClose: () => void, isOpen: boolean) => {
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isOpen, handleEscapeKey]);
};

// Custom hook to manage focus trap
const useFocusTrap = (modalRef: React.RefObject<HTMLDivElement>, isOpen: boolean) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Find all focusable elements within the modal
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length) {
        (focusableElements[0] as HTMLElement).focus();
      }

      const handleTabKey = (event: KeyboardEvent) => {
        if (!modalRef.current || !event.key === 'Tab') return;

        const firstFocusable = focusableElements[0] as HTMLElement;
        const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstFocusable) {
            event.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            event.preventDefault();
            firstFocusable.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);
      return () => {
        document.removeEventListener('keydown', handleTabKey);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, modalRef]);
};

export const Modal: React.FC<ModalProps> = ({
  children,
  isOpen,
  onClose,
  size = MODAL_SIZES.MEDIUM,
  title,
  closeOnOverlayClick = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();

  // Use custom hooks
  useEscapeKey(onClose, isOpen);
  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsAnimating(true);
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
      }, ANIMATION_DURATION);
    }

    return () => {
      document.body.style.overflow = '';
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnOverlayClick && !isAnimating) {
      event.preventDefault();
      setIsAnimating(true);
      animationTimeoutRef.current = setTimeout(() => {
        onClose();
        setIsAnimating(false);
      }, ANIMATION_DURATION);
    }
  };

  const handleModalClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="presentation"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: THEME_COLORS.primary.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.overlay,
        opacity: isAnimating ? 0 : 1,
        transition: `opacity ${ANIMATION_DURATION}ms ease-in-out`,
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        onClick={handleModalClick}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          width: MODAL_WIDTHS[size],
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          zIndex: Z_INDEX.modal,
          transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
          opacity: isAnimating ? 0 : 1,
          transition: `transform ${ANIMATION_DURATION}ms ease-in-out, opacity ${ANIMATION_DURATION}ms ease-in-out`,
        }}
      >
        {title && (
          <div
            id="modal-title"
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #E5E5E5',
              fontSize: '1.25rem',
              fontWeight: 600,
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            padding: '24px',
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};