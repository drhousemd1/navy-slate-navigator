
import React from 'react';
import AppLayout from '../components/AppLayout'; // Corrected path
import EditableGuide from '../components/app-guide/EditableGuide';

const AppGuidePage: React.FC = () => (
  <AppLayout>
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold">App Guide</h1>
      </header>
      <main className="flex-1">
        <EditableGuide />
      </main>
    </div>
  </AppLayout>
);

export default AppGuidePage;
