import React from 'react';

/**
 * Safely renders MathML embedded in extracted question text.
 * Handles incomplete MathML returned by OCR/AI by repairing unclosed tags and
 * dropping incomplete attributes instead of showing raw XML to students.
 */
const ALLOWED_TAGS = new Set([
  'math', 'mrow', 'mi', 'mn', 'mo', 'mtext', 'mfrac', 'msqrt', 'mroot',
  'msup', 'msub', 'msubsup', 'mover', 'munder', 'munderover', 'mfenced',
  'mtable', 'mtr', 'mtd', 'mspace', 'menclose'
]);
const VOID_TAGS = new Set(['mspace']);

function repairAndSanitizeMathML(source: string): string {
  // Remove an unfinished final tag/attribute (for example: <mi mathvariant=).
  const input = source.replace(/<[^>]*$/s, '');
  const stack: string[] = [];
  let output = '';
  const tokenRe = /<\/?([a-zA-Z][\w:-]*)(?:\s+[^<>]*?)?\s*\/?>/g;
  let match: RegExpExecArray | null;
  let last = 0;

  while ((match = tokenRe.exec(input))) {
    output += input.slice(last, match.index);
    last = tokenRe.lastIndex;
    const raw = match[0];
    const name = match[1].toLowerCase();
    if (!ALLOWED_TAGS.has(name)) continue;

    const closing = /^<\//.test(raw);
    const selfClosing = /\/>$/.test(raw) || VOID_TAGS.has(name);
    if (closing) {
      const stackIndex = stack.lastIndexOf(name);
      if (stackIndex >= 0) {
        while (stack.length > stackIndex) output += `</${stack.pop()}>`;
      }
      continue;
    }

    output += `<${name}>`;
    if (!selfClosing) stack.push(name);
  }
  output += input.slice(last).replace(/<[^>]*$/s, '');
  while (stack.length) output += `</${stack.pop()}>`;

  // MathML root must be present; wrap bare MathML fragments when needed.
  if (!/^\s*<math\b/i.test(output)) output = `<math>${output}</math>`;
  return output;
}

interface MathTextProps {
  children?: string | number | null;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ children, className = '' }) => {
  const source = String(children ?? '');
  const parts = source.split(/(<math\b[\s\S]*?(?:<\/math>|$))/gi);

  return (
    <span className={`math-text ${className}`}>
      {parts.map((part, index) => {
        if (!/^<math\b/i.test(part)) {
          // Never expose broken MathML markup as literal question text.
          const safeText = part.replace(/<\/?(?:math|mrow|mi|mn|mo|mtext|mfrac|msqrt|mroot|msup|msub|msubsup|mover|munder|munderover|mfenced|mtable|mtr|mtd|mspace|menclose)\b[^>]*>?/gi, '');
          return <React.Fragment key={index}>{safeText}</React.Fragment>;
        }

        const mathML = repairAndSanitizeMathML(part);
        return (
          <span
            key={index}
            className="math-expression inline-block align-middle"
            dangerouslySetInnerHTML={{ __html: mathML }}
          />
        );
      })}
    </span>
  );
};
