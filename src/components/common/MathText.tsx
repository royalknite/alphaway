import React from 'react';

/**
 * Textbook-grade Math Renderer for AlphaWay.
 * Supports:
 * 1. Inline & display LaTeX ($...$, $$...$$, \(...\), \[...\], and bare \frac/\sqrt)
 * 2. MathML (<math>...</math>) converted into the same crisp stacked layout
 * 3. Plain-text fractions (1/2, n/m, √3/2, (a+b)/(c+d), ³¹⁄₄₇, ½) & nested roots (√(10 + 4√6))
 */

type MathNode =
  | { type: 'text'; value: string }
  | { type: 'fn'; value: string }
  | { type: 'frac'; num: MathNode[]; den: MathNode[] }
  | { type: 'sqrt'; content: MathNode[]; index?: MathNode[] }
  | { type: 'sup'; base: MathNode[]; exp: MathNode[] }
  | { type: 'sub'; base: MathNode[]; sub: MathNode[] }
  | { type: 'delim'; left: string; right: string; content: MathNode[] }
  | { type: 'group'; content: MathNode[] };

const VULGAR_FRACTIONS: Record<string, [string, string]> = {
  '½': ['1', '2'],
  '⅓': ['1', '3'],
  '⅔': ['2', '3'],
  '¼': ['1', '4'],
  '¾': ['3', '4'],
  '⅕': ['1', '5'],
  '⅖': ['2', '5'],
  '⅗': ['3', '5'],
  '⅘': ['4', '5'],
  '⅙': ['1', '6'],
  '⅚': ['5', '6'],
  '⅐': ['1', '7'],
  '⅛': ['1', '8'],
  '⅜': ['3', '8'],
  '⅝': ['5', '8'],
  '⅞': ['7', '8'],
  '⅑': ['1', '9'],
  '⅒': ['1', '10']
};

const SUPER_DIGITS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
};

const SUB_DIGITS: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
};

const LATEX_SYMBOLS: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', Gamma: 'Γ', delta: 'δ', Delta: 'Δ',
  epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', Theta: 'Θ',
  vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', Lambda: 'Λ', mu: 'μ',
  nu: 'ν', xi: 'ξ', pi: 'π', Pi: 'Π', rho: 'ρ', sigma: 'σ', Sigma: 'Σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', Phi: 'Φ', chi: 'χ',
  psi: 'ψ', Psi: 'Ψ', omega: 'ω', Omega: 'Ω',
  times: '×', div: '÷', pm: '±', mp: '∓', cdot: '·', ast: '∗', star: '⋆',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈',
  equiv: '≡', sim: '∼', propto: '∝', simeq: '≃', cong: '≅',
  circ: '°', degree: '°', angle: '∠', triangle: '△', parallel: '∥', perp: '⊥',
  infty: '∞', therefore: '∴', because: '∵',
  to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐',
  leftrightarrow: '↔', Leftrightarrow: '⇔',
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃',
  cup: '∪', cap: '∩', emptyset: '∅', varnothing: '∅', forall: '∀', exists: '∃',
  prime: '′', ldots: '…', cdots: '⋯', vdots: '⋮',
  '%': '%', '{': '{', '}': '}', '&': '&', '#': '#', _: '_', $: '$',
  ',': ' ', ';': ' ', ':': ' ', quad: '  ', qquad: '    ', ' ': ' '
};

const LATEX_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'cosec',
  'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
  'log', 'ln', 'lg', 'exp', 'lim', 'max', 'min', 'sup', 'inf', 'det', 'gcd', 'lcm', 'mod'
]);

const NON_MATH_SLASH_PAIRS = new Set([
  'km/h', 'km/hr', 'm/s', 'cm/s', 'ft/s', 'mi/h',
  'n/a', 'c/o', 'w/o', 'i/o', 'a/c', 'p/a', 's/o', 'd/o', 'w/e', 'b/w'
]);

function normalizeSuperSubDigits(str: string): string {
  return str
    .split('')
    .map((ch) => SUPER_DIGITS[ch] ?? SUB_DIGITS[ch] ?? ch)
    .join('');
}

