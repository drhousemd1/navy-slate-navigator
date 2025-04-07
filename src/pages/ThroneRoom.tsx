
import React, { useEffect, useState, useRef, useMemo } from 'react';
import AppLayout from '../components/AppLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO, startOfWeek, addDays, isSameWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../contexts/auth/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  TooltipProvider, 
  Tooltip as UITooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';
import { InfoIcon, ChevronDown, ChevronUp, Settings2, Skull, Crown, Swords, Award, Pencil } from 'lucide-react';
import { useRewards } from '@/contexts/RewardsContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ThroneRoomEditModal, { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';
import { toast } from '@/hooks/use-toast';
import FrequencyTracker from '@/components/task/FrequencyTracker';
import PriorityBadge from '@/components/task/PriorityBadge';
import PointsBadge from '@/components/task/PointsBadge';
import TaskIcon from '@/components/task/TaskIcon';

// ----------------------------------------------------------------
// Chart Color Constants
// ----------------------------------------------------------------
const COLORS = {
  tasksCompleted: '#0ea5e9',
  rulesBroken: '#f97316',
  rewardsRedeemed: '#8b5cf6',
  punishments: '#ef4444',
};

// ----------------------------------------------------------------
// Tooltip Formatter (shared by both graphs)
// ----------------------------------------------------------------
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm leading-snug text-white" style={{ background: 'transparent' }}>
        <p className="text-white font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-white" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ----------------------------------------------------------------
