
import React from 'react';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';

const AdminTesting = () => {
  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-6">Admin Testing Panel</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 bg-navy border border-light-navy">
            <h2 className="text-xl text-white mb-2">Feature Testing</h2>
            <p className="text-gray-300">This area is for testing new features before deploying them to all users.</p>
          </Card>
          
          <Card className="p-4 bg-navy border border-light-navy">
            <h2 className="text-xl text-white mb-2">User Management</h2>
            <p className="text-gray-300">Test user management functionality.</p>
          </Card>
          
          <Card className="p-4 bg-navy border border-light-navy">
            <h2 className="text-xl text-white mb-2">Database Operations</h2>
            <p className="text-gray-300">Test database queries and operations.</p>
          </Card>
          
          <Card className="p-4 bg-navy border border-light-navy">
            <h2 className="text-xl text-white mb-2">System Status</h2>
            <p className="text-gray-300">View system status and logs.</p>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminTesting;
