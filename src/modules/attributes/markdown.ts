import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

/**
 * Native Zero-Dependency Markdown Parser
 * Seamlessly transpiles string/text payloads into DOM-ready UI components 
 * strictly utilizing the framework's native utility CSS mapping for styling.
 */
const markdownModule: AttributeModule = {
  name: 'markdown',
  attribute: 'markdown',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    
    // Core ZCZS AST Transpiler
    const parseMarkdown = (md: string) => {
      let html = md || '';
      const codeBlocks: string[] = [];

      // 1. Isolate and Preserve Code Blocks
      //    (Prevents internal syntax from triggering other regex rules)
      html = html.replace(/```([a-z]*)\n([\s\S]*?)```/gim, (_match, lang, code) => {
         const id = `__CODE_BLOCK_${codeBlocks.length}__`;
         const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
         codeBlocks.push(
           `<pre class="bg-base-300 p-4 rounded-xl overflow-x-auto text-sm my-4 border border-base-200 font-mono shadow-inner text-base-content" data-lang="${lang}"><code>${escaped}</code></pre>`
         );
         return id;
      });

      // 2. Transpile Formatting
      html = html.replace(/`([^`]+)`/g, '<code class="bg-base-200 text-primary px-1.5 py-0.5 rounded font-mono text-sm">$1</code>');
      html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3 text-base-content">$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 border-b border-base-300 pb-2 border-opacity-50 text-base-content">$1</h2>');
      html = html.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-extrabold mt-10 mb-6 tracking-tight text-base-content">$1</h1>');
      html = html.replace(/^\s*> (.*$)/gim, '<blockquote class="border-l-4 border-primary bg-primary/5 pl-4 py-2 my-4 italic opacity-90 rounded-r-lg text-base-content">$1</blockquote>');
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-base-content">$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em class="italic opacity-90">$1</em>');
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="link link-primary hover:text-primary-focus transition-colors">$1</a>');

      // 3. Transpile Lists
      html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-6 list-disc marker:text-primary/50 py-0.5 text-base-content">$1</li>');
      html = html.replace(/(<li class="ml-6 list-disc[^>]*>.*<\/li>[\s\n]*)+/gim, match => `<ul class="mt-2 mb-4 space-y-1">\n${match}</ul>\n`);

      // 4. Transpile Paragraphs
      html = html.split('\n').map(line => {
         const trimmed = line.trim();
         if (trimmed.length > 0 && !trimmed.startsWith('<') && !trimmed.startsWith('__CODE_BLOCK_')) {
            return `<p class="mb-4 leading-relaxed opacity-90 text-base-content">${trimmed}</p>`;
         }
         return line;
      }).join('\n');

      // 5. Restore Code Blocks
      html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_match, idx) => codeBlocks[parseInt(idx, 10)]);

      return html;
    };

    const render = () => {
       // Evaluate if value exists, else parse internal HTML
       const content = value ? runtime.evaluate(el, value) : (el.innerHTML || el.innerText);
       const mdText = String(content || '').trim();
       
       if (!el.classList.contains('nexus-markdown-body')) {
           el.classList.add('nexus-markdown-body', 'font-sans', 'antialiased');
       }
       
       const transpiled = parseMarkdown(mdText);
       if (el.innerHTML !== transpiled) {
           // We deploy morphDOM here conceptually, but a hard innerHTML drop avoids mutating parsed text bounds
           el.innerHTML = transpiled;
           runtime.processElement(el);
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
