
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFoundPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">Page not found</p>
      <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
    </div>
  );
};

export default NotFoundPage;
