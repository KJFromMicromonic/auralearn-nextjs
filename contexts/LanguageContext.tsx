'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface LanguageContextType {
  language: string;
  changeLanguage: (lang: string) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const loadLanguagePreference = useCallback(async () => {
    try {
      // First, try to get from user's profile in Supabase if logged in
      if (user?.clerk_id) {
        const { data, error } = await supabase
          .from('users')
          .select('language_preference')
          .eq('clerk_id', user.clerk_id)
          .maybeSingle();

        if (!error && data?.language_preference) {
          await i18n.changeLanguage(data.language_preference);
          localStorage.setItem('i18nextLng', data.language_preference);
          return;
        } else if (error) {
          // Log error but don't fail - gracefully fall back to localStorage
          console.warn('Could not load language preference from database:', error);
        }
      }

      // Fall back to localStorage or browser detection (handled by i18next-browser-languagedetector)
      const storedLang = localStorage.getItem('i18nextLng');
      if (storedLang) {
        await i18n.changeLanguage(storedLang);
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
      // Always fall back to localStorage on error
      const storedLang = localStorage.getItem('i18nextLng');
      if (storedLang) {
        await i18n.changeLanguage(storedLang);
      }
    }
  }, [user, i18n]);

  // Load language preference on mount
  useEffect(() => {
    loadLanguagePreference();
  }, [loadLanguagePreference]);

  const changeLanguage = async (lang: string) => {
    setIsLoading(true);
    try {
      // Change language in i18next
      await i18n.changeLanguage(lang);

      // Save to localStorage
      localStorage.setItem('i18nextLng', lang);

      // Save to Supabase if user is logged in
      if (user?.clerk_id) {
        const { error } = await supabase
          .from('users')
          .update({ language_preference: lang })
          .eq('clerk_id', user.clerk_id);

        if (error) {
          console.warn('Could not save language preference to database (will use localStorage):', error);
          // Don't throw - localStorage is already saved, so this is not critical
        }
      }
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LanguageContext.Provider value={{ language: i18n.language, changeLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
