
import React from 'react';
import AppLayout from '../components/AppLayout';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const AppGuidePage: React.FC = () => {
  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto bg-background text-foreground">
        <article className="prose prose-invert max-w-none">
          <header className="mb-8 border-b border-gray-700 pb-4">
            <h1 className="text-4xl font-bold text-white">App Guide</h1>
            <p className="text-gray-400 mt-2">A comprehensive guide to understanding and using the application</p>
          </header>
          
          <section className="mb-10">
            <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Introduction</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Welcome to the official App Guide! This document provides a comprehensive overview of the application's features,
              functionality, and how to make the most of it. Use this guide as a reference for understanding different
              sections of the app, its rules, rewards, and tasks.
            </p>
            <p className="text-gray-300 leading-relaxed">
              This guide is designed to be edited and expanded over time as the application grows and evolves.
              Feel free to add new sections, update existing content, or restructure the document as needed.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Navigating the App</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              The application is divided into several main sections, accessible via the navigation bar at the bottom of the screen:
            </p>
            <ul className="list-disc list-inside text-gray-300 pl-4 space-y-2 mb-6">
              <li><strong className="text-white">Rules:</strong> Manage and view the established rules.</li>
              <li><strong className="text-white">Tasks:</strong> View, create and complete daily and weekly objectives.</li>
              <li><strong className="text-white">Rewards:</strong> Browse and redeem available rewards.</li>
              <li><strong className="text-white">Punishments:</strong> Review and manage consequences for rule violations.</li>
              <li><strong className="text-white">Throne Room:</strong> Access administrative functions and overview statistics.</li>
            </ul>
            
            <p className="text-gray-300 leading-relaxed mb-4">
              Additional features are accessible from the top navigation bar:
            </p>
            <ul className="list-disc list-inside text-gray-300 pl-4 space-y-2">
              <li><strong className="text-white">Profile:</strong> Access your user profile and settings.</li>
              <li><strong className="text-white">Messages:</strong> Communication system within the app.</li>
              <li><strong className="text-white">App Guide:</strong> This documentation you're reading now.</li>
            </ul>
          </section>
          
          <section className="mb-10">
            <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Understanding Points & Rewards</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Completing tasks earns you points, which can be used to redeem various rewards. Your points balance
              is displayed in the Tasks page header.
            </p>
            
            <h3 className="text-2xl font-semibold text-white mt-6 mb-3">Point System</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              The application uses two types of points:
            </p>
            
            <Table className="mb-6">
              <TableHeader className="bg-dark-navy">
                <TableRow>
                  <TableHead className="text-white">Point Type</TableHead>
                  <TableHead className="text-white">How to Earn</TableHead>
                  <TableHead className="text-white">Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-navy border-b border-light-navy">
                  <TableCell className="text-white">Standard Points</TableCell>
                  <TableCell className="text-gray-300">Completing tasks</TableCell>
                  <TableCell className="text-gray-300">Redeem standard rewards</TableCell>
                </TableRow>
                <TableRow className="bg-navy">
                  <TableCell className="text-white">DOM Points</TableCell>
                  <TableCell className="text-gray-300">Special achievements</TableCell>
                  <TableCell className="text-gray-300">Redeem premium rewards</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
          
          <section className="mb-10">
            <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Pages Overview</h2>
            
            <h3 className="text-2xl font-semibold text-white mt-6 mb-3">Tasks</h3>
            <p className="text-gray-300 leading-relaxed mb-6">
              The Tasks page allows you to:
            </p>
            <ul className="list-disc list-inside text-gray-300 pl-4 space-y-2 mb-4">
              <li>View all current tasks organized by priority</li>
              <li>Mark tasks as complete to earn points</li>
              <li>Add new tasks using the + button</li>
              <li>Edit existing tasks by tapping on them</li>
            </ul>
            
            <h3 className="text-2xl font-semibold text-white mt-6 mb-3">Rewards</h3>
            <p className="text-gray-300 leading-relaxed mb-6">
              The Rewards page allows you to:
            </p>
            <ul className="list-disc list-inside text-gray-300 pl-4 space-y-2 mb-4">
              <li>Browse available rewards</li>
              <li>Redeem rewards using your earned points</li>
              <li>Add new rewards using the + button</li>
              <li>Track your weekly reward usage</li>
            </ul>
            
            <h3 className="text-2xl font-semibold text-white mt-6 mb-3">Rules</h3>
            <p className="text-gray-300 leading-relaxed mb-6">
              The Rules page provides:
            </p>
            <ul className="list-disc list-inside text-gray-300 pl-4 space-y-2 mb-4">
              <li>List of established rules to follow</li>
              <li>Option to add new rules</li>
              <li>Ability to record violations</li>
            </ul>
          </section>
          
          <section className="mb-10">
            <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Editing This Guide</h2>
            <p className="text-gray-300 leading-relaxed">
              This guide is designed to be a living document. You can add, remove, or modify any content to keep
              it up to date with how you use the application. Feel free to customize it to include specific
              instructions, user agreements, or any other information relevant to your use of the app.
            </p>
          </section>
        </article>
      </div>
    </AppLayout>
  );
};

export default AppGuidePage;
