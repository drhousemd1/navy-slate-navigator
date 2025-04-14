
import React from 'react';

const RuleCardHeader = ({ icon }: { icon: string }) => {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-white text-xl">{icon}</div>
    </div>
  );
};

export default RuleCardHeader;
