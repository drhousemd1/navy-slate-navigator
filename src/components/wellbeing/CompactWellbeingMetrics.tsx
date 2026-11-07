import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { METRIC_DEFINITIONS, getSliderColors } from '@/lib/wellbeingUtils';
import { WellbeingMetrics } from '@/data/wellbeing/types';

interface CompactWellbeingMetricsProps {
  metrics: Partial<WellbeingMetrics> | null;
  selectedDate: string | null;
  selectedUserType?: 'sub' | 'dom' | null;
  isLoading?: boolean;
}

const CompactWellbeingMetrics: React.FC<CompactWellbeingMetricsProps> = ({
  metrics,
  selectedDate,
  selectedUserType,
  isLoading = false
}) => {
  // Get all metrics as a unified list
  const allMetrics = Object.entries(METRIC_DEFINITIONS)
    .map(([key, def]) => ({ key: key as keyof WellbeingMetrics, ...def }));

  // Missing readings remain unknown; no midpoint is invented for display.
  const displayMetrics = metrics || {};
  const isGrayedOut = !selectedDate || !metrics;

  // Get user type display name and color
  const getUserTypeDisplay = () => {
    if (!selectedUserType) return null;
    return {
      name: selectedUserType === 'sub' ? 'Submissive' : 'Dominant',
      color: selectedUserType === 'sub' ? '#3B82F6' : '#EF4444'
    };
  };

  const userDisplay = getUserTypeDisplay();

  return (
    <Card className="bg-navy border-light-navy">
      <CardContent className="pt-4 space-y-4">
        {selectedDate && userDisplay && (
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: userDisplay.color }}
            />
            <span className="text-sm text-gray-300">
              {userDisplay.name} - {selectedDate}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {allMetrics.map((metric) => (
              <div key={metric.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-light-navy rounded animate-pulse" />
                  <div className="h-4 w-8 bg-light-navy rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-light-navy rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {allMetrics.map((metric) => {
              const value = displayMetrics[metric.key] ?? null;
              const colors = getSliderColors(value ?? 0, metric.key);

              return (
                <div key={metric.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium ${isGrayedOut ? 'text-nav-inactive' : 'text-gray-300'}`}
                    >
                      {metric.label}
                    </span>
                    <span className={`text-xs ${isGrayedOut ? 'text-nav-inactive' : 'text-gray-400'}`}>
                      {value === null ? 'Not recorded' : `${value}%`}
                    </span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: isGrayedOut ? 'hsl(var(--light-navy))' : colors.backgroundColor }}
                  >
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${value ?? 0}%`,
                        backgroundColor: isGrayedOut ? 'hsl(var(--nav-inactive))' : colors.fillColor
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompactWellbeingMetrics;
