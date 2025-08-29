let resolveStep: any = () => {}

let logger: any = () => {}

export function morph(from: any, toHtml: any, options: any) {
    monkeyPatchDomSetAttributeToAllowAtSymbols()

    // We're defining these globals and methods inside this function (instead of outside)
    // because it's an async function and if run twice, they would overwrite
    // each other.

    let context = createMorphContext(options)

    // Finally we morph the element

    let toEl = typeof toHtml === 'string' ? createElement(toHtml) : toHtml

    if ((window as any).Alpine && (window as any).Alpine.closestDataStack && ! from._data_signalStack) {
        // Just in case a part of this template uses Alpine scope from somewhere
        // higher in the DOM tree, we'll find that state and replace it on the root
        // element so everything is synced up accurately.
        toEl._data_signalStack = (window as any).Alpine.closestDataStack(from)

        // We will kick off a clone on the root element.
        toEl._data_signalStack && (window as any).Alpine.cloneNode(from, toEl)
    }

    context.patch(from, toEl)

    return from
}

export function morphBetween(startMarker: any, endMarker: any, toHtml: any, options: any = {}) {
    monkeyPatchDomSetAttributeToAllowAtSymbols()

    let context = createMorphContext(options)

    // Setup from block...
    let fromContainer = startMarker.parentNode
    let fromBlock = new Block(startMarker, endMarker)

    // Setup to block...
    let toContainer = typeof toHtml === 'string'
        ? (() => {
            let container = document.createElement('div')
            container.insertAdjacentHTML('beforeend', toHtml)
            return container
        })()
        : toHtml

    let toStartMarker = document.createComment('[morph-start]')
    let toEndMarker = document.createComment('[morph-end]')

    toContainer.insertBefore(toStartMarker, toContainer.firstChild)
    toContainer.appendChild(toEndMarker)

    let toBlock = new Block(toStartMarker, toEndMarker)

    if ((window as any).Alpine && (window as any).Alpine.closestDataStack) {
        toContainer._data_signalStack = (window as any).Alpine.closestDataStack(fromContainer)
        toContainer._data_signalStack && (window as any).Alpine.cloneNode(fromContainer, toContainer)
    }

    // Run the patch
    context.patchChildren(fromBlock, toBlock)
}

