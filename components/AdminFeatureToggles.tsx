'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Shield, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useFeatureToggles, FeatureName } from '@/contexts/FeatureToggleContext';

interface FeatureToggleItem {
  name: FeatureName;
  label: string;
  description: string;
}

export default function AdminFeatureToggles() {
  const { t } = useTranslation();
  const { toggles, refreshToggles, isLoading: contextLoading } = useFeatureToggles();
  const [isSaving, setIsSaving] = useState<Record<FeatureName, boolean>>({
    aura_voice: false,
    worksheets: false,
  });

  const features: FeatureToggleItem[] = [
    {
      name: 'aura_voice',
      label: 'AuraVoice',
      description: t('settings.features.auraVoiceDescription', {
        defaultValue: 'Enable or disable the AuraVoice cognitive assessment feature for all users',
      }),
    },
    {
      name: 'worksheets',
      label: t('navigation.worksheets', { defaultValue: 'Worksheets' }),
      description: t('settings.features.worksheetsDescription', {
        defaultValue: 'Enable or disable the Worksheets generation feature for all users',
      }),
    },
  ];

  const handleToggle = async (featureName: FeatureName, newValue: boolean) => {
    setIsSaving((prev) => ({ ...prev, [featureName]: true }));

    try {
      const response = await fetch('/api/feature-toggles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature_name: featureName,
          is_enabled: newValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update feature toggle');
      }

      await refreshToggles();
      toast.success(
        t('settings.features.updateSuccess', {
          defaultValue: `${featureName === 'aura_voice' ? 'AuraVoice' : 'Worksheets'} has been ${newValue ? 'enabled' : 'disabled'}`,
        })
      );
    } catch (error) {
      console.error('Error updating feature toggle:', error);
      toast.error(
        t('settings.features.updateError', {
          defaultValue: 'Failed to update feature toggle. Please try again.',
        })
      );
    } finally {
      setIsSaving((prev) => ({ ...prev, [featureName]: false }));
    }
  };

  return (
    <Card className="p-8 rounded-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t('settings.features.title', { defaultValue: 'Feature Management' })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('settings.features.subtitle', {
              defaultValue: 'Control which features are available to all users',
            })}
          </p>
        </div>
      </div>

      {contextLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {features.map((feature) => {
            const isEnabled = toggles.get(feature.name) ?? true;
            const isUpdating = isSaving[feature.name];

            return (
              <div
                key={feature.name}
                className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-background/50"
              >
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={`toggle-${feature.name}`}
                    className="text-base font-semibold cursor-pointer"
                  >
                    {feature.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  <Switch
                    id={`toggle-${feature.name}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggle(feature.name, checked)}
                    disabled={isUpdating}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
