
import React from 'react';
import { Shield } from 'lucide-react';

const RulesHeader = () => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Rules</h1>
          <p className="text-gray-400">Set boundaries and track violations</p>
        </div>
      </div>
    </div>
  );
};

export default RulesHeader;
