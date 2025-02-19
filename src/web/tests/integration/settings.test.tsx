import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ThemeProvider } from '../../theme/themeProvider';
import { SettingsPanel } from '../../components/settings/SettingsPanel';
import { createStore } from '../../store';
import { VoiceId } from '../../types/voice.types';
import { VOICE_SYNTHESIS_CONFIG } from '../../constants/voice.constants';
import { SUPPORTED_LANGUAGES } from '../../components/settings/LanguageSettings';

// Enhanced render function with providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = createStore(preloadedState),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  );

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
};

describe('Settings Panel Integration', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    // Mock local storage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn()
    };
    global.localStorage = localStorageMock as any;

    // Mock system color scheme
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }))
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all settings sections with proper accessibility attributes', async () => {
    renderWithProviders(<SettingsPanel onClose={mockOnClose} />);

    // Verify sections presence and accessibility
    const audioTab = screen.getByRole('tab', { name: /audio/i });
    const voiceTab = screen.getByRole('tab', { name: /voice/i });
    const languageTab = screen.getByRole('tab', { name: /language/i });

    expect(audioTab).toHaveAttribute('aria-controls', 'settings-tabpanel-0');
    expect(voiceTab).toHaveAttribute('aria-controls', 'settings-tabpanel-1');
    expect(languageTab).toHaveAttribute('aria-controls', 'settings-tabpanel-2');

    // Test keyboard navigation
    await userEvent.tab();
    expect(audioTab).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(voiceTab).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(languageTab).toHaveFocus();
  });

  it('handles theme settings with system preference', async () => {
    const { store } = renderWithProviders(<SettingsPanel onClose={mockOnClose} />);

    // Mock system dark mode preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }));

    // Verify initial theme state
    const state = store.getState();
    expect(state.settings.theme.useSystemPreference).toBe(true);

    // Toggle theme mode
    const themeSwitch = screen.getByRole('switch', { name: /theme/i });
    await userEvent.click(themeSwitch);

    await waitFor(() => {
      const updatedState = store.getState();
      expect(updatedState.settings.theme.useSystemPreference).toBe(false);
    });
  });

  it('validates and persists settings changes', async () => {
    const { store } = renderWithProviders(<SettingsPanel onClose={mockOnClose} />);

    // Navigate to Audio Settings
    await userEvent.click(screen.getByRole('tab', { name: /audio/i }));
    
    // Make invalid volume change
    const inputVolumeSlider = screen.getByRole('slider', { name: /input volume/i });
    await userEvent.type(inputVolumeSlider, '150');

    // Verify error state
    expect(screen.getByText(/invalid volume level/i)).toBeInTheDocument();

    // Make valid changes
    await userEvent.clear(inputVolumeSlider);
    await userEvent.type(inputVolumeSlider, '75');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    // Verify persistence
    await waitFor(() => {
      const state = store.getState();
      expect(state.settings.audio.inputVolume).toBe(75);
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  it('handles concurrent settings updates', async () => {
    // Render multiple instances
    const { store: store1 } = renderWithProviders(
      <SettingsPanel onClose={mockOnClose} />
    );
    const { store: store2 } = renderWithProviders(
      <SettingsPanel onClose={mockOnClose} />
    );

    // Make changes in first instance
    await userEvent.click(screen.getAllByRole('tab', { name: /voice/i })[0]);
    const voiceSelect = screen.getAllByRole('combobox', { name: /voice/i })[0];
    await userEvent.selectOptions(voiceSelect, VoiceId.FEMALE_1);

    // Verify synchronization
    await waitFor(() => {
      const state1 = store1.getState();
      const state2 = store2.getState();
      expect(state1.settings.voice.config.currentVoiceId).toBe(state2.settings.voice.config.currentVoiceId);
    });
  });

  it('validates voice settings against technical specifications', async () => {
    renderWithProviders(<SettingsPanel onClose={mockOnClose} />);

    // Navigate to Voice Settings
    await userEvent.click(screen.getByRole('tab', { name: /voice/i }));

    // Test voice rate validation
    const rateSlider = screen.getByRole('slider', { name: /speaking rate/i });
    await userEvent.type(rateSlider, String(VOICE_SYNTHESIS_CONFIG.MAX_RATE + 1));

    // Verify error handling
    expect(screen.getByText(/invalid speaking rate/i)).toBeInTheDocument();
  });

  it('handles language settings with RTL support', async () => {
    const { store } = renderWithProviders(<SettingsPanel onClose={mockOnClose} />);

    // Navigate to Language Settings
    await userEvent.click(screen.getByRole('tab', { name: /language/i }));

    // Select Arabic language
    const languageSelect = screen.getByRole('combobox', { name: /primary language/i });
    await userEvent.selectOptions(languageSelect, 'ar-SA');

    // Verify RTL enablement
    await waitFor(() => {
      const state = store.getState();
      expect(state.settings.language.rtlSupport).toBe(true);
      expect(document.documentElement.dir).toBe('rtl');
    });
  });
});