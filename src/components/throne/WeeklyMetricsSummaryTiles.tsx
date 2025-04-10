import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const getStartOfWeek = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust to Monday
  const start = new Date(now.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
};

const WeeklyMetricsSummaryTiles: React.FC = () => {
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [rulesBroken, setRulesBroken] = useState(0);
  const [rewardsRedeemed, setRewardsRedeemed] = useState(0);
  const [punishments, setPunishments] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      const since = getStartOfWeek();

      const tables = [
        { name: 'task_completion_history', setter: setTasksCompleted },
        { name: 'rule_violations', setter: setRulesBroken },
        { name: 'reward_usage', setter: setRewardsRedeemed },
        { name: 'punishment_history', setter: setPunishments }
      ];

      for (const { name, setter } of tables) {
        const { count, error } = await supabase
          .from(name)
          .select('*', { count: 'exact', head: true })
          .gte('created_at', since);

        if (!error && typeof count === 'number') {
          setter(count);
        } else {
          setter(0);
        }
      }
    };

    fetchCounts();
  }, []);

  return (
    <Card className="bg-navy border border-light-navy">
      <CardContent className="pt-4 px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 px-6">
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sky-400 text-sm">Tasks Completed:</span>
              <span className="text-sm font-bold text-white">{tasksCompleted}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-orange-500 text-sm">Rules Broken:</span>
              <span className="text-sm font-bold text-white">{rulesBroken}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-purple-400 text-sm">Rewards Redeemed:</span>
              <span className="text-sm font-bold text-white">{rewardsRedeemed}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-red-500 text-sm">Punishments:</span>
              <span className="text-sm font-bold text-white">{punishments}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyMetricsSummaryTiles;