import React from 'react';
import type { ContentDocument, TextMarks } from '@/types/encyclopedia';
function markStyle(marks: TextMarks = {}): React.CSSProperties {
  return { fontWeight: marks.bold === true ? 'bold' : marks.bold === false ? 'normal' : undefined,
    fontStyle: marks.italic === true ? 'italic' : marks.italic === false ? 'normal' : undefined,
    textDecoration: marks.underline === true ? 'underline' : marks.underline === false ? 'none' : undefined,
    fontSize: marks.fontSize };
}
export default function ArticleContent({ document }: { document: ContentDocument }) {
  return <>{document.blocks.map((block, index) => <p key={index} className="text-lg mb-4 text-foreground whitespace-pre-wrap min-h-4 break-words">
    {block.children.map((child, i) => child.type === 'hardBreak' ? <br key={i} /> : <span key={i} style={markStyle(child.marks)}>{child.text}</span>)}
  </p>)}</>;
}
