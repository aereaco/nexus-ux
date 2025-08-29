import { startObservingMutations, onAttributesAdded, onElAdded, onElRemoved, cleanupAttributes, cleanupElement } from "./mutation"
import { deferHandlingDirectives, directiveExists, directives } from "./directives"
import { dispatch } from './utils/dispatch'
import { walk } from "./utils/walk"
import { warn } from './utils/warn'

let started: boolean = false

export function start() {
    if (started) warn('Alpine has already been initialized on this page. Calling Alpine.start() more than once can cause problems.')

    started = true

    if (! document.body) warn('Unable to initialize. Trying to load Alpine before `<body>` is available. Did you forget to add `defer` in Alpine\'s `<script>` tag?')

    dispatch(document, 'alpine:init')
    dispatch(document, 'alpine:initializing')

    startObservingMutations()

    onElAdded(el => initTree(el, walk))
    onElRemoved(el => destroyTree(el))

    onAttributesAdded((el: any, attrs: any) => {
        directives(el, attrs).forEach((handle: any) => handle())
    })

    let outNestedComponents = (el: any) => ! closestRoot(el.parentElement, true)
    Array.from(document.querySelectorAll(allSelectors().join(',')))
        .filter(outNestedComponents)
        .forEach(el => {
            initTree(el)
        })

    dispatch(document, 'alpine:initialized')

    setTimeout(() => {
        warnAboutMissingPlugins()
    })
}

let rootSelectorCallbacks: any[] = []
let initSelectorCallbacks: any[] = []

export function rootSelectors() {
    return rootSelectorCallbacks.map(fn => fn())
}

export function allSelectors() {
    return rootSelectorCallbacks.concat(initSelectorCallbacks).map(fn => fn())
}

export function addRootSelector(selectorCallback: any) { rootSelectorCallbacks.push(selectorCallback) }
export function addInitSelector(selectorCallback: any) { initSelectorCallbacks.push(selectorCallback) }

export function closestRoot(el: any, includeInitSelectors = false) {
    return findClosest(el, (element: any) => {
        const selectors = includeInitSelectors ? allSelectors() : rootSelectors()

        if (selectors.some((selector: string) => element.matches(selector))) return true
    })
}

export function findClosest(el: any, callback: any) {
    if (! el) return

    if (callback(el)) return el

    if (el._data_teleportBack) el = el._data_teleportBack

    if (! el.parentElement) return

    return findClosest(el.parentElement, callback)
}

export function isRoot(el: any) {
    return rootSelectors().some((selector: string) => el.matches(selector))
}

let initInterceptors: any[] = []

export function interceptInit(callback: any) { initInterceptors.push(callback) }

let markerDispenser: number = 1

export function initTree(el: any, walker: any = walk, intercept: any = () => {}) {
    if (findClosest(el, (i: any) => i._data_ignore)) return

    deferHandlingDirectives(() => {
        walker(el, (el: any, skip: any) => {
            if (el._data_marker) return

            intercept(el, skip)

            initInterceptors.forEach(i => i(el, skip))

            directives(el, el.attributes).forEach((handle: any) => handle())

            if (!el._data_ignore) el._data_marker = markerDispenser++

            el._data_ignore && skip()
        })
    })
}

export function destroyTree(root: any, walker: any = walk) {
    walker(root, (el: any) => {
        cleanupElement(el)
        cleanupAttributes(el)
        delete el._data_marker
    })
}

function warnAboutMissingPlugins() {
    let pluginDirectives = [
        [ 'ui', 'dialog', ['[data-dialog], [data-popover]'] ],
        [ 'anchor', 'anchor', ['[data-anchor]'] ],
        [ 'sort', 'sort', ['[data-sort]'] ],
    ]

    pluginDirectives.forEach(([ plugin, directive, selectors ]: any) => {
        if (directiveExists(directive)) return

        selectors.some((selector: string) => {
            if (document.querySelector(selector)) {
                warn(`found "${selector}", but missing ${plugin} plugin`)

                return true
            }
        })
    })
}
