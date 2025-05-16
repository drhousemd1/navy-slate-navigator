
import React, { useEffect, useMemo } from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
// History is part of StarterKit by default, no need to import separately unless highly customized

const LOCAL_STORAGE_KEY = 'app-guide-content';

const defaultContent = `
<h1>Welcome to your App Guide!</h1>
<p>This is a robust, user-friendly text editing environment designed to help you create detailed app documentation, much like Google Docs.</p>
<p>Use the toolbar above to format your text, insert images, tables, and more.</p>
<h2>Key Features Implemented:</h2>
<ul>
  <li>Basic text formatting (Bold, Italic, Underline)</li>
  <li>Font family and size selection</li>
  <li>Text alignment</li>
  <li>Undo/Redo functionality</li>
  <li>Content auto-saves to your browser's local storage</li>
</ul>
<p>Start typing here or explore the toolbar options!</p>
`;

interface RichTextEditorProps {
  onEditorChange: (editor: Editor | null) => void;
  initialContent?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ onEditorChange, initialContent }) => {
  const editorExtensions = useMemo(() => [
    StarterKit.configure({
      // Disable heading levels that might conflict if we add more specific heading controls later
      heading: {
        levels: [1, 2, 3],
      },
      // history: true, // StarterKit includes history by default. Set to false or {} for custom options.
      // Let StarterKit handle its default history to avoid conflicts.
      // Strike is also part of StarterKit by default.
    }),
    TextStyle, // Allows applying custom styles, essential for FontFamily, FontSize, Color
    FontFamily,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph', 'listItem', 'taskItem'] }), // Added taskItem
    Image.configure({
      inline: false,
      allowBase64: true, // Allows pasting images from clipboard
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-md my-2',
      },
    }),
    Link.configure({
      openOnClick: true, 
      autolink: true,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
      },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: 'border-collapse table-auto w-full border border-gray-300 dark:border-gray-600' },
    }),
    TableRow.configure({ HTMLAttributes: { class: 'border-b border-gray-300 dark:border-gray-600' } }),
    TableHeader.configure({ HTMLAttributes: { class: 'bg-gray-100 dark:bg-gray-800 font-semibold text-left p-2 border-b border-gray-300 dark:border-gray-600' } }),
    TableCell.configure({ HTMLAttributes: { class: 'border border-gray-300 dark:border-gray-600 p-2' } }),
    Placeholder.configure({
      placeholder: 'Start writing your app guide... Click here to type.',
    }),
    TaskList,
    TaskItem.configure({ 
      nested: true,
      HTMLAttributes: { class: 'flex items-start my-1' }, // Basic styling for task items
    }),
    Typography, // For smart quotes, arrows, etc.
    Underline,
  ], []);

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialContent || defaultContent,
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert max-w-none focus:outline-none p-4 min-h-[calc(100vh-200px)]',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      localStorage.setItem(LOCAL_STORAGE_KEY, html);
      onEditorChange(currentEditor); // Notify parent about editor changes
    },
    onCreate: ({ editor: currentEditor }) => {
       onEditorChange(currentEditor); // Notify parent on initial creation
    }
  });

  useEffect(() => {
    if (editor && !initialContent) { // Only load from localStorage if no specific initialContent is provided
      const savedContent = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedContent) {
        editor.commands.setContent(savedContent, false); // false to not emit update
      }
    }
  }, [editor, initialContent]);
  
  // Expose editor instance to parent
  useEffect(() => {
    onEditorChange(editor);
    return () => {
      onEditorChange(null); // Clear editor instance on unmount
    };
  }, [editor, onEditorChange]);


  return (
    <div className="editor-content-area bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 flex-grow overflow-y-auto rounded-b-md border border-t-0 border-gray-300 dark:border-gray-700">
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;

