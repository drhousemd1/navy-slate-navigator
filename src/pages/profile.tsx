
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { useRewardsData } from '@/data/RewardsDataHandler';
import { Card } from '@/components/ui/card';
import { User, Mail, Award, Shield } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const ProfilePage = () => {
  const { user } = useAuth();
  const { userPoints, isLoadingPoints } = useRewardsData();

  if (isLoadingPoints) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info Card */}
        <Card className="bg-slate-800 border-slate-700 p-6 lg:col-span-2">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Your Profile</h2>
              <p className="text-gray-400">{user?.email}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <ProfileInfoItem 
              icon={<Mail className="w-5 h-5 text-blue-400" />}
              label="Email"
              value={user?.email || 'Not available'}
            />
            <ProfileInfoItem 
              icon={<Award className="w-5 h-5 text-yellow-400" />}
              label="Current Points"
              value={userPoints.toString()}
            />
          </div>
        </Card>
        
        {/* Points Display */}
        <Card className="bg-slate-800 border-slate-700 p-6 flex flex-col items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-blue-900 flex items-center justify-center mb-4 relative">
            <Award className="w-12 h-12 text-yellow-400" />
          </div>
          <h3 className="text-2xl font-bold">{userPoints}</h3>
          <p className="text-gray-400">Current Points</p>
        </Card>
      </div>
      
      {/* Account Details */}
      <Card className="bg-slate-800 border-slate-700 p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Account Details</h3>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-gray-400">Account created: </span>
            <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not available'}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">Last sign in: </span>
            <span>{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Not available'}</span>
          </div>
        </div>
      </Card>
    </MainLayout>
  );
};

interface ProfileInfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const ProfileInfoItem: React.FC<ProfileInfoItemProps> = ({ icon, label, value }) => {
  return (
    <div className="flex items-center space-x-3 border-b border-slate-700 pb-3">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="text-sm text-gray-400">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
};

export default ProfilePage;
