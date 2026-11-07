
import React from 'react';
import PointsBubbles from '../common/PointsBubbles';

const RulesHeader: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">Rules</h1>
      <PointsBubbles />
    </div>
  );
};

export default RulesHeader;