function findMatchingDelim(src: string, openIdx: number, openChar: string, closeChar: string): number {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '\\' && i + 1 < src.length) {
      i++;
      continue;
    }
    if (src[i] === openChar) depth++;
    else if (src[i] === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function isSimpleParenGroup(node: MathNode): node is { type: 'group'; content: MathNode[] } {
  return node.type === 'group';
}

function isTallNode(nodes: MathNode[]): boolean {
  return nodes.some((n) => {
    if (n.type === 'frac' || n.type === 'sqrt' || n.type === 'delim') return true;
    if (n.type === 'group') return isTallNode(n.content);
    if (n.type === 'sup') return isTallNode(n.base) || isTallNode(n.exp);
    if (n.type === 'sub') return isTallNode(n.base);
    return false;
  });
}

function hasNestedSqrt(nodes: MathNode[]): boolean {
  return nodes.some((n) => {
    if (n.type === 'sqrt' || n.type === 'frac') return true;
    if (n.type === 'group' || n.type === 'delim') return hasNestedSqrt(n.content);
    if (n.type === 'sup') return hasNestedSqrt(n.base) || hasNestedSqrt(n.exp);
    if (n.type === 'sub') return hasNestedSqrt(n.base) || hasNestedSqrt(n.sub);
    return false;
  });
}

function nodesOnlyDegree(nodes: MathNode[]): boolean {
  return nodes.length === 1 && nodes[0].type === 'text' && nodes[0].value.trim() === '°';
}

// ============================================================================
// 1. LaTeX Parser -> MathNode[]
// ============================================================================

function parseLatex(input: string): MathNode[] {
  let pos = 0;
  const len = input.length;

  const skipSpaces = () => {
    while (pos < len && /\s/.test(input[pos])) pos++;
  };

  const readBracedGroup = (): string => {
    skipSpaces();
    if (pos >= len) return '';
    if (input[pos] === '{') {
      const end = findMatchingDelim(input, pos, '{', '}');
      if (end >= 0) {
        const inner = input.slice(pos + 1, end);
        pos = end + 1;
        return inner;
      }
      const rest = input.slice(pos + 1);
      pos = len;
      return rest;
    }
    if (input[pos] === '\\') {
      const start = pos;
      pos++;
      if (pos < len && /[a-zA-Z]/.test(input[pos])) {
        while (pos < len && /[a-zA-Z]/.test(input[pos])) pos++;
      } else if (pos < len) {
        pos++;
      }
      return input.slice(start, pos);
    }
    const ch = input[pos];
    pos++;
    return ch;
  };

  const readArgumentNodes = (): MathNode[] => {
    skipSpaces();
    if (pos >= len) return [];
    if (input[pos] === '{') {
      const raw = readBracedGroup();
      return parseLatex(raw);
    }
    const atom = parsePrimary();
    return atom ? [atom] : [];
  };

  const readUntilRight = (): { content: MathNode[]; right: string } => {
    const start = pos;
    let depth = 1;
    while (pos < len) {
      if (input.startsWith('\\left', pos) && (pos + 5 >= len || !/[a-zA-Z]/.test(input[pos + 5]))) {
        depth++;
        pos += 5;
        continue;
      }
      if (input.startsWith('\\right', pos) && (pos + 6 >= len || !/[a-zA-Z]/.test(input[pos + 6]))) {
        depth--;
        if (depth === 0) {
          const inner = input.slice(start, pos);
          pos += 6;
          skipSpaces();
          let rightDelim = '';
          if (pos < len) {
            if (input.startsWith('\\{', pos)) {
              rightDelim = '{';
              pos += 2;
            } else if (input.startsWith('\\}', pos)) {
              rightDelim = '}';
              pos += 2;
            } else if (input.startsWith('\\|', pos)) {
              rightDelim = '‖';
              pos += 2;
            } else {
              rightDelim = input[pos] === '.' ? '' : input[pos];
              pos++;
            }
          }
          return { content: parseLatex(inner), right: rightDelim };
        }
        pos += 6;
        continue;
      }
      pos++;
    }
    return { content: parseLatex(input.slice(start)), right: '' };
  };

  const parsePrimary = (): MathNode | null => {
    if (pos >= len) return null;

    if (/\s/.test(input[pos])) {
      while (pos < len && /\s/.test(input[pos])) pos++;
      return { type: 'text', value: ' ' };
    }

    const ch = input[pos];

    // Unicode root inside LaTeX
    if (ch === '√') {
      pos++;
      skipSpaces();
      if (pos < len && input[pos] === '(') {
        const end = findMatchingDelim(input, pos, '(', ')');
        if (end >= 0) {
          const inner = input.slice(pos + 1, end);
          pos = end + 1;
          return { type: 'sqrt', content: parseLatex(inner) };
        }
      }
      if (pos < len && input[pos] === '{') {
        return { type: 'sqrt', content: parseLatex(readBracedGroup()) };
      }
      const next = parsePrimary();
      return { type: 'sqrt', content: next ? [next] : [] };
    }

    // Vulgar fraction inside LaTeX
    if (VULGAR_FRACTIONS[ch]) {
      pos++;
      const [n, d] = VULGAR_FRACTIONS[ch];
      return { type: 'frac', num: [{ type: 'text', value: n }], den: [{ type: 'text', value: d }] };
    }

    // Braced group
    if (ch === '{') {
      const inner = readBracedGroup();
      return { type: 'group', content: parseLatex(inner) };
    }

    // Backslash command
    if (ch === '\\') {
      pos++;
      if (pos >= len) return null;

      let cmd = '';
      if (/[a-zA-Z]/.test(input[pos])) {
        while (pos < len && /[a-zA-Z]/.test(input[pos])) {
          cmd += input[pos];
          pos++;
        }
      } else {
        cmd = input[pos];
        pos++;
      }

      if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac' || cmd === 'cfrac') {
        const num = readArgumentNodes();
        const den = readArgumentNodes();
        return { type: 'frac', num, den };
      }

      if (cmd === 'sqrt') {
        skipSpaces();
        let index: MathNode[] | undefined;
        if (pos < len && input[pos] === '[') {
          const closeBracket = findMatchingDelim(input, pos, '[', ']');
          if (closeBracket >= 0) {
            index = parseLatex(input.slice(pos + 1, closeBracket));
            pos = closeBracket + 1;
          }
        }
        const content = readArgumentNodes();
        return { type: 'sqrt', content, index };
      }

      if (cmd === 'left') {
        skipSpaces();
        let leftDelim = '';
        if (pos < len) {
          if (input.startsWith('\\{', pos)) {
            leftDelim = '{';
            pos += 2;
          } else if (input.startsWith('\\}', pos)) {
            leftDelim = '}';
            pos += 2;
          } else if (input.startsWith('\\|', pos)) {
            leftDelim = '‖';
            pos += 2;
          } else {
            leftDelim = input[pos] === '.' ? '' : input[pos];
            pos++;
          }
        }
        const { content, right } = readUntilRight();
        return { type: 'delim', left: leftDelim, right, content };
      }

      if (cmd === 'right') {
        skipSpaces();
        if (pos < len) pos++;
        return null;
      }

      if (
        cmd === 'text' ||
        cmd === 'mathrm' ||
        cmd === 'mathbf' ||
        cmd === 'textbf' ||
        cmd === 'mathsf' ||
        cmd === 'operatorname' ||
        cmd === 'mbox'
      ) {
        const raw = readBracedGroup();
        if (cmd === 'operatorname') {
          return { type: 'fn', value: raw.trim() };
        }
        return { type: 'text', value: raw };
      }

      if (LATEX_FUNCTIONS.has(cmd)) {
        return { type: 'fn', value: cmd };
      }

      if (cmd in LATEX_SYMBOLS) {
        return { type: 'text', value: LATEX_SYMBOLS[cmd] };
      }

      if (cmd === '\\') {
        return { type: 'text', value: ' ' };
      }

      // Unknown LaTeX style command like \displaystyle / \limits -> ignore gracefully
      if (
        cmd === 'displaystyle' ||
        cmd === 'textstyle' ||
        cmd === 'scriptstyle' ||
        cmd === 'limits' ||
        cmd === 'nolimits' ||
        cmd === 'big' ||
        cmd === 'Big' ||
        cmd === 'bigg' ||
        cmd === 'Bigg'
      ) {
        return null;
      }

      return { type: 'text', value: cmd };
    }

    // Numbers or words
    if (/[0-9]/.test(ch)) {
      let numStr = '';
      while (pos < len && /[0-9.]/.test(input[pos])) {
        numStr += input[pos];
        pos++;
      }
      return { type: 'text', value: numStr };
    }

    if (/[a-zA-Z]/.test(ch)) {
      pos++;
      return { type: 'text', value: ch };
    }

    // Operators / punctuation
    pos++;
    if (ch === '-') return { type: 'text', value: '−' };
    if (ch === '*') return { type: 'text', value: '×' };
    return { type: 'text', value: ch };
  };

  const rawNodes: MathNode[] = [];

  while (pos < len) {
    // Handle stray ^ or _ at current position by attaching to previous non-space node
    if (input[pos] === '^' || input[pos] === '_') {
      const op = input[pos];
      pos++;
      const arg = readArgumentNodes();
      const prev = rawNodes.length > 0 ? rawNodes[rawNodes.length - 1] : null;
      if (op === '^' && nodesOnlyDegree(arg)) {
        rawNodes.push({ type: 'text', value: '°' });
        continue;
      }
      if (prev && !(prev.type === 'text' && prev.value.trim() === '')) {
        rawNodes.pop();
        if (op === '^') {
          rawNodes.push({ type: 'sup', base: [prev], exp: arg });
        } else {
          rawNodes.push({ type: 'sub', base: [prev], sub: arg });
        }
      } else if (op === '^') {
        rawNodes.push({ type: 'sup', base: [], exp: arg });
      } else {
        rawNodes.push({ type: 'sub', base: [], sub: arg });
      }
      continue;
    }

    const node = parsePrimary();
    if (!node) continue;

    // Attach postfix ^ and _ directly to the primary node
    let current: MathNode = node;
    while (pos < len) {
      let look = pos;
      while (look < len && /\s/.test(input[look])) look++;
      if (look < len && (input[look] === '^' || input[look] === '_')) {
        pos = look;
        const op = input[pos];
        pos++;
        const arg = readArgumentNodes();
        if (op === '^' && nodesOnlyDegree(arg)) {
          current = { type: 'group', content: [current, { type: 'text', value: '°' }] };
        } else if (op === '^') {
          current = { type: 'sup', base: [current], exp: arg };
        } else {
          current = { type: 'sub', base: [current], sub: arg };
        }
      } else {
        break;
      }
    }

    rawNodes.push(current);
  }

  return collapseSlashFractionsInNodes(rawNodes);
}

