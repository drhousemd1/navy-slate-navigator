
import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import History from '@tiptap/extension-history';
import { 
  Bold, 
  Italic, 
  Table as TableIcon, 
  Undo, 
  Redo,
  Columns3,
  Columns2,
  Rows3,
  Rows2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipProvider, 
  TooltipTrigger, 
  TooltipContent 
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface EditableGuideProps {
  initialContent?: string;
}

const EditableGuide: React.FC<EditableGuideProps> = ({ 
  initialContent = '<h1>App Guide</h1><p>Start writing your guide here...</p>'
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      History,
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
    ],
    content: initialContent,
    autofocus: 'end',
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

  return (
    <div className="mt-6 flex flex-col border border-gray-300 rounded-md overflow-hidden">
      <TooltipProvider>
        <div className="toolbar flex flex-wrap items-center gap-1 p-2 bg-white border-b border-gray-300">
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => editor?.chain().focus().toggleBold().run()} 
                  className={`${editor?.isActive('bold') ? 'bg-gray-200' : ''}`}
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
                  onClick={() => editor?.chain().focus().toggleItalic().run()} 
                  className={`${editor?.isActive('italic') ? 'bg-gray-200' : ''}`}
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={addTable} 
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
                  >
                    <Columns2 className="h-4 w-4" />
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
                  >
                    <Rows2 className="h-4 w-4" />
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
                  >
                    <Rows2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Row</TooltipContent>
              </Tooltip>
            </>
          )}
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => editor?.chain().focus().undo().run()} 
                disabled={!editor?.can().undo()}
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
                onClick={() => editor?.chain().focus().redo().run()} 
                disabled={!editor?.can().redo()}
              >
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      
      <div className="editor bg-white p-4 min-h-[500px] overflow-auto">
        <EditorContent editor={editor} className="prose max-w-none focus:outline-none" />
      </div>
    </div>
  );
};

export default EditableGuide;
