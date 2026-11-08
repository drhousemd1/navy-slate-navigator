import React from 'react';
import type { ContentDocument, TextMarks } from '@/types/encyclopedia';
function markStyle(marks: TextMarks = {}): React.CSSProperties {
  return { fontWeight: marks.bold === true ? 'bold' : marks.bold === false ? 'normal' : undefined,
    fontStyle: marks.italic === true ? 'italic' : marks.italic === false ? 'normal' : undefined,
    textDecoration: marks.underline === true ? 'underline' : marks.underline === false ? 'none' : undefined,
    fontSize: marks.fontSize };
}
export default function ArticleContent({ document }: { document: ContentDocument }) {
  return <>{document.blocks.map((block, index) => !block.children.some(child => child.type === 'text' && child.text.trim()) ? <div key={index} className="h-4" /> : <p key={index} className="text-lg mb-4 text-white whitespace-pre-wrap break-words">
    {block.children.map((child, i) => child.type === 'hardBreak' ? <br key={i} /> : <span key={i} style={markStyle(child.marks)}>{child.text}</span>)}
  </p>)}</>;
}
