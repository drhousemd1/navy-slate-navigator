
import React from 'react';
import AppLayout from '../components/AppLayout';
import EditableGuide from '@/components/app-guide/EditableGuide';

const AppGuidePage: React.FC = () => {
  const initialGuideContent = `
<h1 style="font-size: 2rem; font-weight: bold; color: #333; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0;">App Guide</h1>
<p style="color: #333; margin-bottom: 1rem;">Welcome to the App Guide! This is your space to document how your app works.</p>

<h2 style="font-size: 1.5rem; font-weight: bold; color: #3182ce; margin-bottom: 0.75rem; margin-top: 1.5rem;">Getting Started</h2>
<p style="color: #333; margin-bottom: 0.5rem;">This editor allows you to:</p>
<ul style="margin-left: 2rem; margin-bottom: 1rem;">
  <li style="color: #333; margin-bottom: 0.25rem;">Format text using the toolbar above</li>
  <li style="color: #333; margin-bottom: 0.25rem;">Create lists (ordered and unordered)</li>
  <li style="color: #333; margin-bottom: 0.25rem;">Insert tables for structured information</li>
  <li style="color: #333; margin-bottom: 0.25rem;">Align text as needed</li>
</ul>

<h2 style="font-size: 1.5rem; font-weight: bold; color: #3182ce; margin-bottom: 0.75rem; margin-top: 1.5rem;">Example Table</h2>
<p style="color: #333; margin-bottom: 0.5rem;">Here's an example of what you can create:</p>

<table style="width:100%; border-collapse: collapse; margin-bottom: 1rem;">
  <tr style="background-color: #f2f2f2;">
    <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Feature</th>
    <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Description</th>
    <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Location</th>
  </tr>
  <tr>
    <td style="border: 1px solid #ccc; padding: 8px;">Tasks</td>
    <td style="border: 1px solid #ccc; padding: 8px;">Create and manage tasks</td>
    <td style="border: 1px solid #ccc; padding: 8px;">Tasks page</td>
  </tr>
  <tr>
    <td style="border: 1px solid #ccc; padding: 8px;">Rewards</td>
    <td style="border: 1px solid #ccc; padding: 8px;">Set up and track rewards</td>
    <td style="border: 1px solid #ccc; padding: 8px;">Rewards page</td>
  </tr>
</table>

<p style="color: #333; margin-bottom: 1rem;">Start documenting your app by replacing this content with your own guide!</p>
`;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <EditableGuide initialContent={initialGuideContent} />
      </div>
    </AppLayout>
  );
};

export default AppGuidePage;
