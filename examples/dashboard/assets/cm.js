// ZCZS: Single-instance CM6 bundle via esm.sh dependency pinning
// All packages share one @codemirror/state instance to avoid instanceof breakage
const STATE_VER = '@codemirror/state@6.4.1';
const DEPS = `?deps=${STATE_VER}`;

const [
    { EditorState, Compartment },
    { EditorView, basicSetup },
    { javascript },
    { html },
    { oneDark }
] = await Promise.all([
    import(`https://esm.sh/${STATE_VER}`),
    import(`https://esm.sh/codemirror@6.0.1${DEPS}`),
    import(`https://esm.sh/@codemirror/lang-javascript@6.2.2${DEPS}`),
    import(`https://esm.sh/@codemirror/lang-html@6.4.9${DEPS}`),
    import(`https://esm.sh/@codemirror/theme-one-dark@6.1.2${DEPS}`)
]);

// Singleton registration
window.CM = { EditorState, EditorView, Compartment, basicSetup, javascript, html, oneDark };

// Dispatch: notify listeners that the CM singleton is available
window.dispatchEvent(new CustomEvent('nexus:cm-ready'));
