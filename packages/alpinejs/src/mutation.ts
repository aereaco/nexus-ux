import { dequeueJob } from "./scheduler";
let onAttributeAddeds: any[] = []
let onElRemoveds: any[] = []
let onElAddeds: any[] = []

export function onElAdded(callback: any) {
    onElAddeds.push(callback)
}

// Support two call styles: onElRemoved(callback) and onElRemoved(el, callback)
export function onElRemoved(elOrCallback: any, callback?: any) {
    if (callback === undefined) {
        // Called as onElRemoved(callback)
        onElRemoveds.push(elOrCallback)
        return
    }

    // Called as onElRemoved(el, callback)
    let el = elOrCallback

    if (typeof callback === 'function') {
        if (! el._data_cleanups) el._data_cleanups = []
        el._data_cleanups.push(callback)
    }
}

export function onAttributesAdded(callback: any) {
    onAttributeAddeds.push(callback)
}

export function onAttributeRemoved(el: any, name: any, callback: any) {
    if (! el._data_attributeCleanups) el._data_attributeCleanups = {}
    if (! el._data_attributeCleanups[name]) el._data_attributeCleanups[name] = []

    el._data_attributeCleanups[name].push(callback)
}

export function cleanupAttributes(el: any, names?: any) {
    if (! el._data_attributeCleanups) return

    Object.entries(el._data_attributeCleanups).forEach(([name, value]: any) => {
        if (names === undefined || (Array.isArray(names) && names.includes(name))) {
            value.forEach((i: any) => i())

            delete el._data_attributeCleanups[name]
        }
    })
}

export function cleanupElement(el: any) {
    el._data_effects?.forEach(dequeueJob)

    while (el._data_cleanups?.length) el._data_cleanups.pop()()
}

let observer = new MutationObserver(onMutate)

let currentlyObserving = false

export function startObservingMutations() {
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true })

    currentlyObserving = true
}

export function stopObservingMutations() {
    flushObserver()

    observer.disconnect()

    currentlyObserving = false
}

let queuedMutations: any[] = []

export function flushObserver() {
    let records = observer.takeRecords()

    queuedMutations.push(() => records.length > 0 && onMutate(records))

    let queueLengthWhenTriggered = queuedMutations.length

    queueMicrotask(() => {
        if (queuedMutations.length === queueLengthWhenTriggered) {
            while (queuedMutations.length > 0) queuedMutations.shift()()
        }
    })
}

export function mutateDom(callback: any) {
    if (! currentlyObserving) return callback()

    stopObservingMutations()

    let result = callback()

    startObservingMutations()

    return result
}

let isCollecting = false
let deferredMutations: any[] = []

export function deferMutations() {
    isCollecting = true
}

export function flushAndStopDeferringMutations() {
    isCollecting = false

    onMutate(deferredMutations)

    deferredMutations = []
}

function onMutate(mutations: any[]) {
    if (isCollecting) {
        deferredMutations = deferredMutations.concat(mutations)

        return
    }

    let addedNodes: any[] = []
    let removedNodes: any = new Set
    let addedAttributes: any = new Map
    let removedAttributes: any = new Map

    for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].target._data_ignoreMutationObserver) continue

        if (mutations[i].type === 'childList') {
            mutations[i].removedNodes.forEach((node: any) => {
                if (node.nodeType !== 1) return

                if (! node._data_marker) return

                removedNodes.add(node)
            })

            mutations[i].addedNodes.forEach((node: any) => {
                if (node.nodeType !== 1) return

                if (removedNodes.has(node)) {
                    removedNodes.delete(node)

                    return
                }

                if (node._data_marker) return;

                addedNodes.push(node)
            })
        }

        if (mutations[i].type === 'attributes') {
            let el = mutations[i].target
            let name = mutations[i].attributeName
            let oldValue = mutations[i].oldValue

            let add = () => {
                if (! addedAttributes.has(el)) addedAttributes.set(el, [])

                addedAttributes.get(el).push({ name,  value: el.getAttribute(name) })
            }

            let remove = () => {
                if (! removedAttributes.has(el)) removedAttributes.set(el, [])

                removedAttributes.get(el).push(name)
            }

            if (el.hasAttribute(name) && oldValue === null) {
                add()
            } else if (el.hasAttribute(name)) {
                remove()
                add()
            } else {
                remove()
            }
        }
    }

    removedAttributes.forEach((attrs: any[], el: any) => {
        cleanupAttributes(el, attrs)
    })

    addedAttributes.forEach((attrs: any[], el: any) => {
        onAttributeAddeds.forEach(i => i(el, attrs))
    })

    for (let node of removedNodes) {
        if (addedNodes.some(i => i.contains(node))) continue

        onElRemoveds.forEach(i => i(node))
    }

    for (let node of addedNodes) {
        if (! node.isConnected) continue

        onElAddeds.forEach(i => i(node))
    }

    addedNodes = null
    removedNodes = null
    addedAttributes = null
    removedAttributes = null
}