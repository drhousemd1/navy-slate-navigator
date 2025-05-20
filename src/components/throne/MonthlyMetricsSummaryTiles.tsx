
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface MonthlyMetricsSummaryProps {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

const MonthlyMetricsSummaryTiles: React.FC<MonthlyMetricsSummaryProps> = ({ 
  tasksCompleted, 
  rulesBroken, 
  rewardsRedeemed, 
  punishments 
}) => {
  return (
    <Card className="bg-navy border border-light-navy mt-2">
      <CardContent className="pt-4 px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 px-6">
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sky-400 text-sm">Monthly Tasks:</span>
              <span className="text-sm font-bold text-white">{tasksCompleted}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-orange-500 text-sm">Monthly Rules Broken:</span>
              <span className="text-sm font-bold text-white">{rulesBroken}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-purple-400 text-sm">Monthly Rewards:</span>
              <span className="text-sm font-bold text-white">{rewardsRedeemed}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-red-400 text-sm">Monthly Punishments:</span>
              <span className="text-sm font-bold text-white">{punishments}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyMetricsSummaryTiles;
