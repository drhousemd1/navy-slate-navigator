import React from 'react';
import PointsBubbles from '@/components/common/PointsBubbles';

const WellbeingHeader: React.FC = () => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Wellbeing</h1>
        <p className="text-gray-400 text-sm">Track your current emotional and physical state</p>
      </div>
      <PointsBubbles />
    </div>
  );
};

export default WellbeingHeader;