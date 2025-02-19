import React, { useContext, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useSelector } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { ThemeContext } from '../../theme/themeProvider';

// Constants for layout dimensions and breakpoints
const SIDEBAR_WIDTH = 280;
const HEADER_HEIGHT = 64;
const BREAKPOINTS = {
  xs: 320,
  sm: 768,
  md: 1024,
  lg: 1440
};
const TRANSITION_DURATION = 300;

// Styled components with theme-aware styling
const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--background-default);
  color: var(--text-primary);
  transition: background-color ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
`;

const MainContent = styled.main<{ sidebarOpen: boolean; isMobile: boolean }>`
  flex: 1;
  min-width: 0;
  margin-left: ${({ sidebarOpen, isMobile }) => 
    !isMobile && sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0'};
  padding-top: ${HEADER_HEIGHT}px;
  transition: margin-left ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: ${BREAKPOINTS.sm}px) {
    margin-left: 0;
    width: 100%;
  }
`;

const ContentWrapper = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: calc(100vh - ${HEADER_HEIGHT}px);

  @media (max-width: ${BREAKPOINTS.sm}px) {
    padding: 16px;
  }
`;

// Props interface
interface MainLayoutProps {
  children: React.ReactNode;
}

// Custom hook for responsive layout
const useResponsiveLayout = () => {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.sm}px)`);
  const isTablet = useMediaQuery(`(max-width: ${BREAKPOINTS.md}px)`);
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);

  return {
    isMobile,
    isTablet,
    isDesktop,
    sidebarMode: isDesktop ? 'persistent' : 'drawer'
  };
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { currentTheme } = useContext(ThemeContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile, sidebarMode } = useResponsiveLayout();
  const isAuthenticated = useSelector((state: any) => state.user.isAuthenticated);

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setSidebarOpen(prev => !prev);
  };

  // Handle sidebar close
  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      handleSidebarClose();
    }
  }, [isMobile, location]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sidebarOpen) {
        handleSidebarClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [sidebarOpen]);

  return (
    <ErrorBoundary>
      <LayoutContainer>
        {isAuthenticated && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={handleSidebarClose}
            mode={sidebarMode}
            aria-label="Main navigation sidebar"
          />
        )}
        
        <MainContent
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
          role="main"
          aria-label="Main content"
        >
          <Header
            title="AI Voice Agent"
            onMenuClick={isAuthenticated ? handleSidebarToggle : undefined}
          />
          
          <ContentWrapper>
            {children}
          </ContentWrapper>
        </MainContent>
      </LayoutContainer>
    </ErrorBoundary>
  );
};

// Type definitions for better TypeScript support
export interface MainLayoutProps {
  children: React.ReactNode;
}

export default MainLayout;