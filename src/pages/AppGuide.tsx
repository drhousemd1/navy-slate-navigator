
import React from 'react';
import AppLayout from '../components/AppLayout'; // Corrected import path
import EditableGuide from '@/components/app-guide/EditableGuide'; // Corrected import path to use @ alias

const AppGuidePage: React.FC = () => (
  <AppLayout>
    <div className="flex flex-col h-screen p-4 md:p-8"> {/* Adjusted padding to match other pages and removed fixed h-screen to allow AppLayout to control height */}
      <header className="pb-4 border-b border-gray-300 dark:border-gray-700 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">App Guide</h1>
         <p className="text-gray-600 dark:text-gray-400">
          Document your application workflow and features here.
        </p>
      </header>
      <main className="flex-1 overflow-y-auto"> {/* Ensure main content can scroll if editor becomes very large */}
        <EditableGuide />
      </main>
    </div>
  </AppLayout>
);

export default AppGuidePage;
