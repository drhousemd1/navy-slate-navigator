import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';

import { 
  Bold, 
  Italic, 
  Table as TableIcon, 
  Undo, 
  Redo,
  Columns3,
  Columns2,
  Rows3,
  Rows2,
  Palette, 
  Baseline 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipProvider, 
  TooltipTrigger, 
  TooltipContent 
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface EditableGuideProps {
  initialContent?: string;
}

const fontSizes = [
  { label: 'Smallest', value: '0.75rem' }, // 12px
  { label: 'Small', value: '0.875rem' },  // 14px
  { label: 'Normal', value: '1rem' },     // 16px
  { label: 'Large', value: '1.25rem' },   // 20px
  { label: 'X-Large', value: '1.5rem' },  // 24px
];

const EditableGuide: React.FC<EditableGuideProps> = ({ 
  initialContent = '<h1>App Guide</h1><p>Start writing your guide here...</p>'
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit, 
      Table.configure({ 
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full border border-gray-300',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border-b border-gray-300',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 font-semibold text-left p-2 border-b border-gray-300',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2',
        },
      }),
      TextStyle, 
      Color,     
      Image.configure({ 
        inline: false, 
        allowBase64: true, 
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md my-2', 
        },
      }),
    ],
    content: initialContent,
    autofocus: 'end',
    onUpdate: ({ editor: currentEditor }) => {
      // Editor updates trigger re-renders via useEditor hook.
      // Force a re-render if needed to update toolbar states like currentColor
      // This can be done by managing a piece of state that changes, or if useEditor handles it.
      // For now, relying on useEditor's re-render triggering.
    }
  });

  const isTableActive = editor?.isActive('table');

  // Toolbar actions
  const addTable = () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  const addColumnBefore = () => editor?.chain().focus().addColumnBefore().run();
  const addColumnAfter = () => editor?.chain().focus().addColumnAfter().run();
  const deleteColumn = () => editor?.chain().focus().deleteColumn().run();
  const addRowBefore = () => editor?.chain().focus().addRowBefore().run();
  const addRowAfter = () => editor?.chain().focus().addRowAfter().run();
  const deleteRow = () => editor?.chain().focus().deleteRow().run();

  const currentFontSize = editor?.getAttributes('textStyle').fontSize || '1rem';
  // Ensure currentColor reflects the actual current color for the input's value
  // Default to black or white based on theme if no color is set on the text
  const editorColor = editor?.getAttributes('textStyle').color;
  const defaultDarkThemeColor = '#FFFFFF'; // White for dark theme
  const defaultLightThemeColor = '#000000'; // Black for light theme
  
  // This needs to be reactive to theme changes if documentElement.classList can change dynamically
  // For simplicity, assuming it's checked on render.
  const currentColor = editorColor || (typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? defaultDarkThemeColor : defaultLightThemeColor);

  if (!editor) {
    return null; 
  }

  const handleEditorWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editor) {
      // If the click is directly on the wrapper (i.e., the padding area), focus the editor at the end.
      if (e.target === e.currentTarget) {
        editor.chain().focus('end').run();
      }
      // If the click is on a child (EditorContent or its elements) and the editor isn't focused,
      // Tiptap's EditorContent internal handlers should take over once it receives focus.
      // We can also explicitly focus it if it's not.
      else if (!editor.isFocused) {
         editor.chain().focus().run();
      }
      // If it's already focused and click is on content, Tiptap handles it.
    }
  };

  return (
    <div className="mt-6 flex flex-col border border-gray-300 rounded-md overflow-hidden">
      <TooltipProvider>
        <div className="toolbar flex flex-wrap items-center gap-1 p-2 bg-white border-b border-gray-300 dark:bg-gray-800 dark:border-gray-700">
          {/* Basic Formatting */}
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => editor.chain().focus().toggleBold().run()} 
                  className={`${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-600' : ''} dark:text-white dark:border-gray-600 hover:dark:bg-gray-700`}
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => editor.chain().focus().toggleItalic().run()} 
                  className={`${editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-600' : ''} dark:text-white dark:border-gray-600 hover:dark:bg-gray-700`}
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 mx-2 dark:bg-gray-600" />

          {/* Font Styling - REVERTED COLOR PICKER */}
          <div className="flex gap-1 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild // Render the child (label) directly, inheriting button styles
                  variant="outline" 
                  size="icon"
                  className="dark:text-white dark:border-gray-600 hover:dark:bg-gray-700"
                >
                  {/* Label triggers the input. Styled to fill button and center icon. */}
                  <label htmlFor="tiptapColorInput" className="cursor-pointer flex items-center justify-center w-full h-full"> 
                    <Palette className="h-4 w-4" />
                  </label>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Text Color</TooltipContent>
            </Tooltip>
            
            {/* Hidden color input, linked by ID to the label */}
            <input
              id="tiptapColorInput"
              type="color"
              value={currentColor} // This value should correctly reflect the editor's current color or default
              onInput={(e) => { // Using onInput for immediate feedback as user drags color picker
                const newValue = (e.target as HTMLInputElement).value;
                editor.chain().focus().setColor(newValue).run();
              }}
              className="sr-only" // Visually hidden, but accessible for interaction via label
            />

            <Select
              value={currentFontSize}
              onValueChange={(value) => {
                editor.chain().focus().setMark('textStyle', { fontSize: value }).run();
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectTrigger className="w-[120px] h-10 dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:dark:bg-gray-700">
                    <Baseline className="h-4 w-4 mr-1" />
                    <SelectValue placeholder="Font Size" />
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent>Font Size</TooltipContent>
              </Tooltip>
              <SelectContent className="dark:bg-gray-800 dark:text-white">
                {fontSizes.map(fs => (
                  <SelectItem key={fs.value} value={fs.value} className="hover:dark:bg-gray-700">
                    {fs.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-2 dark:bg-gray-600" />
          
          {/* Table Controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={addTable} 
                className="dark:text-white dark:border-gray-600 hover:dark:bg-gray-700"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Insert Table</TooltipContent>
          </Tooltip>
          
          {isTableActive && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={addColumnBefore} 
                    className="dark:text-white dark:border-gray-600 hover:dark:bg-gray-700"
                  >
                    <Columns2 className="h-4 w-4 transform rotate-180" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Column Before</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={addColumnAfter} 
                    className="dark:text-white dark:border-gray-600 hover:dark:bg-gray-700"
                  >
                    <Columns3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Column After</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={deleteColumn} 
                    className="dark:text-white dark:border-gray-600 hover:dark:bg-gray-700"
                  >
                    <Columns2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Column</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={addRowBefore} 
                    className="dark:text-white dark:border-gray-600 hover:dark:bg-gray-700"
                  >
                    <Rows2 className="h-4 w-4 transform rotate-180" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Row Above</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={addRowAfter} 
                    className="dark:text-white dark:border-gray-600 hover:dark:bg-gray-700"
                  >
                    <Rows3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Row Below</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={deleteRow} 
                    className="dark:text-white dark:border-gray-600 hover:dark:bg-gray-700"
                  >
                    <Rows2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Row</TooltipContent>
              </Tooltip>
            </>
          )}
          
          <Separator orientation="vertical" className="h-6 mx-2 dark:bg-gray-600" />
          
          {/* History Controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => editor.chain().focus().undo().run()} 
                disabled={!editor.can().undo()}
                className="dark:text-white dark:border-gray-600 hover:dark:bg-gray-700 disabled:dark:opacity-50"
              >
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => editor.chain().focus().redo().run()} 
                disabled={!editor.can().redo()}
                className="dark:text-white dark:border-gray-600 hover:dark:bg-gray-700 disabled:dark:opacity-50"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      
      <div 
        className="editor bg-white p-4 min-h-[500px] overflow-auto dark:bg-gray-900 dark:text-gray-200"
        onClick={handleEditorWrapperClick} // Use the refined wrapper click handler
      >
        <EditorContent 
          editor={editor} 
          className="prose dark:prose-invert max-w-none focus:outline-none min-h-[480px]"
          // No explicit onClick here; Tiptap's internal click handling within its rendered content area should work.
          // Clicks on the padding are handled by `handleEditorWrapperClick`.
        />
      </div>
    </div>
  );
};

export default EditableGuide;
