'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFeatureToggles, FeatureName } from '@/contexts/FeatureToggleContext';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface FeatureGateProps {
  featureName: FeatureName;
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export default function FeatureGate({
  featureName,
  children,
  fallback,
  redirectTo = '/dashboard',
}: FeatureGateProps) {
  const { isFeatureEnabled, isLoading } = useFeatureToggles();
  const router = useRouter();
  const { t } = useTranslation();

  const isEnabled = isFeatureEnabled(featureName);

  useEffect(() => {
    if (!isLoading && !isEnabled && redirectTo) {
      router.push(redirectTo);
    }
  }, [isLoading, isEnabled, redirectTo, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            {t('common.loading', { defaultValue: 'Loading...' })}
          </p>
        </div>
      </div>
    );
  }

  if (!isEnabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('featureGate.unavailable', { defaultValue: 'Feature Unavailable' })}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('featureGate.disabled', {
              defaultValue: 'This feature is currently disabled. Please contact your administrator.',
            })}
          </p>
          <Button onClick={() => router.push(redirectTo)} className="w-full">
            {t('featureGate.goBack', { defaultValue: 'Go to Dashboard' })}
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