/**
 * Inside LaTeX blocks, if someone wrote `1/2`, `n/m`, or `\sqrt{3}/2` with `/`,
 * convert that numerator/denominator pair into a stacked `frac` node.
 */
function collapseSlashFractionsInNodes(nodes: MathNode[]): MathNode[] {
  const isBreakOp = (n: MathNode): boolean => {
    if (n.type !== 'text') return false;
    const v = n.value.trim();
    return ['+', '−', '-', '=', '<', '>', '≤', '≥', '≠', ',', ';', ':', '×', '÷', '±', '(', '['].includes(v);
  };

  const isCloseOp = (n: MathNode): boolean => {
    if (n.type !== 'text') return false;
    const v = n.value.trim();
    return [')', ']'].includes(v);
  };

  const out: MathNode[] = [];
  let i = 0;

  while (i < nodes.length) {
    const cur = nodes[i];
    if (cur.type === 'text' && cur.value === '/') {
      // Collect numerator tokens from `out` back to last break operator
      const num: MathNode[] = [];
      while (out.length > 0) {
        const top = out[out.length - 1];
        if (top.type === 'text' && top.value.trim() === '') {
          if (num.length > 0) break;
          out.pop();
          continue;
        }
        if (isBreakOp(top)) break;
        if (isCloseOp(top)) {
          // Try to capture balanced (...) from out
          let depth = 0;
          const parenSlice: MathNode[] = [];
          while (out.length > 0) {
            const p = out.pop()!;
            parenSlice.unshift(p);
            if (p.type === 'text' && p.value === ')') depth++;
            else if (p.type === 'text' && p.value === '(') {
              depth--;
              if (depth === 0) break;
            }
          }
          num.unshift(...parenSlice);
          continue;
        }
        num.unshift(out.pop()!);
      }

      // Collect denominator tokens ahead until next break operator
      let j = i + 1;
      while (j < nodes.length) {
        const peek = nodes[j];
        if (peek.type === 'text' && peek.value.trim() === '') j++;
        else break;
      }
      const den: MathNode[] = [];
      let parenDepth = 0;
      while (j < nodes.length) {
        const next = nodes[j];
        if (parenDepth === 0 && next.type === 'text' && next.value.trim() === '') {
          if (den.length > 0) break;
          j++;
          continue;
        }
        if (next.type === 'text' && next.value === '(') parenDepth++;
        else if (next.type === 'text' && next.value === ')') {
          if (parenDepth === 0) break;
          parenDepth--;
        } else if (parenDepth === 0 && (isBreakOp(next) || (next.type === 'text' && next.value === '/'))) {
          break;
        }
        den.push(next);
        j++;
      }

      if (num.length > 0 && den.length > 0) {
        const cleanNum = stripOuterParensFromNodes(num);
        const cleanDen = stripOuterParensFromNodes(den);
        out.push({ type: 'frac', num: cleanNum, den: cleanDen });
        i = j;
        continue;
      } else {
        out.push(...num, cur);
        i++;
        continue;
      }
    }

    out.push(cur);
    i++;
  }

  return out;
}

