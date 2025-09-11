import persist from '../src/index.js'

document.addEventListener('state:init', () => {
    (window as any).State.plugin(persist)
})