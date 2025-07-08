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
    ? monthlyData?.monthlyTotals || { subTasksCompleted: 0, domTasksCompleted: 0, rulesBroken: 0, subRewardsRedeemed: 0, domRewardsRedeemed: 0, punishmentsPerformed: 0 }
    : weeklyData || { subTasksCompleted: 0, domTasksCompleted: 0, rulesBroken: 0, subRewardsRedeemed: 0, domRewardsRedeemed: 0, punishmentsPerformed: 0 };

  return (
    <Card className="bg-navy border border-light-navy">
      <CardContent className="pt-4 px-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 px-6">
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sky-400 text-sm">
                Sub Tasks Completed:
              </span>
              <span className="text-sm font-bold text-white">{displayData.subTasksCompleted}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-red-400 text-sm">
                Dom Tasks Completed:
              </span>
              <span className="text-sm font-bold text-white">{displayData.domTasksCompleted}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-orange-500 text-sm">
                Rules Broken:
              </span>
              <span className="text-sm font-bold text-white">{displayData.rulesBroken}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-purple-400 text-sm">
                Sub Rewards Redeemed:
              </span>
              <span className="text-sm font-bold text-white">{displayData.subRewardsRedeemed}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-pink-400 text-sm">
                Dom Rewards Redeemed:
              </span>
              <span className="text-sm font-bold text-white">{displayData.domRewardsRedeemed}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-red-500 text-sm">
                Punishments Performed:
              </span>
              <span className="text-sm font-bold text-white">{displayData.punishmentsPerformed}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedMetricsTiles;