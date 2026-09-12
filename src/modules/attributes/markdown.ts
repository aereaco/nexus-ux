import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { ensureAdoptedStylesheet } from '../../engine/utils/styles.ts';

/**
 * Native Zero-Dependency GitHub Flavored Markdown (GFM) Parser
 * Transpiles markdown strings into accessible, DOM-ready UI structures
 * styled via standard CSS custom properties and adopted stylesheets,
 * completely independent of any external CSS framework.
 */

const MARKDOWN_BASE_CSS = `
[data-markdown] {
  line-height: 1.65;
  color: inherit;
  word-break: break-word;
}

[data-markdown] h1, [data-markdown] .nexus-h1 {
  font-size: 2rem;
  font-weight: 800;
  margin-top: 2rem;
  margin-bottom: 1rem;
  letter-spacing: -0.025em;
  border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  padding-bottom: 0.5rem;
}
[data-markdown] h2, [data-markdown] .nexus-h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  padding-bottom: 0.375rem;
}
[data-markdown] h3, [data-markdown] .nexus-h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.625rem;
}
[data-markdown] h4, [data-markdown] .nexus-h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}
[data-markdown] h5, [data-markdown] .nexus-h5 {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.375rem;
}
[data-markdown] h6, [data-markdown] .nexus-h6 {
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}
[data-markdown] .nexus-heading {
  display: flex;
  align-items: center;
}
[data-markdown] .nexus-anchor-link {
  opacity: 0;
  margin-left: 0.5rem;
  text-decoration: none;
  color: var(--color-primary, #3b82f6);
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  transition: opacity 0.15s ease;
}
[data-markdown] .nexus-heading:hover .nexus-anchor-link {
  opacity: 0.45;
}
[data-markdown] .nexus-heading .nexus-anchor-link:hover {
  opacity: 1 !important;
}

[data-markdown] p, [data-markdown] .nexus-p {
  margin-bottom: 0.75rem;
  line-height: 1.65;
  font-size: 0.875rem;
}

[data-markdown] a.nexus-link, [data-markdown] a:not([class]) {
  color: var(--color-primary, #3b82f6);
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: 500;
  transition: color 0.15s ease;
}

[data-markdown] code.nexus-inline-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875em;
  padding: 0.15em 0.35em;
  border-radius: 0.25rem;
  background-color: color-mix(in srgb, currentColor 8%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  color: var(--color-primary, #3b82f6);
}

[data-markdown] .nexus-code-block {
  position: relative;
  margin: 1rem 0;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  background-color: color-mix(in srgb, currentColor 5%, transparent);
}
[data-markdown] .nexus-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 1rem;
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  background-color: color-mix(in srgb, currentColor 8%, transparent);
  border-bottom: 1px solid color-mix(in srgb, currentColor 8%, transparent);
  opacity: 0.8;
}
[data-markdown] .nexus-code-lang {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
[data-markdown] .nexus-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: transparent;
  border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
  border-radius: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-family: inherit;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
[data-markdown] .nexus-copy-btn:hover {
  background: color-mix(in srgb, currentColor 10%, transparent);
}
[data-markdown] .nexus-code-pre {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

[data-markdown] .nexus-blockquote {
  border-left: 4px solid var(--color-primary, #3b82f6);
  background-color: color-mix(in srgb, var(--color-primary, #3b82f6) 6%, transparent);
  padding: 0.625rem 1rem;
  margin: 1rem 0;
  font-style: italic;
  border-radius: 0 0.5rem 0.5rem 0;
  opacity: 0.95;
}

[data-markdown] .nexus-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin: 1rem 0;
  padding: 0.875rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
[data-markdown] .nexus-alert-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}
[data-markdown] .nexus-alert-body {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
}
[data-markdown] .nexus-alert-title {
  font-weight: 700;
  margin-bottom: 0.125rem;
}
[data-markdown] .nexus-alert-content {
  line-height: 1.6;
  opacity: 0.9;
}
[data-markdown] .nexus-alert-note {
  background-color: color-mix(in srgb, var(--color-info, #0284c7) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-info, #0284c7) 30%, transparent);
  color: var(--color-info-content, inherit);
}
[data-markdown] .nexus-alert-tip {
  background-color: color-mix(in srgb, var(--color-success, #16a34a) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-success, #16a34a) 30%, transparent);
  color: var(--color-success-content, inherit);
}
[data-markdown] .nexus-alert-important {
  background-color: color-mix(in srgb, var(--color-secondary, #9333ea) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-secondary, #9333ea) 30%, transparent);
  color: var(--color-secondary-content, inherit);
}
[data-markdown] .nexus-alert-warning {
  background-color: color-mix(in srgb, var(--color-warning, #d97706) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-warning, #d97706) 30%, transparent);
  color: var(--color-warning-content, inherit);
}
[data-markdown] .nexus-alert-caution {
  background-color: color-mix(in srgb, var(--color-error, #dc2626) 10%, transparent);
  border-color: color-mix(in srgb, var(--color-error, #dc2626) 30%, transparent);
  color: var(--color-error-content, inherit);
}

[data-markdown] .nexus-table-wrapper {
  overflow-x: auto;
  margin: 1rem 0;
  border-radius: 0.75rem;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}
[data-markdown] .nexus-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875rem;
}
[data-markdown] .nexus-table thead tr {
  background-color: color-mix(in srgb, currentColor 6%, transparent);
  border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}
[data-markdown] .nexus-table th {
  padding: 0.625rem 1rem;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
[data-markdown] .nexus-table td {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, currentColor 6%, transparent);
}
[data-markdown] .nexus-table tbody tr:hover {
  background-color: color-mix(in srgb, currentColor 4%, transparent);
}
[data-markdown] .nexus-align-left { text-align: left; }
[data-markdown] .nexus-align-center { text-align: center; }
[data-markdown] .nexus-align-right { text-align: right; }

[data-markdown] ul.nexus-list-ul, [data-markdown] ol.nexus-list-ol {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}
[data-markdown] li.nexus-list-item, [data-markdown] li.nexus-list-item-ordered {
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.6;
}
[data-markdown] ul.nexus-task-list {
  list-style: none;
  padding-left: 0;
  margin: 0.75rem 0;
}
[data-markdown] .nexus-task-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.25rem 0;
  font-size: 0.875rem;
}
[data-markdown] .nexus-checkbox {
  margin-top: 0.2rem;
  accent-color: var(--color-primary, #3b82f6);
}
[data-markdown] .nexus-task-done {
  text-decoration: line-through;
  opacity: 0.6;
}

[data-markdown] hr.nexus-divider, [data-markdown] .nexus-divider {
  border: none;
  border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  margin: 1.5rem 0;
}

[data-markdown] .nexus-img {
  max-width: 100%;
  height: auto;
  border-radius: 0.75rem;
  margin: 1rem 0;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}
`;

