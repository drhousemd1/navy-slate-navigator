import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';
import { useColorScheme } from '@/contexts/ColorSchemeContext';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useWeeklyMetricsSummary } from '@/data/queries/useWeeklyMetricsSummary';
import { useMonthlyMetrics } from '@/data/queries/metrics/useMonthlyMetrics';
import { ActivityMetricsError } from './ActivityMetricsNotice';

interface UnifiedMetricsTilesProps {
  isMonthlyView: boolean;
}

const UnifiedMetricsTiles: React.FC<UnifiedMetricsTilesProps> = ({ isMonthlyView }) => {
  const text = useCoreTextClasses();
  const light = useColorScheme().currentScheme === 'light-turquoise';
  const weekly = useWeeklyMetricsSummary({ enabled: !isMonthlyView });
  const monthly = useMonthlyMetrics({ enabled: isMonthlyView });
  const selected = isMonthlyView ? monthly : weekly;
  if (selected.error) return <Card className="bg-navy border border-light-navy"><ActivityMetricsError error={selected.error} retry={selected.refetch} /></Card>;
  if (selected.isLoading || !selected.data) return <Card className="bg-navy border border-light-navy"><p role="status" className={`p-6 ${light ? 'text-foreground' : 'text-nav-inactive'}`}>Loading activity totals…</p></Card>;

  const displayData = isMonthlyView 
    ? monthly.data.monthlyTotals
    : weekly.data;

  return (
    <Card className="bg-navy border border-light-navy">
      <CardContent className="pt-4 px-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 px-6">
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sky-400 text-sm">
                Sub Tasks Completed:
              </span>
              <span className={`text-sm font-bold ${text.primary}`}>{displayData.subTasksCompleted}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-red-400 text-sm">
                Dom Tasks Completed:
              </span>
              <span className={`text-sm font-bold ${text.primary}`}>{displayData.domTasksCompleted}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-orange-500 text-sm">
                Rules Broken:
              </span>
              <span className={`text-sm font-bold ${text.primary}`}>{displayData.rulesBroken}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-purple-400 text-sm">
                Sub Rewards Redeemed:
              </span>
              <span className={`text-sm font-bold ${text.primary}`}>{displayData.subRewardsRedeemed}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-pink-400 text-sm">
                Dom Rewards Redeemed:
              </span>
              <span className={`text-sm font-bold ${text.primary}`}>{displayData.domRewardsRedeemed}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-red-500 text-sm">
                Punishments Performed:
              </span>
              <span className={`text-sm font-bold ${text.primary}`}>{displayData.punishmentsPerformed}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedMetricsTiles;
