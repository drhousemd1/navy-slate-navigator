
import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Undo, Redo, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Palette, Pilcrow, CaseSensitive, Baseline, List, ListOrdered, ListChecks,
  Image as ImageIcon, Link as LinkIcon, Table as TableIcon, Save, UploadCloud,
  Indent, Outdent, RemoveFormatting, Strikethrough, Code, Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface EditorToolbarProps {
  editor: Editor | null;
}

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, Times, serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Comic Sans MS', value: 'Comic Sans MS, Comic Sans, cursive' }, // For fun
];

const FONT_SIZES = [
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px (Normal)', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '24px', value: '24px' },
  { label: '32px', value: '32px' },
];

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  const activeClass = 'bg-gray-200 dark:bg-gray-700';
  const iconButtonClass = "dark:text-white dark:border-gray-600 hover:dark:bg-gray-700";

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    editor.chain().focus().setColor(event.target.value).run();
  };

  const handleHighlightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    editor.chain().focus().toggleHighlight({ color: event.target.value }).run();
  };
  
  const currentFontSize = editor.getAttributes('textStyle').fontSize || '16px';
  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || 'Inter, sans-serif';
  const currentTextColor = editor.getAttributes('textStyle').color || (typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#FFFFFF' : '#000000');
  const currentHighlightColor = editor.getAttributes('highlight').color || '#FFFF00'; // Default yellow highlight

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };
  
  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL (leave empty to remove link):', previousUrl);

    if (url === null) return; // User cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
  };


  return (
    <TooltipProvider delayDuration={100}>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-t-md shadow-sm">
        {/* History */}
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={iconButtonClass}><Undo /></Button></TooltipTrigger>
          <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={iconButtonClass}><Redo /></Button></TooltipTrigger>
          <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-8 mx-1 dark:bg-gray-600" />

        {/* Font Family */}
        <Select value={currentFontFamily} onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="w-[150px] h-10 dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:dark:bg-gray-700">
                <CaseSensitive className="mr-2" /> <SelectValue placeholder="Font" />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent><p>Font Family</p></TooltipContent>
          </Tooltip>
          <SelectContent className="dark:bg-gray-800 dark:text-white">
            {FONT_FAMILIES.map(font => <SelectItem key={font.value} value={font.value} className="hover:dark:bg-gray-700">{font.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Font Size */}
         <Select value={currentFontSize} onValueChange={(value) => editor.chain().focus().setMark('textStyle', { fontSize: value }).run()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="w-[130px] h-10 dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:dark:bg-gray-700">
                <Baseline className="mr-2"/> <SelectValue placeholder="Size" />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent><p>Font Size</p></TooltipContent>
          </Tooltip>
          <SelectContent className="dark:bg-gray-800 dark:text-white">
            {FONT_SIZES.map(size => <SelectItem key={size.value} value={size.value} className="hover:dark:bg-gray-700">{size.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-8 mx-1 dark:bg-gray-600" />

        {/* Basic Formatting */}
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={`${editor.isActive('bold') ? activeClass : ''} ${iconButtonClass}`}><Bold /></Button></TooltipTrigger>
          <TooltipContent><p>Bold (Ctrl+B)</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${editor.isActive('italic') ? activeClass : ''} ${iconButtonClass}`}><Italic /></Button></TooltipTrigger>
          <TooltipContent><p>Italic (Ctrl+I)</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`${editor.isActive('underline') ? activeClass : ''} ${iconButtonClass}`}><Underline /></Button></TooltipTrigger>
          <TooltipContent><p>Underline (Ctrl+U)</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} className={`${editor.isActive('strike') ? activeClass : ''} ${iconButtonClass}`}><Strikethrough /></Button></TooltipTrigger>
          <TooltipContent><p>Strikethrough</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-8 mx-1 dark:bg-gray-600" />
        
        {/* Color Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="outline" size="icon" className={iconButtonClass}>
              <label htmlFor="textColorInput" className="cursor-pointer p-2"><Palette /></label>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Text Color</p></TooltipContent>
        </Tooltip>
        <input id="textColorInput" type="color" value={currentTextColor} onInput={handleColorChange} className="w-0 h-0 opacity-0 absolute"/>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="outline" size="icon" className={iconButtonClass}>
              <label htmlFor="highlightColorInput" className="cursor-pointer p-2"><Pilcrow /> {/* Using Pilcrow as placeholder, replace with better highlight icon if available */}</label>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Highlight Color</p></TooltipContent>
        </Tooltip>
        <input id="highlightColorInput" type="color" value={currentHighlightColor} onInput={handleHighlightChange} className="w-0 h-0 opacity-0 absolute"/>


        <Separator orientation="vertical" className="h-8 mx-1 dark:bg-gray-600" />

        {/* Alignment */}
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`${editor.isActive({ textAlign: 'left' }) ? activeClass : ''} ${iconButtonClass}`}><AlignLeft /></Button></TooltipTrigger>
          <TooltipContent><p>Align Left</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`${editor.isActive({ textAlign: 'center' }) ? activeClass : ''} ${iconButtonClass}`}><AlignCenter /></Button></TooltipTrigger>
          <TooltipContent><p>Align Center</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`${editor.isActive({ textAlign: 'right' }) ? activeClass : ''} ${iconButtonClass}`}><AlignRight /></Button></TooltipTrigger>
          <TooltipContent><p>Align Right</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`${editor.isActive({ textAlign: 'justify' }) ? activeClass : ''} ${iconButtonClass}`}><AlignJustify /></Button></TooltipTrigger>
          <TooltipContent><p>Align Justify</p></TooltipContent>
        </Tooltip>
        
        <Separator orientation="vertical" className="h-8 mx-1 dark:bg-gray-600" />

        {/* Lists */}
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`${editor.isActive('bulletList') ? activeClass : ''} ${iconButtonClass}`}><List /></Button></TooltipTrigger>
          <TooltipContent><p>Bullet List</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`${editor.isActive('orderedList') ? activeClass : ''} ${iconButtonClass}`}><ListOrdered /></Button></TooltipTrigger>
          <TooltipContent><p>Numbered List</p></TooltipContent>
        </Tooltip>
         <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().toggleTaskList().run()} className={`${editor.isActive('taskList') ? activeClass : ''} ${iconButtonClass}`}><ListChecks /></Button></TooltipTrigger>
          <TooltipContent><p>Checklist/Task List</p></TooltipContent>
        </Tooltip>

        {/* Indentation */}
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().indent().run()} disabled={!editor.can().indent()} className={iconButtonClass}><Indent /></Button></TooltipTrigger>
          <TooltipContent><p>Increase Indent</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().outdent().run()} disabled={!editor.can().outdent()} className={iconButtonClass}><Outdent /></Button></TooltipTrigger>
          <TooltipContent><p>Decrease Indent</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-8 mx-1 dark:bg-gray-600" />
        
        {/* Insertions */}
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={addImage} className={iconButtonClass}><ImageIcon /></Button></TooltipTrigger>
          <TooltipContent><p>Insert Image (via URL)</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={setLink} className={`${editor.isActive('link') ? activeClass : ''} ${iconButtonClass}`}><LinkIcon /></Button></TooltipTrigger>
          <TooltipContent><p>Insert/Edit Link</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={iconButtonClass}><TableIcon /></Button></TooltipTrigger>
          <TooltipContent><p>Insert Table (3x3)</p></TooltipContent>
        </Tooltip>
         <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`${editor.isActive('codeBlock') ? activeClass : ''} ${iconButtonClass}`}><Code /></Button></TooltipTrigger>
          <TooltipContent><p>Code Block</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`${editor.isActive('blockquote') ? activeClass : ''} ${iconButtonClass}`}><Quote /></Button></TooltipTrigger>
          <TooltipContent><p>Blockquote</p></TooltipContent>
        </Tooltip>
        
        <Separator orientation="vertical" className="h-8 mx-1 dark:bg-gray-600" />
        
        {/* Clear Formatting */}
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} className={iconButtonClass}><RemoveFormatting /></Button></TooltipTrigger>
          <TooltipContent><p>Clear Formatting</p></TooltipContent>
        </Tooltip>

        {/* Spacer to push Save/Publish to the right */}
        <div className="flex-grow"></div>

        {/* Actions */}
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline" size="sm" onClick={() => console.log("Save action (localStorage used automatically)")} className={`${iconButtonClass} flex items-center`}><Save className="mr-2 h-4 w-4" /> Save Draft</Button></TooltipTrigger>
          <TooltipContent><p>Content is auto-saved to local draft.</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="default" size="sm" onClick={() => console.log("Publish action - TBD")} className="flex items-center"><UploadCloud className="mr-2 h-4 w-4" /> Publish</Button></TooltipTrigger>
          <TooltipContent><p>Publish content (Backend TBD)</p></TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default EditorToolbar;

