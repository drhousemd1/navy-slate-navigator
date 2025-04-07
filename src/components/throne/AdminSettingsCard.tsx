
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { InfoIcon, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';

const AdminSettingsCard: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);

  return (
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
  );
};

export default AdminSettingsCard;