// Monthly Activity Chart
// ----------------------------------------------------------------
const MonthlyMetricsChart = () => {
  const chartRef = useRef<HTMLDivElement>(null);

  const activityData = [
    { date: '2025-04-01', tasksCompleted: 3, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
    { date: '2025-04-05', tasksCompleted: 2, rulesBroken: 1, rewardsRedeemed: 0, punishments: 0 },
    { date: '2025-04-10', tasksCompleted: 1, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
    { date: '2025-04-15', tasksCompleted: 4, rulesBroken: 2, rewardsRedeemed: 1, punishments: 1 },
    { date: '2025-04-20', tasksCompleted: 0, rulesBroken: 3, rewardsRedeemed: 0, punishments: 2 },
    { date: '2025-04-22', tasksCompleted: 2, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
    { date: '2025-04-25', tasksCompleted: 3, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
    { date: '2025-04-27', tasksCompleted: 2, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
  ];

  const handleClick = (data: any) => {
    const index = activityData.findIndex(d => d.date === data.activeLabel);
    if (chartRef.current) {
      const scrollAmount = index * 60 - chartRef.current.offsetWidth / 2 + 30;
      chartRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <Card className="bg-navy border border-light-navy p-4 w-full">
      <h2 className="text-xl font-semibold text-white mb-4">Monthly Activity</h2>
      <div ref={chartRef} className="overflow-x-auto overflow-y-hidden">
        <div style={{ width: `${activityData.length * 60}px`, height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activityData}
              onClick={handleClick}
              margin={{ top: 20, right: 30, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: 'white' }} />
              <YAxis tick={{ fill: 'white' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="tasksCompleted" fill={COLORS.tasksCompleted} name="Tasks Completed" />
              <Bar dataKey="rulesBroken" fill={COLORS.rulesBroken} name="Rules Broken" />
              <Bar dataKey="rewardsRedeemed" fill={COLORS.rewardsRedeemed} name="Rewards Redeemed" />
              <Bar dataKey="punishments" fill={COLORS.punishments} name="Punishments" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex justify-around mt-4 text-sm text-white whitespace-nowrap">
        <span style={{ color: COLORS.tasksCompleted }}>Tasks Completed</span>
        <span style={{ color: COLORS.rulesBroken }}>Rules Broken</span>
        <span style={{ color: COLORS.rewardsRedeemed }}>Rewards Redeemed</span>
        <span style={{ color: COLORS.punishments }}>Punishments</span>
      </div>
    </Card>
  );
};

// ----------------------------------------------------------------
// Weekly Activity Graph + Tiles (split containers)
// ----------------------------------------------------------------

interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

const WeeklyMetricsChart: React.FC<{
  hideTitle?: boolean;
  onDataLoaded?: (summaryData: WeeklyMetricsSummary) => void;
}> = ({ hideTitle = false, onDataLoaded }) => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<WeeklyMetricsSummary>({
    tasksCompleted: 0,
    rulesBroken: 0,
    rewardsRedeemed: 0,
    punishments: 0
  });

  useEffect(() => {
    const loadData = async () => {
      // Use mock data instead of fetching from Supabase
      const weeklyActivityData = [
        { name: 'Tasks Completed', value: 2 },
        { name: 'Rules Broken', value: 0 },
        { name: 'Rewards Redeemed', value: 1 },
        { name: 'Punishments', value: 3 },
      ];

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const chartData = Array.from({ length: 7 }).map((_, i) => {
        const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
        return {
          date,
          tasksCompleted: 0,
          rulesBroken: 0,
          rewardsRedeemed: 0,
          punishments: 0,
        };
      });

      // Place all activity on Wednesday (index 3)
      chartData[3] = {
        ...chartData[3],
        tasksCompleted: weeklyActivityData[0].value,
        rulesBroken: weeklyActivityData[1].value,
        rewardsRedeemed: weeklyActivityData[2].value,
        punishments: weeklyActivityData[3].value
      };

      setData(chartData);

      const total = {
        tasksCompleted: weeklyActivityData[0].value,
        rulesBroken: weeklyActivityData[1].value,
        rewardsRedeemed: weeklyActivityData[2].value,
        punishments: weeklyActivityData[3].value
      };

      setSummary(total);
      
      if (onDataLoaded) {
        onDataLoaded(total);
      }
    };

    loadData();
  }, [onDataLoaded]);

  return (
    <>
      <Card className="bg-navy border border-light-navy p-4 w-full mt-6">
        {!hideTitle && <h2 className="text-xl font-semibold text-white mb-4">Weekly Activity</h2>}
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'white' }}
              tickFormatter={(date) => format(new Date(date), 'EEE')}
            />
            <YAxis tick={{ fill: 'white' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="tasksCompleted" fill={COLORS.tasksCompleted} name="Tasks Completed" />
            <Bar dataKey="rulesBroken" fill={COLORS.rulesBroken} name="Rules Broken" />
            <Bar dataKey="rewardsRedeemed" fill={COLORS.rewardsRedeemed} name="Rewards Redeemed" />
            <Bar dataKey="punishments" fill={COLORS.punishments} name="Punishments" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="bg-navy border border-light-navy p-4 w-full mt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sky-400 text-sm">Tasks Completed:</span>
              <span className="text-sm font-bold text-white">{summary.tasksCompleted}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-orange-500 text-sm">Rules Broken:</span>
              <span className="text-sm font-bold text-white">{summary.rulesBroken}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-purple-400 text-sm">Rewards Redeemed:</span>
              <span className="text-sm font-bold text-white">{summary.rewardsRedeemed}</span>
            </div>
          </div>
          <div className="bg-light-navy rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-red-400 text-sm">Punishments:</span>
              <span className="text-sm font-bold text-white">{summary.punishments}</span>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};

// ----------------------------------------------------------------
// ThroneRoomCard Component
// ----------------------------------------------------------------
const ThroneRoomCard: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  id: string;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
  globalCarouselIndex: number;
}> = ({ title, description, icon, id, priority = 'medium', points = 5, globalCarouselIndex }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cardData, setCardData] = useState<ThroneRoomCardData>({
    id,
    title,
    description,
    iconName: '',
    icon_color: '#FFFFFF',
    title_color: '#FFFFFF',
    subtext_color: '#8E9196',
    calendar_color: '#7E69AB',
    highlight_effect: false,
    priority: priority
  });
  const [images, setImages] = useState<string[]>([]);
  const [visibleImage, setVisibleImage] = useState<string | null>(null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [usageData, setUsageData] = useState<number[]>([1, 0, 1, 0, 0, 0, 0]);

  useEffect(() => {
    const savedCards = JSON.parse(localStorage.getItem('throneRoomCards') || '[]');
    const savedCard = savedCards.find((card: ThroneRoomCardData) => card.id === id);
    
    if (savedCard) {
      console.log("Loading saved card data for", id, savedCard);
      console.log("Card background images:", {
        hasBackgroundImages: Array.isArray(savedCard.background_images),
        backgroundImagesCount: Array.isArray(savedCard.background_images) ? savedCard.background_images.length : 0,
        hasBackgroundImageUrl: Boolean(savedCard.background_image_url)
      });
      
      setCardData({
        ...savedCard,
        title: savedCard.title || title,
        description: savedCard.description || description,
        priority: savedCard.priority || priority
      });
      
      const imageArray = Array.isArray(savedCard.background_images)
        ? savedCard.background_images.filter(Boolean)
        : savedCard.background_image_url
          ? [savedCard.background_image_url]
          : [];
      
      console.log("Setting image array:", imageArray);
      setImages(imageArray);
      
      if (imageArray.length > 0) {
        setVisibleImage(imageArray[0]);
      }
      
      if (Array.isArray(savedCard.usage_data) && savedCard.usage_data.length > 0) {
        setUsageData(savedCard.usage_data);
      }
    }
  }, [id, title, description, priority]);

  useEffect(() => {
    if (!images.length || !visibleImage) return;
    
    const next = images[globalCarouselIndex % images.length];
    if (next === visibleImage) return;
    
    const preload = new Image();
    preload.src = next;
    
    preload.onload = () => {
      setTransitionImage(next);
      setIsTransitioning(false);
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsTransitioning(true);
          
          const timeout = setTimeout(() => {
            setVisibleImage(next);
            setTransitionImage(null);
            setIsTransitioning(false);
          }, 2000);
          
          return () => clearTimeout(timeout);
        }, 0);
      });
    };
  }, [globalCarouselIndex, images, visibleImage]);

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleSaveCard = (updatedData: ThroneRoomCardData) => {
    console.log("Saving updated card data:", updatedData);
    console.log("Card background images:", {
      hasBackgroundImages: Array.isArray(updatedData.background_images),
      backgroundImagesCount: Array.isArray(updatedData.background_images) ? updatedData.background_images.length : 0,
      hasBackgroundImageUrl: Boolean(updatedData.background_image_url)
    });
    
    setCardData(updatedData);
    
    const imageArray = Array.isArray(updatedData.background_images)
      ? updatedData.background_images.filter(Boolean)
      : updatedData.background_image_url
        ? [updatedData.background_image_url]
        : [];
    
    console.log("Updated image array:", imageArray);
    setImages(imageArray);
    
    if (imageArray.length > 0) {
      const firstImage = imageArray[0];
      setVisibleImage(firstImage);
    } else {
      console.log("No valid image sources found, clearing images");
      setVisibleImage(null);
      setTransitionImage(null);
    }
    
    if (Array.isArray(updatedData.usage_data) && updatedData.usage_data.length > 0) {
      setUsageData(updatedData.usage_data);
    }
    
    const savedCards = JSON.parse(localStorage.getItem('throneRoomCards') || '[]');
    const cardIndex = savedCards.findIndex((card: ThroneRoomCardData) => card.id === id);
    
    if (cardIndex >= 0) {
      savedCards[cardIndex] = updatedData;
    } else {
      savedCards.push(updatedData);
    }
    
    localStorage.setItem('throneRoomCards', JSON.stringify(savedCards));
    
    toast({
      title: "Card Updated",
      description: "The throne room card has been updated successfully",
    });
  };

  const renderCardIcon = () => {
    if (cardData.icon_url) {
      return (
        <img 
          src={cardData.icon_url} 
          alt="Card icon" 
          className="w-6 h-6 object-contain"
          style={{ color: cardData.icon_color }}
        />
      );
    } else if (cardData.iconName) {
      return (
        <TaskIcon 
          icon_name={cardData.iconName} 
          icon_color={cardData.icon_color || '#FFFFFF'}
          className="w-6 h-6"
        />
      );
    } else {
      return icon;
    }
  };

  return (
    <>
      <Card className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy">
        {visibleImage && (
          <img
            src={visibleImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-100 z-0"
            style={{ 
              transition: 'opacity 2s ease-in-out',
              objectPosition: `${cardData.focal_point_x || 50}% ${cardData.focal_point_y || 50}%`,
              opacity: (cardData.background_opacity || 100) / 100
            }}
            draggable={false}
          />
        )}

        {transitionImage && (
          <img
            src={transitionImage}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover z-10 pointer-events-none ${
              isTransitioning ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ 
              transition: 'opacity 2s ease-in-out',
              objectPosition: `${cardData.focal_point_x || 50}% ${cardData.focal_point_y || 50}%`,
              opacity: isTransitioning ? (cardData.background_opacity || 100) / 100 : 0
            }}
            draggable={false}
          />
        )}

        <div className="relative z-20 flex flex-col p-4 md:p-6 h-full">
          <div className="flex justify-between items-start mb-3">
            <PriorityBadge priority={cardData.priority || priority} />
            
            <div className="flex items-center gap-2">
              <PointsBadge points={points} />
            </div>
          </div>
          
          <div className="flex items-start mb-auto">
            <div className="mr-4 flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>
                {renderCardIcon()}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              <h3 className="text-xl font-semibold" 
                  style={{ 
                    color: cardData.title_color || '#FFFFFF',
                    backgroundColor: cardData.highlight_effect ? 'rgba(245, 245, 209, 0.7)' : 'transparent',
                    padding: cardData.highlight_effect ? '0 4px' : '0',
                    borderRadius: cardData.highlight_effect ? '4px' : '0'
                  }}>
                {cardData.title}
              </h3>
              
              <p className="text-sm mt-1" 
                 style={{ 
                   color: cardData.subtext_color || '#8E9196',
                   backgroundColor: cardData.highlight_effect ? 'rgba(245, 245, 209, 0.7)' : 'transparent',
                   padding: cardData.highlight_effect ? '0 4px' : '0',
                   borderRadius: cardData.highlight_effect ? '4px' : '0'
                 }}>
                {cardData.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <FrequencyTracker 
              frequency="weekly" 
              frequency_count={2} 
              calendar_color={cardData.calendar_color || '#7E69AB'}
              usage_data={usageData}
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenEditModal}
              className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
      
      <ThroneRoomEditModal 
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        cardData={cardData}
        onSave={handleSaveCard}
      />
    </>
  );
};

// Default cards
const defaultThroneRoomCards = [
  {
    id: "royal-duty",
    title: "Royal Duty",
    description: "Complete daily tasks before sunset.",
    icon: <Skull className="text-white w-6 h-6" />,
    priority: "medium" as const,
    points: 5
  },
  {
    id: "kingdom-status",
    title: "Kingdom Status",
    description: "Monitor your kingdom's prosperity.",
    icon: <Crown className="text-white w-6 h-6" />,
    priority: "high" as const,
    points: 10
  },
  {
    id: "realm-defense",
    title: "Realm Defense",
    description: "Protect your boundaries from invaders.",
    icon: <Swords className="text-white w-6 h-6" />,
    priority: "low" as const,
    points: 3
  },
  {
    id: "royal-achievements",
    title: "Royal Achievements",
    description: "View your earned honors and merits.",
    icon: <Award className="text-white w-6 h-6" />,
    priority: "medium" as const,
    points: 7
  }
];

// ----------------------------------------------------------------
// Main Page Render (ThroneRoom)
// ----------------------------------------------------------------
const ThroneRoom: React.FC = () => {
  const { isAdmin, isAuthenticated, loading, checkUserRole } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [metricsSummary, setMetricsSummary] = useState<WeeklyMetricsSummary>({
    tasksCompleted: 0,
    rulesBroken: 0,
    rewardsRedeemed: 0,
    punishments: 0
  });
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const location = useLocation();
  
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  const { rewards } = useRewards();

  useEffect(() => {
    const stored = parseInt(localStorage.getItem('throneRoom_carouselTimer') || '5', 10);
    const interval = setInterval(() => {
      setCarouselIndex((prev) => prev + 1);
    }, (isNaN(stored) ? 5 : stored) * 1000);
    
    return () => clearInterval(interval);
  }, []);

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
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

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
            {defaultThroneRoomCards.map((card, index) => (
              <ThroneRoomCard
                key={index}
                id={card.id}
                title={card.title}
                description={card.description}
                icon={card.icon}
                priority={card.priority}
                points={card.points}
                globalCarouselIndex={carouselIndex}
              />
            ))}
          </div>
          
          <div className="space-y-6">
            <MonthlyMetricsChart />
            
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
              </CardContent>
            </Card>
            
            <Card className="bg-navy border border-light-navy">
              <CardHeader className="border-b border-light-navy">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CardTitle className="text-white text-lg">Admin Settings</CardTitle>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-4 w-4 text-gray-400 ml-2 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-80">Configure global settings for your domain</p>
                        </TooltipContent>
                      </UITooltip>
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