function stripOuterParensFromNodes(nodes: MathNode[]): MathNode[] {
  const firstNode = nodes[0];
  const lastNode = nodes[nodes.length - 1];
  if (
    nodes.length >= 3 &&
    firstNode.type === 'text' &&
    firstNode.value === '(' &&
    lastNode.type === 'text' &&
    lastNode.value === ')'
  ) {
    // Check balance
    let depth = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.type === 'text' && n.value === '(') depth++;
      else if (n.type === 'text' && n.value === ')') {
        depth--;
        if (depth === 0 && i < nodes.length - 1) return nodes;
      }
    }
    return nodes.slice(1, -1);
  }
  if (nodes.length === 1 && isSimpleParenGroup(nodes[0])) {
    return nodes[0].content;
  }
  return nodes;
}

// ============================================================================
// 2. MathML (<math>...</math>) Parser -> MathNode[]
// ============================================================================

function parseMathML(source: string): MathNode[] {
  if (typeof DOMParser === 'undefined') {
    return [{ type: 'text', value: source.replace(/<[^>]+>/g, ' ') }];
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(source, 'text/html');
    const mathEl = doc.querySelector('math') || doc.body;

    const convertEl = (el: Element): MathNode[] => {
      const tag = el.tagName.toLowerCase();
      const childEls = Array.from(el.children);

      switch (tag) {
        case 'math':
        case 'mrow':
        case 'mstyle':
        case 'mpadded':
        case 'semantics':
          return Array.from(el.childNodes).flatMap((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const v = node.textContent || '';
              return v ? [{ type: 'text', value: v } as MathNode] : [];
            }
            if (node.nodeType === Node.ELEMENT_NODE) {
              return convertEl(node as Element);
            }
            return [];
          });
        case 'mfrac': {
          const num = childEls[0] ? convertEl(childEls[0]) : [];
          const den = childEls[1] ? convertEl(childEls[1]) : [];
          return [{ type: 'frac', num, den }];
        }
        case 'msqrt': {
          const content = childEls.length
            ? childEls.flatMap(convertEl)
            : [{ type: 'text', value: el.textContent || '' } as MathNode];
          return [{ type: 'sqrt', content }];
        }
        case 'mroot': {
          const content = childEls[0] ? convertEl(childEls[0]) : [];
          const index = childEls[1] ? convertEl(childEls[1]) : undefined;
          return [{ type: 'sqrt', content, index }];
        }
        case 'msup': {
          const base = childEls[0] ? convertEl(childEls[0]) : [];
          const exp = childEls[1] ? convertEl(childEls[1]) : [];
          return [{ type: 'sup', base, exp }];
        }
        case 'msub': {
          const base = childEls[0] ? convertEl(childEls[0]) : [];
          const sub = childEls[1] ? convertEl(childEls[1]) : [];
          return [{ type: 'sub', base, sub }];
        }
        case 'msubsup': {
          const base = childEls[0] ? convertEl(childEls[0]) : [];
          const sub = childEls[1] ? convertEl(childEls[1]) : [];
          const exp = childEls[2] ? convertEl(childEls[2]) : [];
          return [{ type: 'sup', base: [{ type: 'sub', base, sub }], exp }];
        }
        case 'mfenced': {
          const left = el.getAttribute('open') ?? '(';
          const right = el.getAttribute('close') ?? ')';
          const content = childEls.flatMap(convertEl);
          return [{ type: 'delim', left, right, content }];
        }
        case 'annotation':
        case 'annotation-xml':
          return [];
        default: {
          const text = (el.textContent || '').trim();
          return text ? [{ type: 'text', value: text }] : [];
        }
      }
    };

    return convertEl(mathEl);
  } catch {
    return [{ type: 'text', value: source.replace(/<[^>]+>/g, ' ') }];
  }
}

// ============================================================================
// 3. Plain-Text Math Parser (1/2, n/m, √3/2, √(10 + 4√6), ³¹⁄₄₇, ½)
// ============================================================================

function looksLikeMathContent(inner: string): boolean {
  if (!inner.trim()) return false;
  // Never treat Hindi prose inside parens as math fraction
  if (/[\u0900-\u097F]/.test(inner)) return false;
  // Must contain math symbols/digits/single letters or trig function names
  return /[0-9√+\-−*=×÷^²³/]|\b(?:sin|cos|tan|cot|sec|csc|cosec|log|ln)\b/i.test(inner) || /^[a-zA-Zθ]\s*$/.test(inner.trim());
}

function isProtectedPlainToken(text: string, idx: number): number {
  const rest = text.slice(idx);
  // URLs
  const urlMatch = rest.match(/^https?:\/\/[^\s)]+/i);
  if (urlMatch) return urlMatch[0].length;
  // Dates like 09/10/2026 or 14/11/26
  const dateMatch = rest.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}\b/);
  if (dateMatch) return dateMatch[0].length;
  // Known non-math slash pairs (km/h, m/s, n/a, c/o, etc.)
  const pairMatch = rest.match(/^[a-zA-Z.]+\/[a-zA-Z.]+\b/);
  if (pairMatch && NON_MATH_SLASH_PAIRS.has(pairMatch[0].toLowerCase())) {
    return pairMatch[0].length;
  }
  return 0;
}

