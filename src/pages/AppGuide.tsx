
import React from 'react';
import AppLayout from '../components/AppLayout';
import EditableGuide from '@/components/app-guide/EditableGuide';

const AppGuidePage: React.FC = () => {
  const initialGuideContent = `
<h1 style="font-size: 1.875rem; font-weight: bold; color: white; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #233554;">App Guide</h1>
<p style="color: #cbd5e1; margin-bottom: 1rem;">Welcome to the App Guide! You can edit this content directly.</p>
<h2 style="font-size: 1.5rem; font-weight: bold; color: #00B8D9; margin-bottom: 0.75rem;">Editing Instructions</h2>
<p style="color: #cbd5e1; margin-bottom: 0.5rem;">- Use the toolbar above to format your text.</p>
<p style="color: #cbd5e1; margin-bottom: 0.5rem;">- Select text to apply bold, underline, or change font size.</p>
<p style="color: #cbd5e1; margin-bottom: 1rem;">- Click anywhere and start typing!</p>
<h2 style="font-size: 1.5rem; font-weight: bold; color: #00B8D9; margin-bottom: 0.75rem;">Example Section</h2>
<p style="color: #cbd5e1;">This is an <strong>example</strong> of <u>formatted text</u> with a <span style="font-size:1.25rem;">larger font size</span>.</p>
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
