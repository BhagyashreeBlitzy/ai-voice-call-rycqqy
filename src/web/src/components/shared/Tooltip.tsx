import React, { useRef, useState, useEffect, useCallback, useContext } from 'react'; // ^18.2.0
import { ThemeContext } from '../../theme/themeProvider';

// Constants for tooltip behavior
const TOOLTIP_OFFSET = 8;
const TOOLTIP_SHOW_DELAY = 200;
const TOOLTIP_HIDE_DELAY = 100;

// Tooltip placement options
type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left';

// Position interface for tooltip positioning
interface Position {
  top: number;
  left: number;
}

// Props interface for the Tooltip component
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  placement?: TooltipPlacement;
  showDelay?: number;
  hideDelay?: number;
  className?: string;
  id?: string;
}

// Calculate tooltip position based on trigger element and placement
const calculatePosition = (
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: TooltipPlacement
): Position => {
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - TOOLTIP_OFFSET;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case 'bottom':
      top = triggerRect.bottom + TOOLTIP_OFFSET;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case 'left':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.left - tooltipRect.width - TOOLTIP_OFFSET;
      break;
    case 'right':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.right + TOOLTIP_OFFSET;
      break;
  }

  // Viewport boundary checks
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  // Prevent tooltip from going outside viewport
  if (left < 0) left = TOOLTIP_OFFSET;
  if (left + tooltipRect.width > viewport.width) {
    left = viewport.width - tooltipRect.width - TOOLTIP_OFFSET;
  }
  if (top < 0) top = TOOLTIP_OFFSET;
  if (top + tooltipRect.height > viewport.height) {
    top = viewport.height - tooltipRect.height - TOOLTIP_OFFSET;
  }

  return { top, left };
};

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  placement = 'top',
  showDelay = TOOLTIP_SHOW_DELAY,
  hideDelay = TOOLTIP_HIDE_DELAY,
  className = '',
  id
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<number>();
  const hideTimeoutRef = useRef<number>();
  const { currentTheme } = useContext(ThemeContext);

  // Update tooltip position
  const updatePosition = useCallback(() => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const newPosition = calculatePosition(triggerRect, tooltipRect, placement);
      setPosition(newPosition);
    }
  }, [placement]);

  // Handle mouse enter
  const handleMouseEnter = useCallback(() => {
    window.clearTimeout(hideTimeoutRef.current);
    showTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
      // Wait for next frame to calculate position after tooltip is rendered
      requestAnimationFrame(updatePosition);
    }, showDelay);
  }, [showDelay, updatePosition]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    window.clearTimeout(showTimeoutRef.current);
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, hideDelay);
  }, [hideDelay]);

  // Handle keyboard focus events
  const handleFocus = useCallback(() => {
    handleMouseEnter();
  }, [handleMouseEnter]);

  const handleBlur = useCallback(() => {
    handleMouseLeave();
  }, [handleMouseLeave]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      window.clearTimeout(showTimeoutRef.current);
      window.clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Update position on window resize
  useEffect(() => {
    if (isVisible) {
      const handleResize = () => {
        requestAnimationFrame(updatePosition);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isVisible, updatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-describedby={id}
        role="tooltip-trigger"
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className={`tooltip ${currentTheme.toLowerCase()}`}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 1100, // Using z-index from theme constants
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '0.875rem',
            lineHeight: '1.4',
            backgroundColor: currentTheme === 'dark' ? '#424242' : '#616161',
            color: '#ffffff',
            boxShadow: currentTheme === 'dark' 
              ? '0 2px 4px rgba(0,0,0,0.3)' 
              : '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'opacity 200ms ease-in-out',
            pointerEvents: 'none',
            maxWidth: '300px',
            wordWrap: 'break-word'
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};

export default Tooltip;