function parsePlainMath(input: string): MathNode[] {
  const nodes: MathNode[] = [];
  let pos = 0;
  const len = input.length;

  const pushText = (val: string) => {
    if (!val) return;
    const prev = nodes[nodes.length - 1];
    if (prev && prev.type === 'text') {
      prev.value += val;
    } else {
      nodes.push({ type: 'text', value: val });
    }
  };

  const readExponentOrSubscriptArg = (): MathNode[] | null => {
    if (pos >= len) return null;
    if (input[pos] === '{') {
      const end = findMatchingDelim(input, pos, '{', '}');
      if (end >= 0) {
        const inner = input.slice(pos + 1, end);
        pos = end + 1;
        return parsePlainMath(inner);
      }
    }
    if (input[pos] === '(') {
      const end = findMatchingDelim(input, pos, '(', ')');
      if (end >= 0) {
        const inner = input.slice(pos + 1, end);
        pos = end + 1;
        return parsePlainMath(inner);
      }
    }
    const simple = input.slice(pos).match(/^[-−+]?(?:\d+(?:\.\d+)?|[a-zA-Zθ])/);
    if (simple) {
      pos += simple[0].length;
      return parsePlainMath(simple[0]);
    }
    return null;
  };

  const readPlainDenominator = (): MathNode[] | null => {
    if (pos >= len) return null;
    const rest = input.slice(pos);

    // Prevent matching a/b/c as a fraction (likely a date or path)
    if (rest.startsWith('/')) return null;

    // 1. Parenthesized denominator: /(1 - √(cosec²A - 1)) or /(sin θ + cos θ - 1)
    if (input[pos] === '(') {
      const end = findMatchingDelim(input, pos, '(', ')');
      if (end >= 0) {
        const inner = input.slice(pos + 1, end);
        if (looksLikeMathContent(inner) && input[end + 1] !== '/') {
          pos = end + 1;
          return parsePlainMath(inner);
        }
      }
      return null;
    }

    // 2. Root denominator: /√( ... ) or /√2 or /√a
    if (input[pos] === '√') {
      const savedPos = pos;
      pos++;
      if (pos < len && input[pos] === '(') {
        const end = findMatchingDelim(input, pos, '(', ')');
        if (end >= 0 && input[end + 1] !== '/') {
          const inner = input.slice(pos + 1, end);
          pos = end + 1;
          return [{ type: 'sqrt', content: parsePlainMath(inner) }];
        }
      }
      const radMatch = input.slice(pos).match(/^(?:\d+(?:\.\d+)?|[a-zA-Zθ])(?:[²³])?/);
      if (radMatch && input[pos + radMatch[0].length] !== '/') {
        pos += radMatch[0].length;
        return [{ type: 'sqrt', content: [{ type: 'text', value: radMatch[0] }] }];
      }
      pos = savedPos;
      return null;
    }

    // 3. Number denominator: /2, /47, /2.5 (not followed by / or another letter)
    const numMatch = rest.match(/^\d+(?:\.\d+)?(?![/\d])/);
    if (numMatch) {
      // Avoid breaking things like "1/2nd" -> allow space, punct, operator, Hindi, or end
      const after = input[pos + numMatch[0].length];
      if (!after || !/[a-zA-Z]/.test(after)) {
        pos += numMatch[0].length;
        return [{ type: 'text', value: numMatch[0] }];
      }
    }

    // 4. Trig function call denominator: /sec(θ - 30°), /tan(A), /cos²(θ)
    const trigCallMatch = rest.match(/^(?:sin|cos|tan|cot|sec|csc|cosec)(?:\s*[²³])?\s*\(/i);
    if (trigCallMatch) {
      const openIdx = pos + trigCallMatch[0].length - 1;
      const closeIdx = findMatchingDelim(input, openIdx, '(', ')');
      if (closeIdx >= 0 && input[closeIdx + 1] !== '/') {
        const matched = input.slice(pos, closeIdx + 1);
        pos = closeIdx + 1;
        return parsePlainMath(matched);
      }
    }

    // 5. Single letter variable denominator: /m, /n, /x, /y (not followed by another letter or /)
    const varMatch = rest.match(/^[a-zA-Z](?![a-zA-Z0-9/])/);
    if (varMatch) {
      pos += 1;
      return [{ type: 'text', value: varMatch[0] }];
    }

    return null;
  };

  while (pos < len) {
    // 0. Check protected non-math tokens (URLs, dates, km/h, m/s, etc.)
    const protectedLen = isProtectedPlainToken(input, pos);
    if (protectedLen > 0) {
      pushText(input.slice(pos, pos + protectedLen));
      pos += protectedLen;
      continue;
    }

    const ch = input[pos];

    // 1. Unicode vulgar fractions (½, ⅓, ¾, etc.)
    if (VULGAR_FRACTIONS[ch]) {
      const [n, d] = VULGAR_FRACTIONS[ch];
      nodes.push({
        type: 'frac',
        num: [{ type: 'text', value: n }],
        den: [{ type: 'text', value: d }]
      });
      pos++;
      continue;
    }

    // 2. Unicode fraction slash U+2044: ³¹⁄₄₇, 1⁄12, ⁵⁄₁₈
    const unicodeFracMatch = input
      .slice(pos)
      .match(/^([⁰¹²³⁴⁵⁶⁷⁸⁹]+|\d+)⁄([₀₁₂₃₄₅₆₇₈₉]+|\d+)/);
    if (unicodeFracMatch) {
      const n = normalizeSuperSubDigits(unicodeFracMatch[1]);
      const d = normalizeSuperSubDigits(unicodeFracMatch[2]);
      nodes.push({
        type: 'frac',
        num: [{ type: 'text', value: n }],
        den: [{ type: 'text', value: d }]
      });
      pos += unicodeFracMatch[0].length;
      continue;
    }

    // 3. Radical sign √ (including nested √(10 + 4√6) and √3/2)
    if (ch === '√') {
      pos++;
      let sqrtNode: MathNode | null = null;

      if (pos < len && input[pos] === '(') {
        const end = findMatchingDelim(input, pos, '(', ')');
        if (end >= 0) {
          const inner = input.slice(pos + 1, end);
          pos = end + 1;
          sqrtNode = { type: 'sqrt', content: parsePlainMath(inner) };
        }
      } else if (pos < len && input[pos] === '{') {
        const end = findMatchingDelim(input, pos, '{', '}');
        if (end >= 0) {
          const inner = input.slice(pos + 1, end);
          pos = end + 1;
          sqrtNode = { type: 'sqrt', content: parsePlainMath(inner) };
        }
      } else {
        const radMatch = input.slice(pos).match(/^(?:\d+(?:\.\d+)?|[a-zA-Zθ])(?:[²³])?/);
        if (radMatch) {
          pos += radMatch[0].length;
          sqrtNode = { type: 'sqrt', content: [{ type: 'text', value: radMatch[0] }] };
        }
      }

      if (sqrtNode) {
        // Check if √... is immediately followed by /den (e.g. √3/2, √(5)/2)
        if (pos < len && input[pos] === '/' && input[pos + 1] !== '/') {
          const savedPos = pos;
          pos++;
          const den = readPlainDenominator();
          if (den) {
            nodes.push({ type: 'frac', num: [sqrtNode], den });
            continue;
          }
          pos = savedPos;
        }
        nodes.push(sqrtNode);
        continue;
      }

      pushText('√');
      continue;
    }

    // 4. Parenthesized expression followed by / or ^: (a + b)/(c + d) or (20 - 4√24)^(-1/2)
    if (ch === '(') {
      const end = findMatchingDelim(input, pos, '(', ')');
      if (end >= 0) {
        const inner = input.slice(pos + 1, end);
        const afterParen = input[end + 1];
        if (afterParen === '/' && looksLikeMathContent(inner)) {
          const savedPos = pos;
          pos = end + 2; // skip ) and /
          const den = readPlainDenominator();
          if (den) {
            nodes.push({ type: 'frac', num: parsePlainMath(inner), den });
            continue;
          }
          pos = savedPos;
        }
        if ((afterParen === '^' || afterParen === '_') && looksLikeMathContent(inner)) {
          const baseNodes: MathNode[] = [
            { type: 'text', value: '(' },
            ...parsePlainMath(inner),
            { type: 'text', value: ')' }
          ];
          pos = end + 1;
          const op = input[pos];
          pos++;
          const arg = readExponentOrSubscriptArg();
          if (arg) {
            if (op === '^') nodes.push({ type: 'sup', base: baseNodes, exp: arg });
            else nodes.push({ type: 'sub', base: baseNodes, sub: arg });
            continue;
          }
          // Fall back if arg wasn't readable
          nodes.push(...baseNodes);
          pushText(op);
          continue;
        }
      }
    }

    // 5. Exponent ^ or subscript _ attached to preceding token (e.g. x^2, A^(-1/2))
    if ((ch === '^' || ch === '_') && nodes.length > 0) {
      const prev = nodes[nodes.length - 1];
      if (prev.type !== 'text' || !/\s$/.test(prev.value)) {
        const savedPos = pos;
        pos++;
        const arg = readExponentOrSubscriptArg();
        if (arg) {
          // Pull only the trailing base word/number from a merged text node
          let baseNode: MathNode;
          if (prev.type === 'text') {
            const m = prev.value.match(/^(.*?)([a-zA-Z0-9θ]+)$/);
            if (m && m[2]) {
              prev.value = m[1];
              if (!prev.value) nodes.pop();
              baseNode = { type: 'text', value: m[2] };
            } else {
              nodes.pop();
              baseNode = prev;
            }
          } else {
            nodes.pop();
            baseNode = prev;
          }

          if (ch === '^') nodes.push({ type: 'sup', base: [baseNode], exp: arg });
          else nodes.push({ type: 'sub', base: [baseNode], sub: arg });
          continue;
        }
        pos = savedPos;
      }
    }

    // 6. Plain slash fractions: 1/2, 25/24, n/m, 2√3/5, tanA/(1 - √(...))
    // Make sure we are at a token boundary (not mid-word like PDF/Image)
    const prevChar = pos > 0 ? input[pos - 1] : '';
    const atTokenStart = !prevChar || !/[a-zA-Z0-9/]/.test(prevChar);
    if (atTokenStart) {
      // Check coefficient + √ + /den (e.g. 2√3/5)
      const coeffSqrtMatch = input.slice(pos).match(/^(\d+)√(\d+|[a-zA-Zθ])(?=\/)/);
      if (coeffSqrtMatch) {
        const savedPos = pos;
        pos += coeffSqrtMatch[0].length + 1; // skip coeff√rad and /
        const den = readPlainDenominator();
        if (den) {
          nodes.push({
            type: 'frac',
            num: [
              { type: 'text', value: coeffSqrtMatch[1] },
              { type: 'sqrt', content: [{ type: 'text', value: coeffSqrtMatch[2] }] }
            ],
            den
          });
          continue;
        }
        pos = savedPos;
      }

      // Check trig function call before / (e.g. tan(θ + 30°)/sec(θ - 30°))
      const trigNumMatch = input.slice(pos).match(/^(?:sin|cos|tan|cot|sec|csc|cosec)(?:\s*[²³])?\s*\(/i);
      if (trigNumMatch) {
        const openIdx = pos + trigNumMatch[0].length - 1;
        const closeIdx = findMatchingDelim(input, openIdx, '(', ')');
        if (closeIdx >= 0 && input[closeIdx + 1] === '/' && input[closeIdx + 2] !== '/') {
          const savedPos = pos;
          const numRaw = input.slice(pos, closeIdx + 1);
          pos = closeIdx + 2;
          const den = readPlainDenominator();
          if (den) {
            nodes.push({
              type: 'frac',
              num: parsePlainMath(numRaw),
              den
            });
            continue;
          }
          pos = savedPos;
        }
      }

      // Check pure number or single variable or trig atom before /
      const numAtomMatch = input
        .slice(pos)
        .match(/^(?:(\d+(?:\.\d+)?)|([a-zA-Z])|((?:sin|cos|tan|cot|sec|csc|cosec)\s*[A-Za-zθ]))(?=\/)/);
      if (numAtomMatch) {
        const matchedStr = numAtomMatch[0];
        // Check if this is part of a protected pair like n/a or m/s
        const fullPairCheck = input.slice(pos).match(/^[a-zA-Z]+\/[a-zA-Z]+/)?.[0]?.toLowerCase();
        if (!fullPairCheck || !NON_MATH_SLASH_PAIRS.has(fullPairCheck)) {
          const savedPos = pos;
          pos += matchedStr.length + 1; // skip numerator and /
          const den = readPlainDenominator();
          if (den) {
            nodes.push({
              type: 'frac',
              num: [{ type: 'text', value: matchedStr }],
              den
            });
            continue;
          }
          pos = savedPos;
        }
      }
    }

    pushText(ch);
    pos++;
  }

  return nodes;
}

// ============================================================================
// 4. React Renderer for MathNode[]
// ============================================================================

const DelimiterBracket: React.FC<{ symbol: string }> = ({ symbol }) => {
  if (!symbol) return null;
  if (symbol === '(') {
    return (
      <svg viewBox="0 0 8 100" preserveAspectRatio="none" aria-hidden="true" className="w-[0.38em] self-stretch shrink-0 overflow-visible">
        <path
          d="M 7 2 C 1.5 22, 1.5 78, 7 98"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  if (symbol === ')') {
    return (
      <svg viewBox="0 0 8 100" preserveAspectRatio="none" aria-hidden="true" className="w-[0.38em] self-stretch shrink-0 overflow-visible">
        <path
          d="M 1 2 C 6.5 22, 6.5 78, 1 98"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  if (symbol === '[') {
    return (
      <svg viewBox="0 0 8 100" preserveAspectRatio="none" aria-hidden="true" className="w-[0.36em] self-stretch shrink-0 overflow-visible">
        <path
          d="M 7 2 L 2 2 L 2 98 L 7 98"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  if (symbol === ']') {
    return (
      <svg viewBox="0 0 8 100" preserveAspectRatio="none" aria-hidden="true" className="w-[0.36em] self-stretch shrink-0 overflow-visible">
        <path
          d="M 1 2 L 6 2 L 6 98 L 1 98"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  if (symbol === '|') {
    return (
      <svg viewBox="0 0 4 100" preserveAspectRatio="none" aria-hidden="true" className="w-[0.24em] self-stretch shrink-0 overflow-visible">
        <path
          d="M 2 2 L 2 98"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  return <span className="inline-flex items-center px-[1px]">{symbol}</span>;
};

function renderMathNodes(nodes: MathNode[], keyPrefix = 'm'): React.ReactNode {
  return nodes.map((node, idx) => {
    const key = `${keyPrefix}_${idx}`;
    switch (node.type) {
      case 'text':
        return <React.Fragment key={key}>{node.value}</React.Fragment>;

      case 'fn':
        return (
          <span key={key} className="font-sans font-semibold tracking-tight mx-[1px]">
            {node.value}
          </span>
        );

      case 'group':
        return <React.Fragment key={key}>{renderMathNodes(node.content, key)}</React.Fragment>;

      case 'delim': {
        const tall = isTallNode(node.content);
        if (!tall) {
          return (
            <React.Fragment key={key}>
              {node.left}
              {renderMathNodes(node.content, key)}
              {node.right}
            </React.Fragment>
          );
        }
        return (
          <span key={key} className="inline-flex items-stretch align-middle mx-[1px]">
            {node.left && <DelimiterBracket symbol={node.left} />}
            <span className="inline-flex items-center px-[1px]">{renderMathNodes(node.content, key)}</span>
            {node.right && <DelimiterBracket symbol={node.right} />}
          </span>
        );
      }

      case 'frac':
        return (
          <span
            key={key}
            className="inline-flex flex-col items-center justify-center align-middle mx-[3px] my-[2px] leading-[1.15] text-[0.9em]"
          >
            <span className="px-1.5 pb-[2px] text-center whitespace-nowrap">
              {renderMathNodes(node.num, `${key}_n`)}
            </span>
            <span className="w-full border-t-[1.6px] border-current" />
            <span className="px-1.5 pt-[2px] text-center whitespace-nowrap">
              {renderMathNodes(node.den, `${key}_d`)}
            </span>
          </span>
        );

      case 'sqrt': {
        const nested = hasNestedSqrt(node.content);
        return (
          <span key={key} className="inline-flex items-stretch align-middle mx-[2px] my-[1px]">
            {node.index && node.index.length > 0 && (
              <sup className="text-[0.62em] font-bold leading-none self-start mt-[0.15em] -mr-[0.18em] z-10">
                {renderMathNodes(node.index, `${key}_idx`)}
              </sup>
            )}
            <svg
              viewBox="0 0 14 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="w-[0.68em] self-stretch shrink-0 overflow-visible"
            >
              <path
                d="M 0.6 58 L 3.4 51 L 7.0 95 L 13.4 1.2 L 14 1.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span
              className={`inline-flex items-center border-t-[1.65px] border-current -ml-[0.5px] pl-[2.5px] pr-[4px] ${
                nested ? 'pt-[4px]' : 'pt-[2px]'
              }`}
            >
              {renderMathNodes(node.content, `${key}_c`)}
            </span>
          </span>
        );
      }

      case 'sup': {
        const tallBase = isTallNode(node.base);
        if (tallBase) {
          return (
            <span key={key} className="inline-flex items-center align-middle">
              <span>{renderMathNodes(node.base, `${key}_b`)}</span>
              <sup className="text-[0.72em] leading-none self-start -mt-[0.15em] ml-[1px]">
                {renderMathNodes(node.exp, `${key}_e`)}
              </sup>
            </span>
          );
        }
        return (
          <span key={key} className="inline-flex items-baseline">
            <span>{renderMathNodes(node.base, `${key}_b`)}</span>
            <sup className="text-[0.74em] leading-none relative -top-[0.42em] ml-[0.5px]">
              {renderMathNodes(node.exp, `${key}_e`)}
            </sup>
          </span>
        );
      }

      case 'sub':
        return (
          <span key={key} className="inline-flex items-baseline">
            <span>{renderMathNodes(node.base, `${key}_b`)}</span>
            <sub className="text-[0.74em] leading-none relative top-[0.22em] ml-[0.5px]">
              {renderMathNodes(node.sub, `${key}_s`)}
            </sub>
          </span>
        );
    }
  });
}

// ============================================================================
// 5. Segment Splitter (LaTeX delimiters + MathML + Plain Text)
// ============================================================================

function looksLikeLatexDollarSegment(inner: string): boolean {
  const trimmed = inner.trim();
  if (!trimmed || trimmed.includes('\n')) return false;
  // Reject currency strings like "$50 and $100"
  if (/^\d[\d,.]*\s+[a-zA-Z\u0900-\u097F]/.test(trimmed) && !/[\\^_/{}=+\-*√]/.test(trimmed)) {
    return false;
  }
  return true;
}

interface TextSegment {
  kind: 'plain' | 'latex' | 'mathml';
  content: string;
}

function splitIntoMathSegments(source: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let i = 0;
  let plainStart = 0;
  const len = source.length;

  const flushPlain = (endIdx: number) => {
    if (endIdx > plainStart) {
      segments.push({ kind: 'plain', content: source.slice(plainStart, endIdx) });
    }
  };

  while (i < len) {
    // 1. MathML <math ...>...</math>
    if (source.slice(i, i + 5).toLowerCase() === '<math' && (i + 5 === len || /[\s>]/.test(source[i + 5]))) {
      const closeIdx = source.toLowerCase().indexOf('</math>', i);
      const endIdx = closeIdx >= 0 ? closeIdx + 7 : len;
      flushPlain(i);
      segments.push({ kind: 'mathml', content: source.slice(i, endIdx) });
      i = endIdx;
      plainStart = i;
      continue;
    }

    // 2. Display LaTeX $$...$$
    if (source.startsWith('$$', i)) {
      const closeIdx = source.indexOf('$$', i + 2);
      if (closeIdx > i + 2) {
        flushPlain(i);
        segments.push({ kind: 'latex', content: source.slice(i + 2, closeIdx) });
        i = closeIdx + 2;
        plainStart = i;
        continue;
      }
    }

    // 3. Display LaTeX \[...\]
    if (source.startsWith('\\[', i)) {
      const closeIdx = source.indexOf('\\]', i + 2);
      if (closeIdx > i + 2) {
        flushPlain(i);
        segments.push({ kind: 'latex', content: source.slice(i + 2, closeIdx) });
        i = closeIdx + 2;
        plainStart = i;
        continue;
      }
    }

    // 4. Inline LaTeX \(...\)
    if (source.startsWith('\\(', i)) {
      const closeIdx = source.indexOf('\\)', i + 2);
      if (closeIdx > i + 2) {
        flushPlain(i);
        segments.push({ kind: 'latex', content: source.slice(i + 2, closeIdx) });
        i = closeIdx + 2;
        plainStart = i;
        continue;
      }
    }

    // 5. Inline LaTeX $...$
    if (source[i] === '$' && (i === 0 || source[i - 1] !== '\\')) {
      let closeIdx = -1;
      for (let j = i + 1; j < len; j++) {
        if (source[j] === '\n') break;
        if (source[j] === '$' && source[j - 1] !== '\\') {
          closeIdx = j;
          break;
        }
      }
      if (closeIdx > i + 1) {
        const inner = source.slice(i + 1, closeIdx);
        if (looksLikeLatexDollarSegment(inner)) {
          flushPlain(i);
          segments.push({ kind: 'latex', content: inner });
          i = closeIdx + 1;
          plainStart = i;
          continue;
        }
      }
    }

    // 6. Bare \frac or \sqrt outside $...$
    if (source.startsWith('\\frac', i) || source.startsWith('\\dfrac', i) || source.startsWith('\\sqrt', i)) {
      // Read the bare LaTeX command and its brace arguments
      let endIdx = i + (source.startsWith('\\dfrac', i) ? 6 : 5);
      while (endIdx < len && /\s/.test(source[endIdx])) endIdx++;
      if (source[endIdx] === '[') {
        const bEnd = findMatchingDelim(source, endIdx, '[', ']');
        if (bEnd >= 0) endIdx = bEnd + 1;
      }
      const neededArgs = source.startsWith('\\sqrt', i) ? 1 : 2;
      let valid = true;
      for (let a = 0; a < neededArgs; a++) {
        while (endIdx < len && /\s/.test(source[endIdx])) endIdx++;
        if (source[endIdx] === '{') {
          const gEnd = findMatchingDelim(source, endIdx, '{', '}');
          if (gEnd >= 0) endIdx = gEnd + 1;
          else valid = false;
        } else {
          valid = false;
        }
      }
      if (valid) {
        flushPlain(i);
        segments.push({ kind: 'latex', content: source.slice(i, endIdx) });
        i = endIdx;
        plainStart = i;
        continue;
      }
    }

    i++;
  }

  flushPlain(len);
  return segments;
}

export function hasRichMathContent(text?: string | number | null): boolean {
  const s = String(text ?? '');
  if (!s) return false;
  if (/<math\b|\\(?:frac|dfrac|tfrac|sqrt)|\$[^$\n]+\$/i.test(s)) return true;
  if (/[√⁄½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]/.test(s)) return true;
  // Detect simple fractions like 1/2, n/m, (a+b)/(c+d) excluding dates & URLs
  const stripped = s.replace(/https?:\/\/\S+|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '');
  return /(?:^|[\s(=+\-−*×])(?:\([^)]+\)|\d+|[a-zA-Z])\/(?:\([^)]+\)|\d+|[a-zA-Z])(?![/\w])/.test(stripped);
}

interface MathTextProps {
  children?: string | number | null;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ children, className = '' }) => {
  const source = String(children ?? '');
  if (!source) return <span className={`math-text ${className}`} />;

  const segments = splitIntoMathSegments(source);

  return (
    <span className={`math-text ${className}`}>
      {segments.map((seg, index) => {
        if (seg.kind === 'latex') {
          const nodes = parseLatex(seg.content);
          return (
            <span
              key={index}
              className="math-expression inline-flex flex-wrap items-center align-middle leading-snug"
            >
              {renderMathNodes(nodes, `l_${index}`)}
            </span>
          );
        }

        if (seg.kind === 'mathml') {
          const nodes = parseMathML(seg.content);
          return (
            <span
              key={index}
              className="math-expression inline-flex flex-wrap items-center align-middle leading-snug"
            >
              {renderMathNodes(nodes, `ml_${index}`)}
            </span>
          );
        }

        // Plain segment: parse inline fractions, roots, and exponents cleanly while keeping prose intact
        const safePlain = seg.content.replace(
          /<\/?(?:math|mrow|mi|mn|mo|mtext|mfrac|msqrt|mroot|msup|msub|msubsup|mover|munder|munderover|mfenced|mtable|mtr|mtd|mspace|menclose)\b[^>]*>?/gi,
          ''
        );
        const nodes = parsePlainMath(safePlain);
        return <React.Fragment key={index}>{renderMathNodes(nodes, `p_${index}`)}</React.Fragment>;
      })}
    </span>
  );
};
