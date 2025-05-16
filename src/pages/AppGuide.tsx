
import React, { useState, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import RichTextEditor from '@/components/app-guide/RichTextEditor';
import EditorToolbar from '@/components/app-guide/EditorToolbar';
import { Editor } from '@tiptap/react'; // Import Editor type

const AppGuidePage: React.FC = () => {
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  // useCallback to memoize the handler function
  const handleEditorChange = useCallback((editor: Editor | null) => {
    setEditorInstance(editor);
  }, []);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-full mx-auto flex flex-col h-[calc(100vh-var(--header-height,64px))]"> {/* Adjust header height as needed */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">App Guide</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Craft and document your application's features and workflows with this powerful editor.
          </p>
        </div>
        
        {/* Editor UI */}
        <div className="flex flex-col flex-grow bg-gray-50 dark:bg-gray-950 rounded-lg shadow-lg overflow-hidden">
          <EditorToolbar editor={editorInstance} />
          <RichTextEditor onEditorChange={handleEditorChange} />
        </div>
      </div>
    </AppLayout>
  );
};

export default AppGuidePage;
