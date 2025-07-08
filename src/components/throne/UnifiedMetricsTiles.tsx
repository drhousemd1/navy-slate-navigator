import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useWeeklyMetricsSummary } from '@/data/queries/useWeeklyMetricsSummary';
import { useMonthlyMetrics } from '@/data/queries/metrics/useMonthlyMetrics';

interface UnifiedMetricsTilesProps {
  isMonthlyView: boolean;
}

const UnifiedMetricsTiles: React.FC<UnifiedMetricsTilesProps> = ({ isMonthlyView }) => {
  const { data: weeklyData } = useWeeklyMetricsSummary();
  const { data: monthlyData } = useMonthlyMetrics();

  const displayData = isMonthlyView 
    ? monthlyData?.monthlyTotals || { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 }
    : weeklyData || { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 };

  const periodLabel = isMonthlyView ? 'Monthly' : '';

  return (
    <Card className="bg-navy border border-light-navy">
      <CardContent className="pt-4 px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 px-6">
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sky-400 text-sm">
                {periodLabel} Tasks{periodLabel && ' Completed'}:
              </span>
              <span className="text-sm font-bold text-white">{displayData.tasksCompleted}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-orange-500 text-sm">
                {periodLabel} Rules Broken:
              </span>
              <span className="text-sm font-bold text-white">{displayData.rulesBroken}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-purple-400 text-sm">
                {periodLabel} Rewards{periodLabel && ' Redeemed'}:
              </span>
              <span className="text-sm font-bold text-white">{displayData.rewardsRedeemed}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-red-400 text-sm">
                {periodLabel} Punishments:
              </span>
              <span className="text-sm font-bold text-white">{displayData.punishments}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedMetricsTiles;