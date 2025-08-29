import Alpine from './../src/index'

(window as any).Alpine = Alpine

queueMicrotask(() => {
    Alpine.start()
})
