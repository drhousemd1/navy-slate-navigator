
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
import FrequencyTracker from '@/components/task/FrequencyTracker';
import PriorityBadge from '@/components/task/PriorityBadge';
import PointsBadge from '@/components/task/PointsBadge';
import TaskIcon from '@/components/task/TaskIcon';

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
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [nextImage, setNextImage] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [initializedImages, setInitializedImages] = useState(false);

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
      
      let validImages: string[] = [];
      
      if (Array.isArray(savedCard.background_images)) {
        validImages = savedCard.background_images.filter(Boolean);
        console.log("Setting carousel images from background_images array:", validImages);
      } else if (typeof savedCard.background_image_url === 'string') {
        console.log("Setting carousel images from background_image_url:", savedCard.background_image_url);
        validImages = [savedCard.background_image_url];
      }
      
      if (validImages.length > 0) {
        setCarouselImages(validImages);
        // Initialize both images to the first image on load for smooth first transition
        const firstImage = validImages[0];
        setCurrentImage(firstImage);
        setNextImage(firstImage);
        setInitializedImages(true);
      }
    }
  }, [id, title, description, priority]);

  useEffect(() => {
    if (carouselImages.length === 0) return;
    
    // Skip if images haven't been initialized yet
    if (!initializedImages) return;
    
    const imageIndex = globalCarouselIndex % carouselImages.length;
    const newImage = carouselImages[imageIndex];
    
    if (newImage !== currentImage) {
      setNextImage(newImage);
      setIsCrossfading(true);
      
      const timer = setTimeout(() => {
        setCurrentImage(newImage);
        setIsCrossfading(false);
      }, 700); // Match the duration in the CSS transition
      
      return () => clearTimeout(timer);
    }
  }, [globalCarouselIndex, carouselImages, currentImage, initializedImages]);

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
    
    let validImages: string[] = [];
    
    if (Array.isArray(updatedData.background_images)) {
      validImages = updatedData.background_images.filter(Boolean);
      console.log("Setting carousel images from updatedData.background_images:", validImages);
    } else if (typeof updatedData.background_image_url === 'string') {
      console.log("Setting carousel images from updatedData.background_image_url:", updatedData.background_image_url);
      validImages = [updatedData.background_image_url];
    }
    
    if (validImages.length > 0) {
      setCarouselImages(validImages);
      
      // Initialize both current and next to the first image for smooth transitions
      const firstImage = validImages[0];
      setCurrentImage(firstImage);
      setNextImage(firstImage);
      setIsCrossfading(false);
      setInitializedImages(true);
    } else {
      console.log("No valid image sources found, clearing carousel images");
      setCarouselImages([]);
      setCurrentImage(null);
      setNextImage(null);
      setInitializedImages(false);
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

  const usageData = [1, 0, 1, 0, 0, 0, 0];

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
        {currentImage && (
          <div 
            className="absolute inset-0 w-full h-full z-0 transition-opacity duration-700"
            style={{
              backgroundImage: `url(${currentImage})`,
              backgroundSize: 'cover',
              backgroundPosition: `${cardData.focal_point_x || 50}% ${cardData.focal_point_y || 50}%`,
              opacity: isCrossfading ? 0 : (cardData.background_opacity || 100) / 100,
            }}
          />
        )}
        
        {nextImage && (
          <div 
            className="absolute inset-0 w-full h-full z-1 transition-opacity duration-700"
            style={{
              backgroundImage: `url(${nextImage})`,
              backgroundSize: 'cover',
              backgroundPosition: `${cardData.focal_point_x || 50}% ${cardData.focal_point_y || 50}%`,
              opacity: isCrossfading ? (cardData.background_opacity || 100) / 100 : 0,
            }}
          />
        )}

        <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
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
    }, 60000); // Refresh every minute
    
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
