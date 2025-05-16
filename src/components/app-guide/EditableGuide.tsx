import React, { useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color'; // Kept Color import as it's in the new code
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import FontSize from '@tiptap/extension-font-size'; // Corrected to FontSize as per user code
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import History from '@tiptap/extension-history'; // Added History import as per user code

export default function EditableGuide() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      History,
      Underline,
      Strike,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color.configure({ types: ['textStyle'] }), // Corrected import name for Color extension
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize, // Corrected extension name
      Link.configure({ autolink: true, openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '<p>Your guide starts here…</p>',
    autofocus: true,
    editorProps: {
      handlePaste(view, event) {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;
        for (const item of Array.from(clipboard.items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = () => {
              const src = reader.result as string;
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  // @ts-ignore - User provided this ignore, keeping it
                  view.state.schema.nodes.image.create({ src })
                )
              );
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      }
    }
  });

  const run = useCallback((command: () => void) => {
    if (editor) {
      command();
    }
  }, [editor]);

  if (!editor) {
    return null; // Or some loading state
  }

  return (
    <div className="editor-container flex flex-col h-full min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="toolbar flex flex-wrap gap-2 p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
        {/* Text formatting */}
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().toggleBold().run())}>B</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().toggleItalic().run())}>I</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}>U</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().toggleStrike().run())}>S</button>
        <select className="p-1 border rounded bg-white dark:bg-gray-700 dark:text-white" onChange={e => run(() => editor.chain().focus().setFontFamily(e.target.value).run())} defaultValue="sans-serif">
          <option value="sans-serif">Sans</option>
          <option value="serif">Serif</option>
          <option value="monospace">Mono</option>
        </select>
        <select className="p-1 border rounded bg-white dark:bg-gray-700 dark:text-white" onChange={e => {
            const value = e.target.value;
            if (value) { // Ensure value is not empty
                 run(() => editor.chain().focus().setFontSize(value).run());
            } else { // Optionally unset font size or set to default
                 run(() => editor.chain().focus().unsetFontSize().run());
            }
        }} defaultValue="16px">
          <option value="">Default</option>
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="24px">24</option>
          <option value="32px">32</option>
          <option value="48px">48</option>
        </select>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().setTextAlign('left').run())}>Left</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().setTextAlign('center').run())}>Center</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().setTextAlign('right').run())}>Right</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().toggleHighlight().run())}>Highlight</button>
        <input className="p-1 border rounded h-8 w-8" type="color" onChange={e => run(() => editor.chain().focus().setColor(e.target.value).run())} defaultValue={editor.getAttributes('textStyle').color || '#000000'} />

        {/* Lists & blocks */}
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}>• List</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}>1. List</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())}>&quot;</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().toggleCodeBlock().run())}>&lt;&gt;</button>

        {/* Links & images */}
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => {
          const url = prompt('Enter URL');
          if (url) {
            run(() => editor.chain().focus().setLink({ href: url }).run());
          }
        }}>Link</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => {
          const src = prompt('Enter image URL');
          if (src) {
            run(() => editor.chain().focus().setImage({ src }).run());
          }
        }}>Image</button>

        {/* Table controls */}
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>Table</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().addColumnBefore().run())} disabled={!editor.can().addColumnBefore()}>‹ Col</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().addColumnAfter().run())} disabled={!editor.can().addColumnAfter()}>Col ›</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().deleteColumn().run())} disabled={!editor.can().deleteColumn()}>Del Col</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().addRowBefore().run())} disabled={!editor.can().addRowBefore()}>Row ↑</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().addRowAfter().run())} disabled={!editor.can().addRowAfter()}>Row ↓</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().deleteRow().run())} disabled={!editor.can().deleteRow()}>Del Row</button>

        {/* Undo/Redo */}
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().undo().run())} disabled={!editor.can().undo()}>↺</button>
        <button className="p-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => run(() => editor.chain().focus().redo().run())} disabled={!editor.can().redo()}>↻</button>
      </div>

      <div
        className="editor-content-area flex-1 overflow-auto p-4 border border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => editor.chain().focus().run()} // Ensure focus on click
      >
        <EditorContent editor={editor} className="min-h-full prose dark:prose-invert max-w-none focus:outline-none" />
      </div>
    </div>
  );
}
