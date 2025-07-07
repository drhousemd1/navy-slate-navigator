import React from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { WellbeingMetrics, DEFAULT_METRICS } from '@/data/wellbeing/types';
import { METRIC_DEFINITIONS } from '@/lib/wellbeingUtils';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

interface WellbeingFormProps {
  currentMetrics: WellbeingMetrics;
  wellbeingInfo: {
    score: number;
    color: string;
    colorClass: string;
    status: string;
    metrics: Array<{
      key: keyof WellbeingMetrics;
      label: string;
      value: number;
      description: string;
      isPositive: boolean;
    }>;
  };
  onSave: (metrics: WellbeingMetrics) => Promise<any>;
  isSaving: boolean;
  saveError: Error | null;
}

const WellbeingForm: React.FC<WellbeingFormProps> = ({
  currentMetrics,
  wellbeingInfo,
  onSave,
  isSaving,
  saveError
}) => {
  const form = useForm<WellbeingMetrics>({
    defaultValues: currentMetrics,
    values: currentMetrics, // Keep form in sync with current metrics
  });

  const handleSubmit = async (data: WellbeingMetrics) => {
    try {
      logger.debug('[WellbeingForm] Saving wellbeing data:', data);
      await onSave(data);
      logger.debug('[WellbeingForm] Wellbeing data saved successfully');
    } catch (error) {
      logger.error('[WellbeingForm] Error saving wellbeing data:', error);
    }
  };

  // Get all metrics as a single unified list (no grouping)
  const allMetrics = Object.entries(METRIC_DEFINITIONS)
    .map(([key, def]) => ({ key: key as keyof WellbeingMetrics, ...def }));

  return (
    <div className="space-y-6">
      {/* Overall Score Display */}
      <Card className="bg-navy border-light-navy">
        <CardHeader className="text-center">
          <CardTitle className="text-white">Current Wellbeing Status</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: wellbeingInfo.color }}
            >
              <span className="text-white font-bold text-lg">{wellbeingInfo.score}</span>
            </div>
            <div>
              <p className="text-white font-semibold">{wellbeingInfo.status}</p>
              <p className="text-gray-400 text-sm">{wellbeingInfo.score}/100</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Single Unified Metrics Card */}
          <Card className="bg-navy border-light-navy">
            <CardContent className="pt-6 space-y-6">
              {allMetrics.map((metric) => (
                <FormField
                  key={metric.key}
                  control={form.control}
                  name={metric.key}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="text-white">{metric.label}</FormLabel>
                        <Badge variant="outline" className="text-white border-gray-400">
                          {field.value}%
                        </Badge>
                      </div>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </CardContent>
          </Card>

          {/* Error Display */}
          {saveError && (
            <Card className="bg-red-900/20 border-red-500/50">
              <CardContent className="pt-6">
                <p className="text-red-400 text-sm">
                  Failed to save wellbeing data: {getErrorMessage(saveError)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-nav-active hover:bg-nav-active/80 text-white px-8 py-2"
            >
              {isSaving ? 'Saving...' : 'Update Wellbeing Status'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default WellbeingForm;