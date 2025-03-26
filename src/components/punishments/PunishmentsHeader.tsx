
import React from 'react';
import { Badge } from '../ui/badge';
import { useRewards } from '../../contexts/RewardsContext';
import { Settings } from 'lucide-react';

const PunishmentsHeader: React.FC = () => {
  const { totalPoints } = useRewards();

  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-semibold text-white">Punishments</h1>
      <div className="flex items-center gap-3">
        <Badge className="bg-cyan-500 text-white font-bold px-3 py-1">
          {totalPoints} Points
        </Badge>
        <Settings className="w-5 h-5 text-gray-300 cursor-pointer hover:text-cyan-500 transition-colors" />
      </div>
    </div>
  );
};

export default PunishmentsHeader;
