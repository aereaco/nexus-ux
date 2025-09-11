import ui from '../src/index.js'

document.addEventListener('state:init', () => {
    (window as any).State.plugin(ui)
})