function createMorphContext(options: any = {}) {
    let defaultGetKey = (el: any) => el.getAttribute('key')
    let noop = () => {}

    let context: any = {
        key: options.key || defaultGetKey,
        lookahead: options.lookahead || false,
        updating: options.updating || noop,
        updated: options.updated || noop,
        removing: options.removing || noop,
        removed: options.removed || noop,
        adding: options.adding || noop,
        added: options.added || noop
    }

    context.patch = function(from: any, to: any) {
        if (context.differentElementNamesTypesOrKeys(from, to)) {
            return context.swapElements(from, to)
        }

        let updateChildrenOnly = false
        let skipChildren = false

        let skipUntil = (predicate: any) => context.skipUntilCondition = predicate

        if (shouldSkipChildren(context.updating, () => skipChildren = true, skipUntil, from, to, () => updateChildrenOnly = true)) return

        // Initialize the server-side HTML element with Alpine...
        if (from.nodeType === 1 && (window as any).Alpine) {
            (window as any).Alpine.cloneNode(from, to)

            if (from._data_teleport && to._data_teleport) {
                context.patch(from._data_teleport, to._data_teleport)
            }
        }

        if (textOrComment(to)) {
            context.patchNodeValue(from, to)

            context.updated(from, to)

            return
        }

        if (! updateChildrenOnly) {
            context.patchAttributes(from, to)
        }

        context.updated(from, to)

        if (! skipChildren) {
            context.patchChildren(from, to)
        }
    }

    context.differentElementNamesTypesOrKeys = function(from: any, to: any) {
        return from.nodeType != to.nodeType
            || from.nodeName != to.nodeName
            || context.getKey(from) != context.getKey(to)
    }

    context.swapElements = function(from: any, to: any) {
        if (shouldSkip(context.removing, from)) return

        let toCloned = to.cloneNode(true)

        if (shouldSkip(context.adding, toCloned)) return

        from.replaceWith(toCloned)

        context.removed(from)
        context.added(toCloned)
    }

    context.patchNodeValue = function(from: any, to: any) {
        let value = to.nodeValue

        if (from.nodeValue !== value) {
            // Change text node...
            from.nodeValue = value
        }
    }

    context.patchAttributes = function(from: any, to: any) {
        if (from._data_transitioning) return

        if (from._data_isShown && ! to._data_isShown) {
            return
        }
        if (! from._data_isShown && to._data_isShown) {
            return
        }

    let domAttributes: Attr[] = Array.from(from.attributes)
    let toAttributes: Attr[] = Array.from(to.attributes)

        for (let i = domAttributes.length - 1; i >= 0; i--) {
            let name = (domAttributes[i] as Attr).name;

            if (! to.hasAttribute(name)) {
                // Remove attribute...
                from.removeAttribute(name)
            }
        }

        for (let i = toAttributes.length - 1; i >= 0; i--) {
            let name = (toAttributes[i] as Attr).name
            let value = (toAttributes[i] as Attr).value

            if (from.getAttribute(name) !== value) {
                from.setAttribute(name, value)
            }
        }
    }

    context.patchChildren = function(from: any, to: any) {
        let fromKeys = context.keyToMap(from.children)
        let fromKeyHoldovers: any = {}

        let currentTo = getFirstNode(to)
        let currentFrom = getFirstNode(from)

        while (currentTo) {
            seedingMatchingId(currentTo, currentFrom)

            let toKey = context.getKey(currentTo)
            let fromKey = context.getKey(currentFrom)

            if (context.skipUntilCondition) {
                let fromDone = ! currentFrom || context.skipUntilCondition(currentFrom)
                let toDone   = ! currentTo   || context.skipUntilCondition(currentTo)
                if (fromDone && toDone) {
                    context.skipUntilCondition = null
                } else {
                    if (! fromDone) currentFrom = currentFrom && getNextSibling(from, currentFrom)
                    if (! toDone)   currentTo   = currentTo   && getNextSibling(to, currentTo)
                    continue
                }
            }

            // Add new elements...
            if (! currentFrom) {
                if (toKey && fromKeyHoldovers[toKey]) {
                    // Add element (from key)...
                    let holdover = fromKeyHoldovers[toKey]

                    from.appendChild(holdover)

                    currentFrom = holdover
                    fromKey = context.getKey(currentFrom)
                } else {
                    if(! shouldSkip(context.adding, currentTo)) {
                        // Add element...
                        let clone = currentTo.cloneNode(true)

                        from.appendChild(clone)

                        context.added(clone)
                    }

                    currentTo = getNextSibling(to, currentTo)

                    continue
                }
            }

            // Handle conditional markers (presumably added by backends like Livewire)...
            let isIf = (node: any) => node && node.nodeType === 8 && node.textContent === '[if BLOCK]><![endif]'
            let isEnd = (node: any) => node && node.nodeType === 8 && node.textContent === '[if ENDBLOCK]><![endif]'

            if (isIf(currentTo) && isIf(currentFrom)) {
                let nestedIfCount = 0

                let fromBlockStart = currentFrom

                while (currentFrom) {
                    let next = getNextSibling(from, currentFrom)

                    if (isIf(next)) {
                        nestedIfCount++
                    } else if (isEnd(next) && nestedIfCount > 0) {
                        nestedIfCount--
                    } else if (isEnd(next) && nestedIfCount === 0) {
                        currentFrom = next

                        break;
                    }

                    currentFrom = next
                }

                let fromBlockEnd = currentFrom

                nestedIfCount = 0

                let toBlockStart = currentTo

                while (currentTo) {
                    let next = getNextSibling(to, currentTo)

                    if (isIf(next)) {
                        nestedIfCount++
                    } else if (isEnd(next) && nestedIfCount > 0) {
                        nestedIfCount--
                    } else if (isEnd(next) && nestedIfCount === 0) {
                        currentTo = next

                        break;
                    }

                    currentTo = next
                }

                let toBlockEnd = currentTo

                let fromBlock = new Block(fromBlockStart, fromBlockEnd)
                let toBlock = new Block(toBlockStart, toBlockEnd)

                context.patchChildren(fromBlock, toBlock)

                continue
            }

            // Lookaheads should only apply to non-text-or-comment elements...
            if (currentFrom.nodeType === 1 && context.lookahead && ! currentFrom.isEqualNode(currentTo)) {
                let nextToElementSibling = getNextSibling(to, currentTo)

                let found = false

                while (! found && nextToElementSibling) {
                    if (nextToElementSibling.nodeType === 1 && currentFrom.isEqualNode(nextToElementSibling)) {
                        found = true; // This ";" needs to be here...

                        currentFrom = context.addNodeBefore(from, currentTo, currentFrom)

                        fromKey = context.getKey(currentFrom)
                    }

                    nextToElementSibling = getNextSibling(to, nextToElementSibling)
                }
            }

            if (toKey !== fromKey) {
                if (! toKey && fromKey) {
                    // No "to" key...
                    fromKeyHoldovers[fromKey] = currentFrom; // This ";" needs to be here...
                    currentFrom = context.addNodeBefore(from, currentTo, currentFrom)
                    fromKeyHoldovers[fromKey].remove()
                    currentFrom = getNextSibling(from, currentFrom)
                    currentTo = getNextSibling(to, currentTo)

                    continue
                }

                if (toKey && ! fromKey) {
                    if (fromKeys[toKey]) {
                        // No "from" key...
                        currentFrom.replaceWith(fromKeys[toKey])
                        currentFrom = fromKeys[toKey]
                        fromKey = context.getKey(currentFrom)
                    }
                }

                if (toKey && fromKey) {
                    let fromKeyNode = fromKeys[toKey]

                    if (fromKeyNode) {
                        // Move "from" key...
                        fromKeyHoldovers[fromKey] = currentFrom
                        currentFrom.replaceWith(fromKeyNode)
                        currentFrom = fromKeyNode
                        fromKey = context.getKey(currentFrom)
                    } else {
                        // Swap elements with keys...
                        fromKeyHoldovers[fromKey] = currentFrom; // This ";" needs to be here...
                        currentFrom = context.addNodeBefore(from, currentTo, currentFrom)
                        fromKeyHoldovers[fromKey].remove()
                        currentFrom = getNextSibling(from, currentFrom)
                        currentTo = getNextSibling(to, currentTo)

                        continue
                    }
                }
            }

            // Get next from sibling before patching in case the node is replaced
            let currentFromNext = currentFrom && getNextSibling(from, currentFrom) //dom.next(from, fromChildren, currentFrom))

            // Patch elements
            context.patch(currentFrom, currentTo)

            currentTo = currentTo && getNextSibling(to, currentTo) // dom.next(from, toChildren, currentTo))

            currentFrom = currentFromNext
        }

        // Cleanup extra forms.
        let removals: any[] = []

        // We need to collect the "removals" first before actually
        // removing them so we don't mess with the order of things.
        while (currentFrom) {
            if (! shouldSkip(context.removing, currentFrom)) removals.push(currentFrom)

            // currentFrom = dom.next(from, fromChildren, currentFrom))
            currentFrom = getNextSibling(from, currentFrom)
        }

        // Now we can do the actual removals.
        while (removals.length) {
            let domForRemoval = removals.shift()

            domForRemoval.remove()

            context.removed(domForRemoval)
        }
    }

    context.getKey = function(el: any) {
        return el && el.nodeType === 1 && context.key(el)
    }

    context.keyToMap = function(els: any) {
        let map: any = {}

        for (let el of els) {
            let theKey = context.getKey(el)

            if (theKey) {
                map[theKey] = el
            }
        }

        return map
    }

    context.addNodeBefore = function(parent: any, node: any, beforeMe: any) {
        if(! shouldSkip(context.adding, node)) {
            let clone = node.cloneNode(true)

            parent.insertBefore(clone, beforeMe)

            context.added(clone)

            return clone
        }

        return node
    }

    return context
}