const markdownSheetRef: { sheet: CSSStyleSheet | null } = { sheet: null };

export function ensureMarkdownStyles(root?: Document | ShadowRoot | null) {
  ensureAdoptedStylesheet(MARKDOWN_BASE_CSS, markdownSheetRef, root);
}

if (typeof document !== 'undefined') {
  ensureMarkdownStyles();
}

// Helper to generate URL/anchor friendly slug IDs
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Core GFM Transpiler
export function parseMarkdown(md: string): string {
  let html = (md || '').replace(/\r\n/g, '\n');
  const codeBlocks: string[] = [];
  const inlineCodes: string[] = [];

  // 1. Isolate and Preserve Fenced Code Blocks (```lang ... ```)
  html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gim, (_match, rawLang, code) => {
    const id = `%%NEXUS_CODE_BLOCK_${codeBlocks.length}%%`;
    const lang = (rawLang || 'text').trim();
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    codeBlocks.push(
      `<div class="nexus-code-block">` +
        `<div class="nexus-code-header">` +
          `<span class="nexus-code-lang">${lang}</span>` +
          `<button type="button" class="nexus-copy-btn" ` +
            `onclick="navigator.clipboard.writeText(this.closest('.nexus-code-block').querySelector('code').textContent).then(()=>{ const self=this; const prev=self.innerText; self.innerText='Copied!'; setTimeout(()=>self.innerText=prev, 1500); })">` +
            `<svg width="14" height="14" style="display:inline-block; vertical-align: middle;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> ` +
            `<span>Copy</span>` +
          `</button>` +
        `</div>` +
        `<pre data-ignore class="nexus-code-pre"><code data-ignore class="language-${lang}">${escaped}</code></pre>` +
      `</div>`
    );
    return id;
  });

  // 2. Isolate Inline Code (`code`)
  html = html.replace(/`([^`]+)`/g, (_m, code) => {
    const id = `%%NEXUS_INLINE_CODE_${inlineCodes.length}%%`;
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    inlineCodes.push(
      `<code data-ignore class="nexus-inline-code">${escaped}</code>`
    );
    return id;
  });

  // 3. GFM Callout Alert Blocks & Blockquotes
  // Matches consecutive blockquote lines starting with ">"
  html = html.replace(/(?:^>[^\n]*(?:\n>[^\n]*)*)/gm, (block) => {
    const lines = block
      .split('\n')
      .map(l => l.replace(/^>\s?/, ''));
    const firstLine = lines[0].trim();
    const alertMatch = firstLine.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

    if (alertMatch) {
      const type = alertMatch[1].toUpperCase();
      const content = lines.slice(1).join('\n').trim();

      const alertConfigs: Record<string, { cls: string; icon: string; title: string }> = {
        NOTE: {
          cls: 'nexus-alert-note',
          icon: 'material-symbols-light:info-outline',
          title: 'Note'
        },
        TIP: {
          cls: 'nexus-alert-tip',
          icon: 'material-symbols-light:lightbulb-outline',
          title: 'Tip'
        },
        IMPORTANT: {
          cls: 'nexus-alert-important',
          icon: 'material-symbols-light:priority-high',
          title: 'Important'
        },
        WARNING: {
          cls: 'nexus-alert-warning',
          icon: 'material-symbols-light:warning-outline',
          title: 'Warning'
        },
        CAUTION: {
          cls: 'nexus-alert-caution',
          icon: 'material-symbols-light:dangerous-outline',
          title: 'Caution'
        }
      };

      const cfg = alertConfigs[type] || alertConfigs.NOTE;
      return (
        `<div class="nexus-alert ${cfg.cls}">` +
          `<iconify-icon icon="${cfg.icon}" class="nexus-alert-icon"></iconify-icon>` +
          `<div class="nexus-alert-body">` +
            `<div class="nexus-alert-title">${cfg.title}</div>` +
            `<div class="nexus-alert-content">${content}</div>` +
          `</div>` +
        `</div>`
      );
    }

    const standardBody = lines.join('\n').trim();
    return `<blockquote class="nexus-blockquote">${standardBody}</blockquote>`;
  });

  // 4. GFM Tables
  // Pattern matches table header, delimiter row (|:---|:---:|---:|), and body rows
  html = html.replace(/(?:^|\n)(\|[^\n]+\|\r?\n\|[ \t\-:|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g, (_fullMatch, tableBlock) => {
    const rows = tableBlock.trim().split('\n').map(r => r.trim());
    if (rows.length < 2) return tableBlock;

    const parseCells = (row: string) => {
      return row
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(c => c.trim());
    };

    const headers = parseCells(rows[0]);
    const alignments = parseCells(rows[1]).map(d => {
      const left = d.startsWith(':');
      const right = d.endsWith(':');
      if (left && right) return 'center';
      if (right) return 'right';
      return 'left';
    });

    const thead = `<thead><tr>` +
      headers.map((h, i) => `<th class="nexus-align-${alignments[i] || 'left'}">${h}</th>`).join('') +
      `</tr></thead>`;

    const bodyRows = rows.slice(2).map(row => {
      const cells = parseCells(row);
      return `<tr>` +
        cells.map((c, i) => `<td class="nexus-align-${alignments[i] || 'left'}">${c || ''}</td>`).join('') +
        `</tr>`;
    }).join('');

    const tbody = `<tbody>${bodyRows}</tbody>`;

    return (
      `\n\n<div class="nexus-table-wrapper">` +
        `<table class="nexus-table">${thead}${tbody}</table>` +
      `</div>\n\n`
    );
  });

  // 5. Headings with Slug IDs and Anchor Links
  html = html.replace(/^(#{1,6})\s+(.*$)/gm, (_m, hashes, title) => {
    const level = hashes.length;
    const cleanTitle = title.trim();
    const slug = slugify(cleanTitle);

    return (
      `\n\n<h${level} id="${slug}" class="nexus-heading nexus-h${level}">` +
        `<span>${cleanTitle}</span>` +
        `<a href="#${slug}" class="nexus-anchor-link" aria-label="Permalink to ${cleanTitle}">#</a>` +
      `</h${level}>\n\n`
    );
  });

  // 6. Horizontal Rules (---, ***, ___)
  html = html.replace(/^(?:---|[*]{3}|_{3})\s*$/gm, '\n\n<hr class="nexus-divider" />\n\n');

  // 7. GFM Task Lists & Regular Lists
  // Task lists: - [ ] or - [x]
  html = html.replace(/^\s*-\s+\[([ xX])\]\s+(.*$)/gm, (_m, check, text) => {
    const isChecked = check.toLowerCase() === 'x';
    const checkedAttr = isChecked ? 'checked' : '';
    const textCls = isChecked ? 'nexus-task-done' : '';
    return (
      `<li class="nexus-task-item">` +
        `<input type="checkbox" ${checkedAttr} disabled class="nexus-checkbox" />` +
        `<span class="${textCls}">${text}</span>` +
      `</li>`
    );
  });

  // Unordered lists (- or * or +)
  html = html.replace(/^\s*[-*+]\s+(.*$)/gm, '<li class="nexus-list-item">$1</li>');

  // Ordered lists (1. 2. etc)
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gm, '<li class="nexus-list-item-ordered">$2</li>');

  // Wrap consecutive <li> into <ul> or <ol>
  html = html.replace(/(<li class="nexus-list-item">[\s\S]*?<\/li>\s*)+/g, match => `\n\n<ul class="nexus-list-ul">\n${match}</ul>\n\n`);
  html = html.replace(/(<li class="nexus-list-item-ordered">[\s\S]*?<\/li>\s*)+/g, match => `\n\n<ol class="nexus-list-ol">\n${match}</ol>\n\n`);
  html = html.replace(/(<li class="nexus-task-item">[\s\S]*?<\/li>\s*)+/g, match => `\n\n<ul class="nexus-task-list">\n${match}</ul>\n\n`);

  // 8. Inline Typography Formatting
  // Strikethrough (~~text~~)
  html = html.replace(/~~(.*?)~~/g, '<del class="nexus-del">$1</del>');

  // Bold & Italic (***text***)
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/(^|\s)_(.*?)_(\s|$)/g, '$1<em>$2</em>$3');

  // Images (![alt](url))
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="nexus-img" loading="lazy" />');

  // Standard Links ([text](url))
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const isExt = url.startsWith('http://') || url.startsWith('https://');
    const target = isExt ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${url}" class="nexus-link"${target}>${text}</a>`;
  });

  // GFM Autolinks for raw URLs
  html = html.replace(/(^|[^"'])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" class="nexus-link" target="_blank" rel="noopener noreferrer">$2</a>');

  // 9. Paragraph Processing
  html = html.split('\n\n').map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // Skip wrapping if block already starts with block-level HTML tags or code block placeholder
    if (/^<(\/?(?:div|h[1-6]|ul|ol|li|table|blockquote|pre|p|hr)|%%NEXUS_CODE_BLOCK_)/i.test(trimmed)) {
      return trimmed;
    }
    return `<p class="nexus-p">${trimmed.replace(/\n/g, '<br />')}</p>`;
  }).filter(Boolean).join('\n\n');

  // 10. Restore Preserved Tokens
  html = html.replace(/%%NEXUS_INLINE_CODE_(\d+)%%/g, (_match, idx) => inlineCodes[parseInt(idx, 10)]);
  html = html.replace(/%%NEXUS_CODE_BLOCK_(\d+)%%/g, (_match, idx) => codeBlocks[parseInt(idx, 10)]);

  return html;
}

