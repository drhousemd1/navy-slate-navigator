
import React from 'react';
import PointsBubbles from '../common/PointsBubbles';

const RulesHeader: React.FC = () => {
  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">Rules</h1>
      <PointsBubbles />
    </div>
  );
};

export default RulesHeader;
