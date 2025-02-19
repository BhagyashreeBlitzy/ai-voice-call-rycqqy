import React, { useContext, useState, useCallback } from 'react';
import styled from '@emotion/styled';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeContext, ThemeMode } from '../../theme/themeProvider';
import { Button } from '../shared/Button';
import { logoutUser } from '../../store/slices/userSlice';

// Constants for styling and animations
const HEADER_HEIGHT = 64;
const MOBILE_BREAKPOINT = 768;
const THEME_TRANSITION_DURATION = 300;

// Styled components with theme-aware styling
const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: ${HEADER_HEIGHT}px;
  background-color: var(--background-paper);
  color: var(--text-primary);
  box-shadow: ${({ theme }) => theme.shadows.sm};
  z-index: ${({ theme }) => theme.zIndex.header};
  transition: all ${THEME_TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;

  @media (max-width: ${MOBILE_BREAKPOINT}px) {
    padding: 0 16px;
  }
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
  color: var(--text-primary);

  @media (max-width: ${MOBILE_BREAKPOINT}px) {
    font-size: 1.125rem;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ThemeToggle = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background-color: var(--action-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-main);
    outline-offset: 2px;
  }
`;

const MenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--text-primary);

  @media (max-width: ${MOBILE_BREAKPOINT}px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

// Header Props Interface
export interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenuClick }) => {
  const dispatch = useDispatch();
  const { currentTheme, setTheme } = useContext(ThemeContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Theme toggle handler with system preference awareness
  const handleThemeToggle = useCallback(() => {
    const newTheme = currentTheme === ThemeMode.LIGHT ? ThemeMode.DARK : ThemeMode.LIGHT;
    setTheme(newTheme);
    localStorage.setItem('theme-preference', newTheme);
  }, [currentTheme, setTheme]);

  // Logout handler with loading state
  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      await dispatch(logoutUser());
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [dispatch]);

  return (
    <HeaderContainer role="banner">
      <LogoSection>
        <MenuButton
          onClick={onMenuClick}
          aria-label="Open menu"
          aria-expanded="false"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </MenuButton>
        <Title>{title}</Title>
      </LogoSection>

      <Actions>
        <ThemeToggle
          onClick={handleThemeToggle}
          aria-label={`Switch to ${currentTheme === ThemeMode.LIGHT ? 'dark' : 'light'} theme`}
        >
          {currentTheme === ThemeMode.LIGHT ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
            </svg>
          )}
        </ThemeToggle>

        <Button
          variant="outlined"
          size="small"
          onClick={handleLogout}
          loading={isLoggingOut}
          ariaLabel="Logout"
        >
          Logout
        </Button>
      </Actions>
    </HeaderContainer>
  );
};

export default Header;