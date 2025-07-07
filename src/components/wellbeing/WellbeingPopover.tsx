import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WellbeingSnapshot } from '@/data/wellbeing/types';
import { transformMetricsForDisplay, getWellbeingStatus, getSliderColors } from '@/lib/wellbeingUtils';

interface WellbeingPopoverProps {
  children: React.ReactNode;
  wellbeingData: WellbeingSnapshot | null;
  partnerNickname: string;
  isLoading?: boolean;
}

const WellbeingPopover: React.FC<WellbeingPopoverProps> = ({
  children,
  wellbeingData,
  partnerNickname,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-navy border-light-navy text-white z-[9999] shadow-lg" side="bottom" align="start">
          <div className="text-center py-4">
            <p className="text-gray-400">Loading wellbeing data...</p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (!wellbeingData) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-navy border-light-navy text-white z-[9999] shadow-lg" side="bottom" align="start">
          <div className="text-center py-4">
            <p className="text-gray-400">No wellbeing data available for {partnerNickname}</p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  const metricsDisplay = transformMetricsForDisplay(wellbeingData.metrics);
  const status = getWellbeingStatus(wellbeingData.overall_score);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-navy border-light-navy text-white z-[9999] shadow-lg" side="bottom" align="start">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">
            {partnerNickname}'s Wellbeing
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-white border-gray-400">
              {wellbeingData.overall_score}/100
            </Badge>
            <span className="text-gray-300">{status}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {metricsDisplay.map((metric) => {
              const colors = getSliderColors(metric.value, metric.key);
              return (
                <div key={metric.key} className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{metric.value}%</span>
                    <div 
                      className="w-12 h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: colors.backgroundColor }}
                    >
                      <div 
                        className="h-full transition-all duration-300"
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
          <div className="mt-4 text-xs text-gray-400 text-center border-t border-gray-600 pt-3">
            Last updated: {new Date(wellbeingData.updated_at).toLocaleString()}
          </div>
        </CardContent>
      </PopoverContent>
    </Popover>
  );
};

export default WellbeingPopover;