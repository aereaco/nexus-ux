const text = `({
        docTitle: 'data-show',
        docDescription: 'This page demonstrates layout toggling modifying the native <code>display</code> CSS property via <code>data-show</code>.',
        docSyntax: '&lt;div data-show=\\'isVisible\\'&gt;Toggled Display&lt;/div&gt;',
        docSourceModule: '/modules/attributes/show.ts',
        docSnippetModule: 'data-show',
        docExtensibility: '',
        docSource: '',
        docSnippet: ''
    })`;

try {
  const f = new Function('return ' + text);
  console.log("Success:", Object.keys(f()));
} catch(e) {
  console.error("Syntax Error:", e);
}