const markdownModule: AttributeModule = {
  name: 'markdown',
  attribute: 'markdown',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    ensureMarkdownStyles(el.getRootNode() as Document | ShadowRoot);

    // Idempotency guard: prevent double-processing on cold boots/refreshes
    if (!value && (el as any).__nexusMarkdownDone) {
      return () => {
        delete (el as any).__nexusMarkdownDone;
        delete (el as any).__nexusRawSource;
      };
    }
    if (!value) {
      (el as any).__nexusMarkdownDone = true;
    }

    if (!(el as any).__nexusRawSource) {
      (el as any).__nexusRawSource = value ? null : (el.textContent || el.innerText);
    }
    const initialSource = (el as any).__nexusRawSource;

    const render = () => {
      // Evaluate if value exists, else parse initial text content
      const content = value ? runtime.evaluate(el, value) : initialSource;
      const mdText = String(content || '').trim();
      
      if (!el.classList.contains('nexus-markdown-body')) {
        el.classList.add('nexus-markdown-body');
      }
      
      const transpiled = parseMarkdown(mdText);
      if (el.innerHTML !== transpiled) {
        el.innerHTML = transpiled;
      }
    };

    if (value) {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, render);
      return () => {
        delete (el as any).__nexusMarkdownDone;
        delete (el as any).__nexusRawSource;
        cleanup();
      };
    } else {
      render();
      return () => {
        delete (el as any).__nexusMarkdownDone;
        delete (el as any).__nexusRawSource;
      };
    }
  }
};

export default markdownModule;
