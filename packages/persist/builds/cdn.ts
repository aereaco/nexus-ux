import persist from '../src/index.js'

document.addEventListener('alpine:init', () => {
    (window as any).Alpine.plugin(persist)
})