import React from 'react';
import AppLayout from '../components/AppLayout'; // Import AppLayout

const AppGuidePage: React.FC = () => {
  return (
    <AppLayout> {/* Wrap content with AppLayout */}
      <div className="p-4 md:p-8 bg-background text-foreground"> {/* This div is now inside AppLayout's main content area */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white border-b border-gray-700 pb-2">App Guide</h1>
        </header>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold text-cyan-400 mb-3">Introduction</h2>
          <p className="text-gray-300 leading-relaxed">
            Welcome to the official App Guide! This document provides a comprehensive overview of the application's features,
            functionality, and how to make the most of it. Use this guide as a reference for understanding different
            sections of the app, its rules, rewards, and tasks.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold text-cyan-400 mb-3">Navigating the App</h2>
          <p className="text-gray-300 leading-relaxed mb-2">
            The application is divided into several main sections, accessible via the navigation bar:
          </p>
          <ul className="list-disc list-inside text-gray-300 pl-4 space-y-1">
            <li><strong>Tasks:</strong> Manage your daily and weekly objectives.</li>
            <li><strong>Rewards:</strong> View and redeem available rewards.</li>
            <li><strong>Rules:</strong> Understand the guidelines and consequences.</li>
            <li><strong>Punishments:</strong> Review any penalties incurred.</li>
            {/* Add more navigation items as the app evolves */}
          </ul>
        </section>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold text-cyan-400 mb-3">Understanding Points & Rewards</h2>
          <p className="text-gray-300 leading-relaxed">
            Completing tasks earns you points, which can be used to redeem various rewards. Keep an eye on your points balance
            in the header.
          </p>
          {/* Placeholder for table example if needed later */}
          {/*
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full bg-navy border border-light-navy rounded-md">
              <thead>
                <tr className="bg-light-navy">
                  <th className="p-3 text-left text-sm font-semibold text-white">Feature</th>
                  <th className="p-3 text-left text-sm font-semibold text-white">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-light-navy">
                  <td className="p-3 text-sm text-gray-300">Task Completion</td>
                  <td className="p-3 text-sm text-gray-300">Marks a task as done, potentially awarding points.</td>
                </tr>
                <tr className="border-t border-light-navy">
                  <td className="p-3 text-sm text-gray-300">Reward Redemption</td>
                  <td className="p-3 text-sm text-gray-300">Uses points to claim a reward.</td>
                </tr>
              </tbody>
            </table>
          </div>
          */}
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-cyan-400 mb-3">Future Content</h2>
          <p className="text-gray-300 leading-relaxed">
            This guide will be updated continuously as new features are added. You can add more sections here for:
          </p>
          <ul className="list-disc list-inside text-gray-300 pl-4 space-y-1">
            <li>Detailed explanation of each page.</li>
            <li>How to customize tasks, rewards, etc.</li>
            <li>Admin functionalities (if applicable).</li>
          </ul>
        </section>
      </div>
    </AppLayout>
  );
};

export default AppGuidePage;
