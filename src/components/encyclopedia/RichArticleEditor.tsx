import React, { useEffect } from 'react';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { ENCYCLOPEDIA_FONT_SIZES, type ContentDocument, type ContentInline, type TextMarks } from '@/types/encyclopedia';
import { Button } from '@/components/ui/button';

const FontStyle = TextStyle.extend({ addAttributes() { return { fontSize: { default: null,
  parseHTML: element => ENCYCLOPEDIA_FONT_SIZES.find(size => size === element.style.fontSize) ?? null,
  renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
} }; } });
function toEditor(doc: ContentDocument): JSONContent {
  return { type: 'doc', content: doc.blocks.length ? doc.blocks.map(block => ({ type: 'paragraph', content: block.children.map(child => {
    if (child.type === 'hardBreak') return { type: 'hardBreak' };
    const marks: JSONContent['marks'] = [];
    if (child.marks?.bold) marks.push({ type: 'bold' });
    if (child.marks?.italic) marks.push({ type: 'italic' });
    if (child.marks?.underline) marks.push({ type: 'underline' });
    if (child.marks?.fontSize) marks.push({ type: 'textStyle', attrs: { fontSize: child.marks.fontSize } });
    return { type: 'text', text: child.text, marks };
  }).filter(child => child.type !== 'text' || child.text.length > 0) })) : [{ type: 'paragraph' }] };
}
function fromEditor(doc: JSONContent): ContentDocument {
  return { version: 1, blocks: (doc.content ?? []).map(block => ({ type: 'paragraph', children: (block.content ?? []).map((child): ContentInline => {
    if (child.type === 'hardBreak') return { type: 'hardBreak' };
    const marks: TextMarks = {};
    for (const mark of child.marks ?? []) {
      if (mark.type === 'bold') marks.bold = true;
      if (mark.type === 'italic') marks.italic = true;
      if (mark.type === 'underline') marks.underline = true;
      if (mark.type === 'textStyle' && ENCYCLOPEDIA_FONT_SIZES.includes(mark.attrs?.fontSize)) marks.fontSize = mark.attrs.fontSize;
    }
    return { type: 'text', text: child.text ?? '', marks };
  }) })) };
}
export default function RichArticleEditor({ initialDocument, onChange, disabled }: {
  initialDocument: ContentDocument; onChange: (doc: ContentDocument) => void; disabled: boolean;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, bulletList: false, orderedList: false, listItem: false,
      blockquote: false, code: false, codeBlock: false, strike: false, horizontalRule: false }), Underline, FontStyle],
    content: toEditor(initialDocument), editable: !disabled,
    editorProps: { attributes: { role: 'textbox', 'aria-label': 'Pop-up Text', 'aria-multiline': 'true', class: 'min-h-[200px] p-3 outline-none whitespace-pre-wrap' } },
    onUpdate: ({ editor }) => onChange(fromEditor(editor.getJSON())),
  });
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  if (!editor) return <p>Loading text editor...</p>;
  return <div className="space-y-2">
    <div className="bg-white border border-light-navy rounded-md p-2 flex flex-wrap gap-2 text-black" role="toolbar" aria-label="Article formatting">
      <Button type="button" variant="ghost" disabled={disabled} aria-pressed={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>Bold</Button>
      <Button type="button" variant="ghost" disabled={disabled} aria-pressed={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</Button>
      <Button type="button" variant="ghost" disabled={disabled} aria-pressed={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>Underline</Button>
      <label className="flex items-center gap-2">Font size<select aria-label="Font size" className="bg-white text-black border rounded p-2" disabled={disabled}
        value={editor.getAttributes('textStyle').fontSize ?? '1rem'} onChange={event => editor.chain().focus().setMark('textStyle', { fontSize: event.target.value }).run()}>
        {ENCYCLOPEDIA_FONT_SIZES.map((size, i) => <option key={size} value={size}>{['Small', 'Medium', 'Large', 'X-Large', 'XX-Large'][i]}</option>)}
      </select></label>
    </div>
    <div className="bg-white text-black rounded border border-light-navy"><EditorContent editor={editor} /></div>
  </div>;
}
