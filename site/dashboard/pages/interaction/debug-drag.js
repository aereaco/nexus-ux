window.checkDragEffect = () => {
    const dropZone = document.querySelector('[data-teleport\\:drop="list1"]');
    const templateNode = dropZone.querySelector('[data-ux-template="true"]');
    const EFFECT_RUNNERS_KEY = Symbol.for('__effect_runners__');
    console.log("Template Node:", templateNode);
    console.log("Effect runners:", templateNode ? templateNode[EFFECT_RUNNERS_KEY] : 'none');
};
