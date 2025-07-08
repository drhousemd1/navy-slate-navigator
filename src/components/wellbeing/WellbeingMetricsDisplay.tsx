import React from 'react';
import { WellbeingSnapshot } from '@/data/wellbeing/types';
import { transformMetricsForDisplay, getSliderColors } from '@/lib/wellbeingUtils';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WellbeingMetricsDisplayProps {
  selectedDate: string | null;
  wellbeingData: WellbeingSnapshot | null;
  isLoading?: boolean;
  onClear: () => void;
}

const WellbeingMetricsDisplay: React.FC<WellbeingMetricsDisplayProps> = ({
  selectedDate,
  wellbeingData,
  isLoading = false,
  onClear
}) => {
  if (!selectedDate) {
    return (
      <div className="mt-4 p-4 bg-navy border border-light-navy rounded-lg">
        <p className="text-center text-nav-inactive text-sm">
          Click on a chart point to view detailed wellness metrics
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-navy border border-light-navy rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">
            {format(parseISO(selectedDate), 'EEEE, MMM d')}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-center text-nav-inactive">Loading wellness data...</p>
      </div>
    );
  }

  if (!wellbeingData) {
    return (
      <div className="mt-4 p-4 bg-navy border border-light-navy rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">
            {format(parseISO(selectedDate), 'EEEE, MMM d')}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-center text-nav-inactive">No wellness data available for this date</p>
      </div>
    );
  }

  const metricsDisplay = transformMetricsForDisplay(wellbeingData.metrics);

  return (
    <div className="mt-4 p-4 bg-navy border border-light-navy rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">
            {format(parseISO(selectedDate), 'EEEE, MMM d')}
          </h3>
          <p className="text-sm text-nav-inactive">
            Overall Score: <span className="text-white font-medium">{wellbeingData.overall_score}/100</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
        {metricsDisplay.map((metric) => {
          const colors = getSliderColors(metric.value, metric.key);
          return (
            <div key={metric.key} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white font-medium">{metric.label}</span>
                <span className="text-sm text-nav-inactive">{metric.value}%</span>
              </div>
              <div className="relative">
                <div 
                  className="w-full h-2 rounded-full overflow-hidden transition-all duration-300"
                  style={{ backgroundColor: colors.backgroundColor }}
                >
                  <div 
                    className="h-full transition-all duration-500 ease-out rounded-full"
                    style={{ 
                      width: `${metric.value}%`,
                      backgroundColor: colors.fillColor
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-light-navy">
        <p className="text-xs text-nav-inactive text-center">
          Last updated: {new Date(wellbeingData.updated_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default WellbeingMetricsDisplay;