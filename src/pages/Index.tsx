
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/layout/Layout';

const HomePage = () => {
  const navigate = useNavigate();
  
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-800 border-slate-700 shadow-md">
            <CardHeader>
              <CardTitle className="text-white">Tasks</CardTitle>
              <CardDescription className="text-slate-300">
                Manage your daily and weekly tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">Track your daily habits and goals with our task management system.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/tasks')} className="w-full">Go to Tasks</Button>
            </CardFooter>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700 shadow-md">
            <CardHeader>
              <CardTitle className="text-white">Rules</CardTitle>
              <CardDescription className="text-slate-300">
                Define behavioral expectations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">Create and enforce rules to guide your daily actions.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/rules')} className="w-full">Go to Rules</Button>
            </CardFooter>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700 shadow-md">
            <CardHeader>
              <CardTitle className="text-white">Rewards</CardTitle>
              <CardDescription className="text-slate-300">
                Redeem points for rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">Reward yourself by earning and spending points for completing tasks.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/rewards')} className="w-full">Go to Rewards</Button>
            </CardFooter>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700 shadow-md">
            <CardHeader>
              <CardTitle className="text-white">Punishments</CardTitle>
              <CardDescription className="text-slate-300">
                Consequences for rule breaking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">Define punishments for breaking rules to enforce accountability.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/punishments')} className="w-full">Go to Punishments</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
