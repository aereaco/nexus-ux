import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

/**
 * Native Zero-Dependency GitHub Flavored Markdown (GFM) Parser
 * Seamlessly transpiles markdown strings into accessible, DOM-ready UI structures 
 * utilizing DaisyUI and Tailwind CSS utility classes.
 */

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
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    const lang = (rawLang || 'text').trim();
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    codeBlocks.push(
      `<div class="relative group my-4 rounded-xl overflow-hidden border border-base-content/10 bg-base-300 shadow-inner">` +
        `<div class="flex items-center justify-between px-4 py-1.5 bg-base-200/80 border-b border-base-content/5 text-xs font-mono text-base-content/70">` +
          `<span class="font-semibold uppercase tracking-wider">${lang}</span>` +
          `<button type="button" class="btn btn-ghost btn-xs gap-1 font-mono hover:text-primary transition-colors cursor-pointer" ` +
            `onclick="navigator.clipboard.writeText(this.closest('.relative').querySelector('code').textContent).then(()=>{ const self=this; const prev=self.innerText; self.innerText='Copied!'; setTimeout(()=>self.innerText=prev, 1500); })">` +
            `<svg class="size-3.5 inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>` +
            `Copy` +
          `</button>` +
        `</div>` +
        `<pre data-ignore class="p-4 overflow-x-auto text-sm font-mono text-base-content leading-relaxed"><code data-ignore class="language-${lang}">${escaped}</code></pre>` +
      `</div>`
    );
    return id;
  });

  // 2. Isolate Inline Code (`code`)
  html = html.replace(/`([^`]+)`/g, (_m, code) => {
    const id = `__INLINE_CODE_${inlineCodes.length}__`;
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    inlineCodes.push(
      `<code data-ignore class="bg-base-200 text-primary px-1.5 py-0.5 rounded font-mono text-sm border border-base-content/10">${escaped}</code>`
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
          cls: 'alert-info border-info/20 text-info-content bg-info/10',
          icon: 'material-symbols-light:info-outline',
          title: 'Note'
        },
        TIP: {
          cls: 'alert-success border-success/20 text-success-content bg-success/10',
          icon: 'material-symbols-light:lightbulb-outline',
          title: 'Tip'
        },
        IMPORTANT: {
          cls: 'alert-secondary border-secondary/20 text-secondary-content bg-secondary/10',
          icon: 'material-symbols-light:priority-high',
          title: 'Important'
        },
        WARNING: {
          cls: 'alert-warning border-warning/20 text-warning-content bg-warning/10',
          icon: 'material-symbols-light:warning-outline',
          title: 'Warning'
        },
        CAUTION: {
          cls: 'alert-error border-error/20 text-error-content bg-error/10',
          icon: 'material-symbols-light:dangerous-outline',
          title: 'Caution'
        }
      };

      const cfg = alertConfigs[type] || alertConfigs.NOTE;
      return (
        `<div class="alert ${cfg.cls} border shadow-sm my-4 rounded-xl p-3.5 flex items-start gap-3">` +
          `<iconify-icon icon="${cfg.icon}" class="text-2xl shrink-0 mt-0.5"></iconify-icon>` +
          `<div class="flex-1 min-w-0 text-sm">` +
            `<div class="font-bold mb-0.5">${cfg.title}</div>` +
            `<div class="leading-relaxed opacity-90">${content}</div>` +
          `</div>` +
        `</div>`
      );
    }

    const standardBody = lines.join('\n').trim();
    return `<blockquote class="border-l-4 border-primary/60 bg-primary/5 px-4 py-2.5 my-4 italic rounded-r-xl text-base-content opacity-90 leading-relaxed">${standardBody}</blockquote>`;
  });

  // 4. GFM Tables
  // Pattern matches table header, delimiter row (|:---|:---:|---:|), and body rows
  html = html.replace(/((?:^\|[^\n]+\|\r?\n)(?:^\|[\s-:]+\|\r?\n)(?:^\|[^\n]+\|\r?\n?)+)/gm, (tableBlock) => {
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
      if (left && right) return 'text-center';
      if (right) return 'text-right';
      return 'text-left';
    });

    const thead = `<thead><tr class="border-b border-base-content/10 bg-base-200/50">` +
      headers.map((h, i) => `<th class="px-4 py-2.5 font-semibold text-xs tracking-wider uppercase ${alignments[i] || 'text-left'}">${h}</th>`).join('') +
      `</tr></thead>`;

    const bodyRows = rows.slice(2).map(row => {
      const cells = parseCells(row);
      return `<tr class="border-b border-base-content/5 hover:bg-base-200/30 transition-colors">` +
        cells.map((c, i) => `<td class="px-4 py-2 text-sm ${alignments[i] || 'text-left'}">${c}</td>`).join('') +
        `</tr>`;
    }).join('');

    const tbody = `<tbody>${bodyRows}</tbody>`;

    return (
      `<div class="overflow-x-auto my-4 rounded-xl border border-base-content/10 bg-base-100 shadow-sm">` +
        `<table class="table table-sm table-zebra w-full text-base-content">${thead}${tbody}</table>` +
      `</div>`
    );
  });

  // 5. Headings with Slug IDs and Anchor Links
  html = html.replace(/^(#{1,6})\s+(.*$)/gm, (_m, hashes, title) => {
    const level = hashes.length;
    const cleanTitle = title.trim();
    const slug = slugify(cleanTitle);

    const sizes: Record<number, string> = {
      1: 'text-3xl font-extrabold mt-8 mb-4 tracking-tight border-b border-base-content/10 pb-2',
      2: 'text-2xl font-bold mt-7 mb-3 border-b border-base-content/10 pb-1.5',
      3: 'text-xl font-bold mt-6 mb-2.5',
      4: 'text-lg font-semibold mt-5 mb-2',
      5: 'text-base font-semibold mt-4 mb-1.5',
      6: 'text-sm font-semibold mt-3 mb-1 uppercase tracking-wider text-base-content/70'
    };

    const cls = sizes[level] || sizes[2];
    return (
      `<h${level} id="${slug}" class="${cls} text-base-content flex items-center group">` +
        `<span>${cleanTitle}</span>` +
        `<a href="#${slug}" class="opacity-0 group-hover:opacity-40 hover:!opacity-100 ms-2 text-primary transition-opacity text-sm font-mono" aria-label="Permalink to ${cleanTitle}">#</a>` +
      `</h${level}>`
    );
  });

  // 6. Horizontal Rules (---, ***, ___)
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<div class="divider my-6"></div>');

  // 7. GFM Task Lists & Regular Lists
  // Task lists: - [ ] or - [x]
  html = html.replace(/^\s*-\s+\[([ xX])\]\s+(.*$)/gm, (_m, check, text) => {
    const isChecked = check.toLowerCase() === 'x';
    const checkedAttr = isChecked ? 'checked' : '';
    const textCls = isChecked ? 'line-through opacity-60' : 'text-base-content';
    return (
      `<li class="flex items-start gap-2.5 list-none py-1 text-sm">` +
        `<input type="checkbox" ${checkedAttr} disabled class="checkbox checkbox-xs checkbox-primary mt-0.5 shrink-0" />` +
        `<span class="${textCls}">${text}</span>` +
      `</li>`
    );
  });

  // Unordered lists (- or * or +)
  html = html.replace(/^\s*[-*+]\s+(.*$)/gm, '<li class="ml-6 list-disc marker:text-primary/60 py-0.5 text-base-content text-sm leading-relaxed">$1</li>');

  // Ordered lists (1. 2. etc)
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gm, '<li class="ml-6 list-decimal marker:text-primary/60 py-0.5 text-base-content text-sm leading-relaxed">$2</li>');

  // Wrap consecutive <li> into <ul> or <ol>
  html = html.replace(/(<li class="[^"]*list-disc[^"]*"[^>]*>[\s\S]*?<\/li>\s*)+/g, match => `<ul class="my-3 space-y-0.5">\n${match}</ul>\n`);
  html = html.replace(/(<li class="[^"]*list-decimal[^"]*"[^>]*>[\s\S]*?<\/li>\s*)+/g, match => `<ol class="my-3 space-y-0.5">\n${match}</ol>\n`);
  html = html.replace(/(<li class="[^"]*list-none[^"]*"[^>]*>[\s\S]*?<\/li>\s*)+/g, match => `<ul class="my-3 space-y-0.5 pl-0">\n${match}</ul>\n`);

  // 8. Inline Typography Formatting
  // Strikethrough (~~text~~)
  html = html.replace(/~~(.*?)~~/g, '<del class="line-through opacity-70">$1</del>');

  // Bold & Italic (***text***)
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold text-base-content"><em>$1</em></strong>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-base-content">$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong class="font-bold text-base-content">$1</strong>');

  // Italic (*text* or _text_)
  html = html.replace(/\*(.*?)\*/g, '<em class="italic opacity-90">$1</em>');
  html = html.replace(/(^|\s)_(.*?)_(\s|$)/g, '$1<em class="italic opacity-90">$2</em>$3');

  // Images (![alt](url))
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-xl max-w-full my-4 shadow-md border border-base-content/10" loading="lazy" />');

  // Standard Links ([text](url))
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const isExt = url.startsWith('http://') || url.startsWith('https://');
    const target = isExt ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${url}" class="link link-primary hover:underline transition-colors font-medium"${target}>${text}</a>`;
  });

  // GFM Autolinks for raw URLs
  html = html.replace(/(^|[^"'])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" class="link link-primary hover:underline transition-colors font-medium" target="_blank" rel="noopener noreferrer">$2</a>');

  // 9. Paragraph Processing
  html = html.split('\n\n').map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // Skip wrapping if block already starts with block-level HTML tags or code block placeholder
    if (/^<(\/?(?:div|h[1-6]|ul|ol|li|table|blockquote|pre|p)|__CODE_BLOCK_)/i.test(trimmed)) {
      return trimmed;
    }
    return `<p class="mb-3 leading-relaxed opacity-90 text-base-content text-sm">${trimmed.replace(/\n/g, '<br />')}</p>`;
  }).filter(Boolean).join('\n\n');

  // 10. Restore Preserved Tokens
  html = html.replace(/__INLINE_CODE_(\d+)__/g, (_match, idx) => inlineCodes[parseInt(idx, 10)]);
  html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_match, idx) => codeBlocks[parseInt(idx, 10)]);

  return html;
}

const markdownModule: AttributeModule = {
  name: 'markdown',
  attribute: 'markdown',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    const render = () => {
      // Evaluate if value exists, else parse internal HTML
      const content = value ? runtime.evaluate(el, value) : (el.textContent || el.innerText);
      const mdText = String(content || '').trim();
      
      if (!el.classList.contains('nexus-markdown-body')) {
        el.classList.add('nexus-markdown-body', 'font-sans', 'antialiased');
      }
      
      const transpiled = parseMarkdown(mdText);
      if (el.innerHTML !== transpiled) {
        el.innerHTML = transpiled;
      }
    };

    if (value) {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, render);
      return cleanup;
    } else {
      render();
    }
  }
};

export default markdownModule;

