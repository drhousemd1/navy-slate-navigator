import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { WeeklyMetricsChart } from '@/components/throne/WeeklyMetricsChart';
import { 
  TooltipProvider, 
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';
import { InfoIcon, ChevronDown, ChevronUp, Settings2, Skull, Crown, Swords, Award, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRewards } from '@/contexts/RewardsContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ThroneRoomEditModal, { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';
import { toast } from '@/hooks/use-toast';

const ThroneRoomCard: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  id: string;
  onDelete?: (id: string) => void;
}> = ({ title, description, icon, id, onDelete }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cardData, setCardData] = useState<ThroneRoomCardData>({
    id,
    title,
    description,
    iconName: '' // We'll keep the icon as a React node for simplicity
  });

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleSaveCard = (updatedData: ThroneRoomCardData) => {
    setCardData(updatedData);
    toast({
      title: "Card Updated",
      description: "The throne room card has been updated successfully",
    });
  };
  
  const handleDeleteCard = (id: string) => {
    if (onDelete) {
      onDelete(id);
    } else {
      toast({
        title: "Delete feature disabled",
        description: "This is a demo card and cannot be deleted",
      });
    }
  };

  return (
    <>
      <Card className="overflow-hidden border border-light-navy bg-navy">
        <div className="flex p-4">
          {/* Left side - Icon circle */}
          <div className="flex-shrink-0 mr-4">
            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center" 
                 style={{ 
                   backgroundColor: cardData.calendar_color || '#7E69AB',
                   color: cardData.icon_color || '#FFFFFF'
                 }}>
              {icon}
            </div>
          </div>
          
          {/* Right side - Content */}
          <div className="flex-1">
            {/* Top section with title and view button */}
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold" 
                  style={{ 
                    color: cardData.title_color || '#FFFFFF',
                    backgroundColor: cardData.highlight_effect ? 'rgba(245, 245, 209, 0.7)' : 'transparent',
                    padding: cardData.highlight_effect ? '0 4px' : '0',
                    borderRadius: cardData.highlight_effect ? '4px' : '0'
                  }}>
                {cardData.title}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs bg-nav-active text-white px-3 py-1 rounded-md hover:bg-opacity-80"
              >
                View
              </Button>
            </div>
            
            <p className="text-sm mt-1" 
               style={{ 
                 color: cardData.subtext_color || '#8E9196',
                 backgroundColor: cardData.highlight_effect ? 'rgba(245, 245, 209, 0.7)' : 'transparent',
                 padding: cardData.highlight_effect ? '0 4px' : '0',
                 borderRadius: cardData.highlight_effect ? '4px' : '0',
                 display: 'inline-block'
               }}>
              {cardData.description}
            </p>
            
            {/* Bottom actions section */}
            <div className="flex justify-between items-center mt-3">
              <div className="flex space-x-2 items-center">
                <span className="text-xs bg-light-navy text-nav-active px-2 py-0.5 rounded">Activity</span>
                <span className="text-xs text-orange-400">8 days ago</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-cyan-400 hover:text-cyan-300 p-1"
                onClick={handleOpenEditModal}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Edit Modal */}
      <ThroneRoomEditModal 
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        cardData={cardData}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
      />
    </>
  );
};

const throneRoomCards = [
  {
    id: "royal-duty",
    title: "Royal Duty",
    description: "Complete daily tasks before sunset.",
    icon: <Skull className="text-white w-6 h-6" />
  },
  {
    id: "kingdom-status",
    title: "Kingdom Status",
    description: "Monitor your kingdom's prosperity.",
    icon: <Crown className="text-white w-6 h-6" />
  },
  {
    id: "realm-defense",
    title: "Realm Defense",
    description: "Protect your boundaries from invaders.",
    icon: <Swords className="text-white w-6 h-6" />
  },
  {
    id: "royal-achievements",
    title: "Royal Achievements",
    description: "View your earned honors and merits.",
    icon: <Award className="text-white w-6 h-6" />
  }
];

interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesViolated: number;
  rewardsUsed: number;
  punishmentsApplied: number;
}

const ThroneRoom: React.FC = () => {
  const { isAdmin, isAuthenticated, loading, checkUserRole } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [metricsSummary, setMetricsSummary] = useState<WeeklyMetricsSummary>({
    tasksCompleted: 0,
    rulesViolated: 0,
    rewardsUsed: 0,
    punishmentsApplied: 0
  });
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const location = useLocation();
  
  const { rewards } = useRewards();

  useEffect(() => {
    console.log('Location changed or component mounted, refreshing metrics chart');
    setRefreshTrigger(prev => prev + 1);
  }, [location.pathname]);

  useEffect(() => {
    setRefreshTrigger(prev => prev + 1);
  }, [rewards]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, []);

  const handleDeleteThroneCard = (id: string) => {
    toast({
      title: "Card deleted",
      description: `Card ${id} has been deleted`,
    });
  };

  const handleMetricsDataLoaded = (summaryData: WeeklyMetricsSummary) => {
    console.log('Metrics data loaded with summary:', summaryData);
    setMetricsSummary(summaryData);
    setChartLoading(false);
  };

  return (
    <AppLayout>
      <RewardsProvider>
        <div className="p-6 space-y-6 animate-fade-in">
          <p className="text-nav-inactive">
            Welcome to your command center where you can track activities and manage your domain
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {throneRoomCards.map((card, index) => (
              <ThroneRoomCard
                key={index}
                id={card.id}
                title={card.title}
                description={card.description}
                icon={card.icon}
                onDelete={handleDeleteThroneCard}
              />
            ))}
          </div>
          
          <div className="space-y-6">
            <Card className="bg-navy border border-light-navy">
              <CardHeader className="border-b border-light-navy">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-lg">Weekly Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-0">
                <div className="w-full">
                  <WeeklyMetricsChart 
                    hideTitle={true} 
                    onDataLoaded={handleMetricsDataLoaded}
                    key={`metrics-chart-${refreshTrigger}`}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-6 px-6">
                  <div className="bg-light-navy rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sky-400 text-sm">Tasks Completed:</span>
                      <span className="text-sm font-bold text-white">{metricsSummary.tasksCompleted}</span>
                    </div>
                  </div>
                  <div className="bg-light-navy rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-orange-500 text-sm">Rules Broken:</span>
                      <span className="text-sm font-bold text-white">{metricsSummary.rulesViolated}</span>
                    </div>
                  </div>
                  <div className="bg-light-navy rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-400 text-sm">Rewards Redeemed:</span>
                      <span className="text-sm font-bold text-white">{metricsSummary.rewardsUsed}</span>
                    </div>
                  </div>
                  <div className="bg-light-navy rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 text-sm">Punishments:</span>
                      <span className="text-sm font-bold text-white">{metricsSummary.punishmentsApplied}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-navy border border-light-navy">
              <CardHeader className="border-b border-light-navy">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CardTitle className="text-white text-lg">Admin Settings</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-4 w-4 text-gray-400 ml-2 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-80">Configure global settings for your domain</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-gray-400 hover:text-white"
                  >
                    {showSettings ? <ChevronUp /> : <ChevronDown />}
                  </button>
                </div>
              </CardHeader>
              {showSettings && (
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white">Access Control</h3>
                        <p className="text-sm text-nav-inactive">Manage user roles and permissions</p>
                      </div>
                      <Settings2 className="text-cyan-400 h-5 w-5" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white">Global Rules</h3>
                        <p className="text-sm text-nav-inactive">Define system-wide rule settings</p>
                      </div>
                      <Settings2 className="text-cyan-400 h-5 w-5" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white">Notifications</h3>
                        <p className="text-sm text-nav-inactive">Configure notification preferences</p>
                      </div>
                      <Settings2 className="text-cyan-400 h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </RewardsProvider>
    </AppLayout>
  );
};

export default ThroneRoom;
