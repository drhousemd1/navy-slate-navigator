
import React from 'react';

export interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

export default function WeeklySummaryTiles() {
  const metrics: WeeklyMetricsSummary = {
    tasksCompleted: 2,
    rulesBroken: 0,
    rewardsRedeemed: 1,
    punishments: 3,
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between bg-slate-800 p-3 rounded-md text-white">
        <span className="text-cyan-400">Tasks Completed:</span>
        <span>{metrics.tasksCompleted}</span>
      </div>
      <div className="flex justify-between bg-slate-800 p-3 rounded-md text-white">
        <span className="text-orange-400">Rules Broken:</span>
        <span>{metrics.rulesBroken}</span>
      </div>
      <div className="flex justify-between bg-slate-800 p-3 rounded-md text-white">
        <span className="text-purple-400">Rewards Redeemed:</span>
        <span>{metrics.rewardsRedeemed}</span>
      </div>
      <div className="flex justify-between bg-slate-800 p-3 rounded-md text-white">
        <span className="text-red-400">Punishments:</span>
        <span>{metrics.punishments}</span>
      </div>
    </div>
  );
}
