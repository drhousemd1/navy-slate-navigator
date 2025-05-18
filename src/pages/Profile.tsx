
import React from 'react';
import AppLayout from '../components/AppLayout'; // Corrected import path

const Profile: React.FC = () => {
  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p>This is your profile page.</p>
        {/* Profile content can be added here */}
      </div>
    </AppLayout>
  );
};

export default Profile;
