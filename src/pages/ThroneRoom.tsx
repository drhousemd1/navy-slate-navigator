import React from 'react';
import AppLayout from '../components/AppLayout';
import { ThroneRoomCard } from '@/components/throne/ThroneRoomCard';
import { defaultThroneRoomCards } from '@/components/throne/defaultThroneRoomCards'; // This will be empty, but keeping import for now
import WeeklyMetricsSummaryTiles from '@/components/throne/WeeklyMetricsSummaryTiles'; // Corrected import
import MonthlyMetricsSummaryTiles from '@/components/throne/MonthlyMetricsSummaryTiles';
import WeeklyMetricsChart from '@/components/throne/WeeklyMetricsChart';
import MonthlyMetricsChart from '@/components/throne/MonthlyMetricsChart';
import AdminSettingsCard from '@/components/throne/AdminSettingsCard';
import { useAuth } from '@/contexts/AuthContext';
import { RewardsProvider } from '@/contexts/RewardsContext';

const ThroneRoom: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === "admin@example.com"; // Replace with your actual admin check

  // Filter out cards that are only for admins if the user is not an admin
  const filteredCards = isAdmin ? defaultThroneRoomCards : defaultThroneRoomCards.filter(card => !card.adminOnly);

  return (
    <AppLayout>
      <RewardsProvider> {/* Ensure RewardsProvider wraps content needing reward context */}
        <div className="p-4 pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Summary Tiles */}
            <WeeklyMetricsSummaryTiles />
            <MonthlyMetricsSummaryTiles />
            {isAdmin && <AdminSettingsCard />}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyMetricsChart />
            <MonthlyMetricsChart />
          </div>
          
          {/* Customizable Cards Section */}
          {/* This section might need adjustment if defaultThroneRoomCards are managed elsewhere or dynamically */}
          {filteredCards.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Custom Cards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCards.map((card) => (
                  <ThroneRoomCard
                    key={card.id || card.title} // Ensure key is unique
                    title={card.title}
                    icon={card.icon}
                    value={card.value}
                    description={card.description}
                    link={card.link}
                    bgColor={card.bgColor}
                    textColor={card.textColor}
                    className={card.className}
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
