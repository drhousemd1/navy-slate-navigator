
import React from 'react';
import AppLayout from '../components/AppLayout';
import EditableGuide from '@/components/app-guide/EditableGuide';

const AppGuidePage: React.FC = () => {
  const initialGuideContent = `
<h1>App Guide</h1>
<p>Welcome to the App Guide! This is your space to document how your app works.</p>

<h2>Getting Started</h2>
<p>This editor allows you to:</p>
<ul>
  <li>Format text using the toolbar above</li>
  <li>Create lists (ordered and unordered)</li>
  <li>Insert tables for structured information</li>
  <li>Manage tables by adding/removing rows and columns</li>
</ul>

<h2>Example Table</h2>
<p>Here's an example of what you can create:</p>

<table>
  <tr>
    <th>Feature</th>
    <th>Description</th>
    <th>Location</th>
  </tr>
  <tr>
    <td>Tasks</td>
    <td>Create and manage tasks</td>
    <td>Tasks page</td>
  </tr>
  <tr>
    <td>Rewards</td>
    <td>Set up and track rewards</td>
    <td>Rewards page</td>
  </tr>
</table>

<p>Start documenting your app by editing this content!</p>
`;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">App Guide</h1>
        <p className="text-gray-600 mb-4">
          Document your application workflow and features here
        </p>
        <EditableGuide initialContent={initialGuideContent} />
      </div>
    </AppLayout>
  );
};

export default AppGuidePage;
