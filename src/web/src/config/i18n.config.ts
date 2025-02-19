// i18next v23.5.0
import i18n from 'i18next';
// react-i18next v13.2.0
import { initReactI18next } from 'react-i18next';
// i18next-browser-languagedetector v7.1.0
import LanguageDetector from 'i18next-browser-languagedetector';
// i18next-http-backend v2.2.0
import HttpBackend from 'i18next-http-backend';

import { LanguageSettings } from '../types/settings.types';

// Global constants for i18n configuration
const DEFAULT_LANGUAGE = 'en';
const FALLBACK_LANGUAGE = 'en';
const RTL_LANGUAGES = ['ar', 'he', 'fa'];
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Enhanced i18next configuration object with RTL and performance settings
 */
export const i18nConfig = {
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: ['en', 'es', 'fr', 'de', 'ar', 'he', 'fa', 'zh', 'ja', 'ko'],
  defaultNS: 'common',
  ns: ['common', 'errors', 'settings'],
  defaultNS: 'common',
  rtlLanguages: RTL_LANGUAGES,
  interpolation: {
    escapeValue: false
  },
  detection: {
    order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
    lookupQuerystring: 'lng',
    lookupLocalStorage: 'i18nextLng',
    caches: ['localStorage']
  },
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    allowMultiLoading: true,
    crossDomain: false,
    withCredentials: false,
    overrideMimeType: false,
    requestOptions: {
      cache: 'default',
      mode: 'cors'
    }
  },
  cacheConfig: {
    enabled: true,
    expirationTime: CACHE_EXPIRATION,
    version: '1.0'
  }
} as const;

/**
 * Loads and caches language resources for a specific locale with error handling
 * @param locale - Target language code
 * @returns Promise resolving to translation resources
 */
async function getLanguageResources(locale: string): Promise<Record<string, any>> {
  const cacheKey = `i18n_cache_${locale}`;
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData) {
    try {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_EXPIRATION) {
        return data;
      }
    } catch (error) {
      console.warn('Error parsing cached translations:', error);
    }
  }

  try {
    const resources = await Promise.all([
      HttpBackend.read(locale, 'common', i18nConfig.backend),
      HttpBackend.read(locale, 'errors', i18nConfig.backend),
      HttpBackend.read(locale, 'settings', i18nConfig.backend)
    ]);

    const combinedResources = {
      common: resources[0],
      errors: resources[1],
      settings: resources[2]
    };

    // Cache the loaded resources
    localStorage.setItem(cacheKey, JSON.stringify({
      data: combinedResources,
      timestamp: Date.now()
    }));

    return combinedResources;
  } catch (error) {
    console.error(`Error loading translations for ${locale}:`, error);
    // Fallback to default language if loading fails
    return getLanguageResources(FALLBACK_LANGUAGE);
  }
}

/**
 * Initializes i18next with enhanced configuration including RTL support
 * and performance optimizations
 * @param settings - Language settings from application configuration
 * @returns Initialized i18next instance
 */
export async function initializeI18n(settings: LanguageSettings): Promise<typeof i18n> {
  const targetLanguage = settings.useSystemLanguage
    ? navigator.language
    : settings.primaryLanguage || DEFAULT_LANGUAGE;

  await i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      ...i18nConfig,
      lng: targetLanguage,
      fallbackLng: FALLBACK_LANGUAGE,
      load: 'currentOnly',
      preload: [targetLanguage, FALLBACK_LANGUAGE],
      
      // Enhanced RTL support
      dir: () => {
        const language = i18n.language || targetLanguage;
        return RTL_LANGUAGES.includes(language.split('-')[0]) ? 'rtl' : 'ltr';
      },

      // Performance optimizations
      partialBundledLanguages: true,
      saveMissing: false,
      updateMissing: false,
      parseMissingKeyHandler: (key) => `${key}`,

      // Error handling
      returnNull: false,
      returnEmptyString: false,
      returnObjects: true,
      
      // Debug settings (disabled in production)
      debug: process.env.NODE_ENV === 'development',
      
      react: {
        useSuspense: true,
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
        transEmptyNodeValue: '',
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
        skipTranslationOnMissingKey: false
      }
    });

  // Load resources for the target language
  const resources = await getLanguageResources(targetLanguage);
  i18n.addResourceBundle(targetLanguage, 'common', resources.common, true, true);
  i18n.addResourceBundle(targetLanguage, 'errors', resources.errors, true, true);
  i18n.addResourceBundle(targetLanguage, 'settings', resources.settings, true, true);

  return i18n;
}