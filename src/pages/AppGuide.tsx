import React from 'react';
import AppLayout from '../components/AppLayout';

const AppGuidePage: React.FC = () => {
  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">App Guide</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            This page is ready for new content. Let's build something great!
          </p>
        </div>
        {/* Content for the App Guide will go here */}
      </div>
    </AppLayout>
  );
};

export default AppGuidePage;
