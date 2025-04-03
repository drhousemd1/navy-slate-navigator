
import React, { useState } from 'react';
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
import { InfoIcon, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ThroneRoom: React.FC = () => {
  const { isAdmin, isAuthenticated, loading, checkUserRole } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <AppLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <p className="text-nav-inactive">
          Welcome to your command center where you can track activities and manage your domain
        </p>
        
        <div className="space-y-6">
          {/* Dashboard section - removed title and fixed spacing */}
          <Card className="bg-navy border border-light-navy">
            <CardContent className="p-6">
              {/* Weekly metrics chart with responsive container */}
              <div className="w-full">
                <WeeklyMetricsChart />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-6">
                <div className="bg-light-navy rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sky-400 text-sm">Tasks Completed:</span>
                    <span className="text-sm font-bold text-white">24</span>
                  </div>
                </div>
                <div className="bg-light-navy rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-500 text-sm">Rules Broken:</span>
                    <span className="text-sm font-bold text-white">5</span>
                  </div>
                </div>
                <div className="bg-light-navy rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-400 text-sm">Rewards Used:</span>
                    <span className="text-sm font-bold text-white">7</span>
                  </div>
                </div>
                <div className="bg-light-navy rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 text-sm">Punishments:</span>
                    <span className="text-sm font-bold text-white">3</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Settings section - keeping this dropdown toggle intact */}
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
    </AppLayout>
  );
};

export default ThroneRoom;
