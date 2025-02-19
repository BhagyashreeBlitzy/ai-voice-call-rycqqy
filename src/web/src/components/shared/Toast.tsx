import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ToastState, uiActions } from '../../store/slices/uiSlice';
import { THEME_COLORS } from '../../constants/theme.constants';

/**
 * Props interface for the Toast component
 */
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
  onClose?: () => void;
}

/**
 * Custom hook to handle automatic toast dismissal
 * @param duration - Duration in milliseconds before auto-dismissal
 */
const useToastAutoHide = (duration: number) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Validate duration is within acceptable range
    const validDuration = Math.min(Math.max(duration, 2000), 10000);
    
    const timer = setTimeout(() => {
      dispatch(uiActions.hideToast());
    }, validDuration);

    // Cleanup timer on unmount
    return () => clearTimeout(timer);
  }, [duration, dispatch]);
};

/**
 * Generate Material Design compliant styles for toast based on type
 * @param type - Toast type (success, error, info, warning)
 */
const getToastStyles = (type: ToastProps['type']): React.CSSProperties => {
  const color = THEME_COLORS[type].main;
  const backgroundColor = THEME_COLORS[type].light;
  const contrastText = THEME_COLORS[type].contrastText;

  return {
    position: 'fixed',
    bottom: '24px', // 3 * SPACING_UNIT
    left: '50%',
    transform: 'translateX(-50%)',
    minWidth: '320px',
    maxWidth: '80vw',
    padding: '16px', // 2 * SPACING_UNIT
    borderRadius: '4px',
    backgroundColor,
    color: contrastText,
    boxShadow: '0 3px 5px -1px rgba(0,0,0,0.2), 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    animation: 'toast-slide-up 0.3s ease-out',
    border: `1px solid ${color}`,
    fontSize: '14px',
    lineHeight: '1.5',
    '@media (max-width: 768px)': {
      minWidth: '90vw',
      bottom: '16px',
    }
  };
};

/**
 * Material Design toast notification component with accessibility features
 * @param props - Toast component props
 */
const Toast: React.FC<ToastProps> = React.memo(({ message, type, duration, onClose }) => {
  useToastAutoHide(duration);
  const dispatch = useDispatch();

  const handleClose = () => {
    dispatch(uiActions.hideToast());
    onClose?.();
  };

  // Get icon based on toast type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return null;
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      style={getToastStyles(type)}
      className="toast"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span aria-hidden="true" style={{ fontSize: '20px' }}>
          {getIcon()}
        </span>
        <span>{message}</span>
      </div>
      <button
        onClick={handleClose}
        aria-label="Close notification"
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '4px',
          marginLeft: '16px',
          opacity: 0.7,
          transition: 'opacity 0.2s',
          ':hover': {
            opacity: 1
          }
        }}
      >
        ✕
      </button>
      <style>
        {`
          @keyframes toast-slide-up {
            from {
              transform: translateX(-50%) translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }
          
          .toast {
            transition: transform 0.3s ease-out, opacity 0.3s ease-out;
          }
          
          .toast:focus-within {
            outline: 2px solid ${THEME_COLORS[type].main};
            outline-offset: 2px;
          }
          
          @media (prefers-reduced-motion: reduce) {
            .toast {
              animation: none;
              transition: none;
            }
          }
        `}
      </style>
    </div>
  );
});

Toast.displayName = 'Toast';

export default Toast;