// These are legacy holdovers that don't do anything anymore...
morph.step = () => {}
morph.log = () => {}

function shouldSkip(hook: any, ...args: any[]) {
    let skip = false

    hook(...args, () => skip = true)

    return skip
}

// Due to the structure of the `shouldSkip()` function, we can't pass in the `skipChildren`
// function as an argument as it would change the signature of the existing hooks. So we
// are using this function instead which doesn't have this problem as we can pass the
// `skipChildren` function in as an earlier argument and then append it to the end
// of the hook signature manually.
function shouldSkipChildren(hook: any, skipChildren: any, skipUntil: any, ...args: any[]) {
    let skip = false
    hook(...args, () => skip = true, skipChildren, skipUntil)
    return skip
}

let patched = false

export function createElement(html: any) {
    const template = document.createElement('template')
    template.innerHTML = html
    return template.content.firstElementChild
}

export function textOrComment(el: any) {
    return el.nodeType === 3
        || el.nodeType === 8
}

// "Block"s are used when morphing with conditional markers.
// They allow us to patch isolated portions of a list of
// siblings in a DOM tree...
class Block {
    startComment: any
    endComment: any
    constructor(start: any, end: any) {
        // We're assuming here that the start and end caps are comment blocks...
        this.startComment = start
        this.endComment = end
    }

