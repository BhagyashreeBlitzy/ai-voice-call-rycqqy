import React, { useContext, useCallback, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { useDispatch, useSelector } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { ThemeContext, ThemeMode } from '../../theme/themeProvider';
import { Button } from '../shared/Button';
import { uiActions } from '../../store/slices/uiSlice';

// Breakpoints from theme constants
const BREAKPOINTS = {
  mobile: '320px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1440px'
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'drawer' | 'overlay' | 'persistent';
  'aria-label'?: string;
}

// Styled components with theme-aware styling
const SidebarContainer = styled.aside<{ isOpen: boolean; mode: string }>`
  position: ${({ mode }) => (mode === 'persistent' ? 'relative' : 'fixed')};
  top: 0;
  left: 0;
  height: 100vh;
  width: 280px;
  background-color: var(--background-paper);
  box-shadow: ${({ mode }) => 
    mode === 'persistent' ? 'none' : 'var(--shadow-md)'};
  transform: translateX(${({ isOpen }) => (isOpen ? '0' : '-100%')});
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: var(--z-index-drawer);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-primary-main) transparent;

  @media (max-width: ${BREAKPOINTS.tablet}) {
    width: 100%;
    max-width: 320px;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-main);
    outline-offset: -2px;
  }

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--color-primary-main);
    border-radius: 3px;
  }
`;

const Overlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: ${({ isOpen }) => (isOpen ? 1 : 0)};
  visibility: ${({ isOpen }) => (isOpen ? 'visible' : 'hidden')};
  transition: opacity 0.3s ease, visibility 0.3s ease;
  z-index: var(--z-index-overlay);
`;

const SidebarHeader = styled.div`
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--divider);
`;

const SidebarContent = styled.div`
  flex: 1;
  padding: var(--spacing-md);
`;

const SidebarFooter = styled.div`
  padding: var(--spacing-md);
  border-top: 1px solid var(--divider);
`;

const ThemeToggle = styled(Button)`
  width: 100%;
  margin-top: var(--spacing-sm);
`;

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  mode = 'drawer',
  'aria-label': ariaLabel = 'Application sidebar'
}) => {
  const dispatch = useDispatch();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { currentTheme, setTheme } = useContext(ThemeContext);
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.desktop})`);

  // Handle keyboard navigation within sidebar
  const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }

    if (event.key === 'Tab') {
      const focusableElements = sidebarRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [onClose]);

  // Handle theme toggle
  const handleThemeToggle = useCallback(() => {
    const newTheme = currentTheme === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK;
    setTheme(newTheme);
  }, [currentTheme, setTheme]);

  // Focus management
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      const firstFocusable = sidebarRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }
  }, [isOpen]);

  // Update sidebar mode based on screen size
  useEffect(() => {
    dispatch(uiActions.setSidebarMode(isDesktop ? 'persistent' : 'drawer'));
  }, [isDesktop, dispatch]);

  return (
    <>
      {mode !== 'persistent' && (
        <Overlay
          isOpen={isOpen}
          onClick={onClose}
          aria-hidden="true"
          data-testid="sidebar-overlay"
        />
      )}
      <SidebarContainer
        ref={sidebarRef}
        isOpen={isOpen}
        mode={mode}
        role="complementary"
        aria-label={ariaLabel}
        onKeyDown={handleKeyboardNavigation}
        tabIndex={-1}
        data-testid="sidebar"
      >
        <SidebarHeader>
          <h2 className="sr-only">Sidebar Navigation</h2>
          {mode !== 'persistent' && (
            <Button
              variant="text"
              aria-label="Close sidebar"
              onClick={onClose}
              dataTestId="close-sidebar"
            >
              ✕
            </Button>
          )}
        </SidebarHeader>

        <SidebarContent>
          <nav aria-label="Main navigation">
            {/* Navigation items would go here */}
          </nav>
        </SidebarContent>

        <SidebarFooter>
          <ThemeToggle
            variant="outlined"
            onClick={handleThemeToggle}
            aria-label={`Switch to ${currentTheme === ThemeMode.DARK ? 'light' : 'dark'} theme`}
            dataTestId="theme-toggle"
          >
            {currentTheme === ThemeMode.DARK ? 'Light Mode' : 'Dark Mode'}
          </ThemeToggle>
        </SidebarFooter>
      </SidebarContainer>
    </>
  );
};

export default React.memo(Sidebar);