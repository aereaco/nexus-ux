export default function (Alpine: any) {
    Alpine.directive('resize', Alpine.skipDuringClone((el: any, { value, expression, modifiers }: any, { evaluateLater, cleanup }: any) => {
        let evaluator = evaluateLater(expression)

        let evaluate = (width: any, height: any) => {
            evaluator(() => {}, { scope: { '$width': width, '$height': height }})
        }

        let off = modifiers.includes('document')
            ? onDocumentResize(evaluate)
            : onElResize(el, evaluate)

        cleanup(() => off())
    }))
}

function onElResize(el: any, callback: any) {
    let observer = new ResizeObserver((entries: any) => {
        let [width, height] = dimensions(entries)

        callback(width, height)
    })

    observer.observe(el)

    return () => observer.disconnect()
}

let documentResizeObserver: any
let documentResizeObserverCallbacks = new Set

function onDocumentResize(callback: any) {
    documentResizeObserverCallbacks.add(callback)

    if (! documentResizeObserver) {
        documentResizeObserver = new ResizeObserver((entries: any) => {
            let [width, height] = dimensions(entries)

            documentResizeObserverCallbacks.forEach((i: any) => i(width, height))
        })

        documentResizeObserver.observe(document.documentElement)
    }

    return () => {
        documentResizeObserverCallbacks.delete(callback)
    }
}

function dimensions(entries: any) {
    let width: any, height: any

    for (let entry of entries) {
        width = entry.borderBoxSize[0].inlineSize
        height = entry.borderBoxSize[0].blockSize
    }

    return [width, height]
}