    get children() {
        let children: any[] = [];

        let currentNode = this.startComment.nextSibling

        while (currentNode && currentNode !== this.endComment) {
            children.push(currentNode)

            currentNode = currentNode.nextSibling
        }

        return children
    }

    appendChild(child: any) {
        this.endComment.before(child)
    }

    get firstChild() {
        let first = this.startComment.nextSibling

        if (first === this.endComment) return

        return first
    }

    nextNode(reference: any) {
        let next = reference.nextSibling

        if (next === this.endComment) return

        return next
    }

    insertBefore(newNode: any, reference: any) {
        reference.before(newNode)

        return newNode
    }
}

function getFirstNode(parent: any) {
    return parent.firstChild
}

function getNextSibling(parent: any, reference: any) {
    let next: any

    if (parent instanceof Block) {
        next =  parent.nextNode(reference)
    } else {
        next = reference.nextSibling
    }

    return next
}

function monkeyPatchDomSetAttributeToAllowAtSymbols() {
    if (patched) return

    patched = true

    // Because morphdom may add attributes to elements containing "@" symbols
    // like in the case of an Alpine `@click` directive, we have to patch
    // the standard Element.setAttribute method to allow this to work.
    let original = Element.prototype.setAttribute

    let hostDiv = document.createElement('div')

    Element.prototype.setAttribute = function newSetAttribute(name: any, value: any) {
        if (! name.includes('@')) {
            return original.call(this, name, value)
        }

        hostDiv.innerHTML = `<span ${name}="${value}"></span>`

        let attr = hostDiv.firstElementChild.getAttributeNode(name)

        hostDiv.firstElementChild.removeAttributeNode(attr)

        this.setAttributeNode(attr)
    }
}

function seedingMatchingId(to: any, from: any) {
    let fromId = from && from._data_bindings && from._data_bindings.id

    if (! fromId) return
    if (! to.setAttribute) return

    to.setAttribute('id', fromId)
    to.id = fromId
}