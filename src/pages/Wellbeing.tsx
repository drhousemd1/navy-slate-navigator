import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import WellbeingHeader from '@/components/wellbeing/WellbeingHeader';
import WellbeingForm from '@/components/wellbeing/WellbeingForm';
import { useWellbeingData } from '@/data/wellbeing';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';

const Wellbeing: React.FC = () => {
  const { user } = useAuth();
  const {
    wellbeingSnapshot,
    isLoading,
    error,
    getCurrentMetrics,
    getWellbeingInfo,
    saveWellbeingData,
    isSaving,
    saveError
  } = useWellbeingData();

  // Debug logging for development
  useEffect(() => {
    logger.debug('[Wellbeing] Component state:', {
      user: user?.id,
      hasSnapshot: !!wellbeingSnapshot,
      isLoading,
      error: error?.message
    });
  }, [user, wellbeingSnapshot, isLoading, error]);

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <EmptyState 
            title="Authentication Required"
            description="Please log in to access your wellbeing data."
          />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full p-4">
          <ErrorDisplay 
            title="Error Loading Wellbeing Data"
            message={error.message}
            onRetry={() => window.location.reload()}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-6 h-full overflow-y-auto">
        <WellbeingHeader />
        
        <div className="max-w-2xl mx-auto">
          <WellbeingForm
            currentMetrics={getCurrentMetrics()}
            wellbeingInfo={getWellbeingInfo()}
            onSave={saveWellbeingData}
            isSaving={isSaving}
            saveError={saveError}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Wellbeing;