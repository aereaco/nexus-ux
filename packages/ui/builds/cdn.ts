import ui from '../src/index.js'

document.addEventListener('alpine:init', () => {
    (window as any).Alpine.plugin(ui)
})
