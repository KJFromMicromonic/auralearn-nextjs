'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface FeatureToggle {
  id: string;
  feature_name: string;
  is_enabled: boolean;
  description?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export type FeatureName = 'aura_voice' | 'worksheets';

interface FeatureToggleContextType {
  toggles: Map<FeatureName, boolean>;
  isFeatureEnabled: (featureName: FeatureName) => boolean;
  refreshToggles: () => Promise<void>;
  isLoading: boolean;
}

const FeatureToggleContext = createContext<FeatureToggleContextType | undefined>(undefined);

export function FeatureToggleProvider({ children }: { children: ReactNode }) {
  const [toggles, setToggles] = useState<Map<FeatureName, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchToggles = async () => {
    try {
      const response = await fetch('/api/feature-toggles');
      if (!response.ok) {
        throw new Error('Failed to fetch feature toggles');
      }

      const { toggles: fetchedToggles } = await response.json();

      const toggleMap = new Map<FeatureName, boolean>();
      fetchedToggles.forEach((toggle: FeatureToggle) => {
        toggleMap.set(toggle.feature_name as FeatureName, toggle.is_enabled);
      });

      setToggles(toggleMap);
    } catch (error) {
      console.error('Error fetching feature toggles:', error);
      // Set default values if fetch fails
      setToggles(new Map([
        ['aura_voice', true],
        ['worksheets', true],
      ]));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToggles();
  }, []);

  const isFeatureEnabled = (featureName: FeatureName): boolean => {
    return toggles.get(featureName) ?? true; // Default to enabled if not found
  };

  const refreshToggles = async () => {
    setIsLoading(true);
    await fetchToggles();
  };

  return (
    <FeatureToggleContext.Provider
      value={{
        toggles,
        isFeatureEnabled,
        refreshToggles,
        isLoading,
      }}
    >
      {children}
    </FeatureToggleContext.Provider>
  );
}

export function useFeatureToggles() {
  const context = useContext(FeatureToggleContext);
  if (context === undefined) {
    throw new Error('useFeatureToggles must be used within a FeatureToggleProvider');
  }
  return context;
}
