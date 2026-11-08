import React, { useEffect } from 'react';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { ENCYCLOPEDIA_FONT_SIZES, type ContentDocument, type ContentInline, type TextMarks } from '@/types/encyclopedia';
import TextFormatToolbar from './formatting/TextFormatToolbar';

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
    editorProps: { attributes: { role: 'textbox', 'aria-label': 'Pop-up Text', 'aria-multiline': 'true', class: 'w-full h-full min-h-[100px] outline-none text-black whitespace-pre-wrap leading-[1.5]' } },
    onUpdate: ({ editor }) => onChange(fromEditor(editor.getJSON())),
  });
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  if (!editor) return <p>Loading text editor...</p>;
  const selection = editor.state.selection;
  return <div className="space-y-2">
    <TextFormatToolbar disabled={disabled}
      selectedTextRange={selection.empty ? null : { start: selection.from, end: selection.to }}
      currentFormatting={{ isBold: editor.isActive('bold'), isUnderlined: editor.isActive('underline'), isItalic: editor.isActive('italic'), fontSize: editor.getAttributes('textStyle').fontSize ?? '1rem' }}
      onToggleBold={() => editor.chain().focus().toggleBold().run()}
      onToggleUnderline={() => editor.chain().focus().toggleUnderline().run()}
      onFontSizeChange={fontSize => editor.chain().focus().setMark('textStyle', { fontSize }).run()} />
    <div className="flex w-full rounded-md border border-light-navy bg-dark-navy px-3 py-2 text-sm text-white ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-auto min-h-[200px] max-h-[600px]">
      <EditorContent className="w-full" editor={editor} />
    </div>
  </div>;
}
