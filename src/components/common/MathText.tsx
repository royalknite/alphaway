import React from 'react';

/**
 * Renders MathML expressions returned by PDF extraction. MathML is supported by
 * modern Chromium/Android WebView browsers, so fractions and nested radicals
 * remain formatted without a network dependency or a paid math service.
 */
const ALLOWED_TAGS = new Set([
  'math', 'mrow', 'mi', 'mn', 'mo', 'mtext', 'mfrac', 'msqrt', 'mroot',
  'msup', 'msub', 'msubsup', 'mover', 'munder', 'munderover', 'mfenced',
  'mtable', 'mtr', 'mtd', 'mspace', 'menclose'
]);
const ALLOWED_ATTRIBUTES = new Set([
  'xmlns', 'display', 'mathvariant', 'stretchy', 'fence', 'separator',
  'accent', 'accentunder', 'linethickness', 'displaystyle', 'scriptlevel',
  'notation', 'width', 'height', 'depth'
]);

function sanitizeMathML(source: string): string {
  return source.replace(/<\/?([a-zA-Z][\w:-]*)([^>]*)>/g, (whole, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return '';
    const closing = /^<\//.test(whole);
    if (closing) return `</${name}>`;
    const attrs: string[] = [];
    rawAttrs.replace(/([\w:-]+)\s*=\s*("[^"]*"|'[^']*')/g, (_: string, key: string, value: string) => {
      const normalizedKey = key.toLowerCase();
      if (ALLOWED_ATTRIBUTES.has(normalizedKey)) {
        const cleanValue = value.slice(1, -1).replace(/[<>]/g, '');
        attrs.push(`${normalizedKey}="${cleanValue}"`);
      }
      return '';
    });
    return `<${name}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;
  });
}

interface MathTextProps {
  children?: string | number | null;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ children, className = '' }) => {
  const source = String(children ?? '');
  const parts = source.split(/(<math\b[\s\S]*?<\/math>)/gi);
  return (
    <span className={`math-text ${className}`}>
      {parts.map((part, index) => {
        if (/^<math\b/i.test(part)) {
          return (
            <span
              key={index}
              className="math-expression"
              dangerouslySetInnerHTML={{ __html: sanitizeMathML(part) }}
            />
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
