
import React from 'react';
import AppLayout from '../components/AppLayout';
import { Link } from 'react-router-dom';

const Index: React.FC = () => {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-full px-4 py-8">
        <div className="text-center p-6 animate-slide-up max-w-md">
          <h1 className="text-3xl font-semibold text-white mb-4">Welcome to Navy Slate Navigator</h1>
          <p className="text-nav-inactive mb-8">
            Select an option from the navigation bar below or use one of these quick links:
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Link to="/tasks" className="bg-navy hover:bg-light-navy text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
              View Tasks
            </Link>
            <Link to="/rewards" className="bg-navy hover:bg-light-navy text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
              View Rewards
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
