import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { METRIC_DEFINITIONS, getSliderColors } from '@/lib/wellbeingUtils';
import { WellbeingMetrics, DEFAULT_METRICS } from '@/data/wellbeing/types';

interface WellbeingMetricsSlidersProps {
  metrics: Partial<WellbeingMetrics> | null;
  selectedDate: string | null;
  isLoading?: boolean;
}

const WellbeingMetricsSliders: React.FC<WellbeingMetricsSlidersProps> = ({
  metrics,
  selectedDate,
  isLoading = false
}) => {
  // Get all metrics as a unified list
  const allMetrics = Object.entries(METRIC_DEFINITIONS)
    .map(([key, def]) => ({ key: key as keyof WellbeingMetrics, ...def }));

  // Use provided metrics or defaults, with grayed-out styling when no date selected
  const displayMetrics = metrics || DEFAULT_METRICS;
  const isGrayedOut = !selectedDate || !metrics;

  return (
    <Card className="bg-navy border-light-navy">
      <CardContent className="pt-6 space-y-4">
        <div className="text-center mb-4">
          <h3 className="text-white font-medium">
            {selectedDate ? `Wellness Details - ${new Date(selectedDate).toLocaleDateString()}` : 'Wellness Details'}
          </h3>
          <p className="text-sm text-nav-inactive mt-1">
            {selectedDate ? 'Showing metrics for selected date' : 'Click on a chart point to view detailed wellness breakdown'}
          </p>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            {allMetrics.map((metric) => (
              <div key={metric.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-light-navy rounded animate-pulse" />
                  <div className="h-5 w-12 bg-light-navy rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-light-navy rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {allMetrics.map((metric) => {
              const value = displayMetrics[metric.key] ?? 50;
              const colors = getSliderColors(value, metric.key);
              
              return (
                <div key={metric.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span 
                      className={`text-sm font-medium ${isGrayedOut ? 'text-nav-inactive' : 'text-white'}`}
                    >
                      {metric.label}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`${isGrayedOut ? 'text-nav-inactive border-nav-inactive' : 'text-white border-gray-400'}`}
                    >
                      {value}%
                    </Badge>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[value]}
                    onValueChange={() => {}} // Read-only
                    className="w-full"
                    disabled={true}
                    fillColor={isGrayedOut ? 'hsl(var(--nav-inactive))' : colors.fillColor}
                    backgroundColor={isGrayedOut ? 'hsl(var(--light-navy))' : colors.backgroundColor}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WellbeingMetricsSliders;