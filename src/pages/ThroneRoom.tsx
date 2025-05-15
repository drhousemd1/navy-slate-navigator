
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import ThroneRoomCard from '@/components/throne/ThroneRoomCard';
import { defaultThroneRoomCards } from '@/components/throne/defaultThroneRoomCards'; 
import WeeklyMetricsSummaryTiles from '@/components/throne/WeeklyMetricsSummaryTiles';
import MonthlyMetricsSummaryTiles from '@/components/throne/MonthlyMetricsSummaryTiles';
import WeeklyMetricsChart from '@/components/throne/WeeklyMetricsChart';
import MonthlyMetricsChart from '@/components/throne/MonthlyMetricsChart';
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import { useAuth } from '@/contexts/AuthContext';
import { RewardsProvider } from '@/contexts/RewardsContext';

const ThroneRoom: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === "admin@example.com"; // Replace with your actual admin check
  const [metricData, setMetricData] = useState({
    weekly: {
      tasksCompleted: 8,
      rulesBroken: 2,
      rewardsRedeemed: 3,
      punishments: 1
    },
    monthly: {
      tasksCompleted: 34,
      rulesBroken: 7,
      rewardsRedeemed: 12,
      punishments: 5
    }
  });

  // Filter out cards that are only for admins if the user is not an admin
  const filteredCards = isAdmin ? defaultThroneRoomCards : defaultThroneRoomCards.filter(card => !card.adminOnly);
  
  useEffect(() => {
    // Here you would normally fetch data from your API or database
    // For now we're using static data defined in state
    console.log("ThroneRoom: Would fetch metrics data here");
  }, []);

  return (
    <AppLayout>
      <RewardsProvider>
        <div className="p-4 pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Summary Tiles */}
            <WeeklyMetricsSummaryTiles 
              tasksCompleted={metricData.weekly.tasksCompleted}
              rulesBroken={metricData.weekly.rulesBroken}
              rewardsRedeemed={metricData.weekly.rewardsRedeemed}
              punishments={metricData.weekly.punishments}
            />
            <MonthlyMetricsSummaryTiles 
              tasksCompleted={metricData.monthly.tasksCompleted}
              rulesBroken={metricData.monthly.rulesBroken}
              rewardsRedeemed={metricData.monthly.rewardsRedeemed}
              punishments={metricData.monthly.punishments}
            />
            {isAdmin && <AdminSettingsCard />}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyMetricsChart />
            <MonthlyMetricsChart />
          </div>
          
          {/* Customizable Cards Section */}
          {filteredCards.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Custom Cards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCards.map((card) => (
                  <ThroneRoomCard
                    key={card.id || card.title} 
                    id={card.id || card.title}
                    title={card.title}
                    description={card.description}
                    icon={card.icon}
                    priority={card.priority || 'medium'}
                    points={card.points || 5}
                    globalCarouselIndex={0}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </RewardsProvider>
    </AppLayout>
  );
};

export default ThroneRoom;
