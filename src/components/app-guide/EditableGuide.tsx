import React, { useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import History from '@tiptap/extension-history';

export default function EditableGuide() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      History,
      Underline,
      Strike,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
      FontFamily,
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
                  // @ts-ignore
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
    <div className="editor-container flex flex-col h-full min-h-screen">
      <div className="toolbar flex flex-wrap gap-2 p-2 bg-gray-100 border-b">
        {/* Text formatting */}
        <button onClick={() => run(() => editor.chain().focus().toggleBold().run())}>B</button>
        <button onClick={() => run(() => editor.chain().focus().toggleItalic().run())}>I</button>
        <button onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}>U</button>
        <button onClick={() => run(() => editor.chain().focus().toggleStrike().run())}>S</button>
        <select onChange={e => run(() => editor.chain().focus().setFontFamily(e.target.value).run())} defaultValue="sans-serif">
          <option value="sans-serif">Sans</option>
          <option value="serif">Serif</option>
          <option value="monospace">Mono</option>
        </select>
        <select 
          onChange={e => {
            const fontSizeValue = e.target.value;
            if (fontSizeValue) {
              run(() => editor.chain().focus().setMark('textStyle', { fontSize: fontSizeValue }).run());
            } else {
              run(() => editor.chain().focus().unsetMark('textStyle').run());
            }
          }} 
          defaultValue="16px"
        >
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="24px">24</option>
          <option value="32px">32</option>
          <option value="48px">48</option>
        </select>
        <button onClick={() => run(() => editor.chain().focus().setTextAlign('left').run())}>Left</button>
        <button onClick={() => run(() => editor.chain().focus().setTextAlign('center').run())}>Center</button>
        <button onClick={() => run(() => editor.chain().focus().setTextAlign('right').run())}>Right</button>
        <button onClick={() => run(() => editor.chain().focus().toggleHighlight().run())}>Highlight</button>
        <input type="color" onChange={e => run(() => editor.chain().focus().setColor(e.target.value).run())} />

        {/* Lists & blocks */}
        <button onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}>• List</button>
        <button onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}>1. List</button>
        <button onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())}>&quot;</button>
        <button onClick={() => run(() => editor.chain().focus().toggleCodeBlock().run())}>&lt;&gt;</button>

        {/* Links & images */}
        <button onClick={() => {
          const url = prompt('Enter URL');
          if (url) {
            run(() => editor.chain().focus().setLink({ href: url }).run());
          }
        }}>Link</button>
        <button onClick={() => {
          const src = prompt('Enter image URL');
          if (src) {
            run(() => editor.chain().focus().setImage({ src }).run());
          }
        }}>Image</button>

        {/* Table controls */}
        <button onClick={() => run(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>Table</button>
        <button onClick={() => run(() => editor.chain().focus().addColumnBefore().run())}>‹ Col</button>
        <button onClick={() => run(() => editor.chain().focus().addColumnAfter().run())}>Col ›</button>
        <button onClick={() => run(() => editor.chain().focus().deleteColumn().run())}>Del Col</button>
        <button onClick={() => run(() => editor.chain().focus().addRowBefore().run())}>Row ↑</button>
        <button onClick={() => run(() => editor.chain().focus().addRowAfter().run())}>Row ↓</button>
        <button onClick={() => run(() => editor.chain().focus().deleteRow().run())}>Del Row</button>

        {/* Undo/Redo */}
        <button onClick={() => run(() => editor.chain().focus().undo().run())}>↺</button>
        <button onClick={() => run(() => editor.chain().focus().redo().run())}>↻</button>
      </div>

      <div
        className="editor flex-1 overflow-auto p-4 h-full"
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  );
}
