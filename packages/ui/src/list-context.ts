export function generateContext(State: any, multiple: any, orientation: any, activateSelectedOrFirst: any) {
    return {
        /**
         * Main state...
         */
        items: [] as any,
    activeKey: switchboard(State),
        orderedKeys: [] as any,
        activatedByKeyPress: false,

        /**
         *  Initialization...
         */
        activateSelectedOrFirst: State.debounce(function () {
            activateSelectedOrFirst(false)
        }),

        registerItemsQueue: [] as any,

        registerItem(key: any, el: any, value: any, disabled: any) {
            // We need to queue up these additions to not slow down the
            // init process for each row...
            if (this.registerItemsQueue.length === 0) {
                queueMicrotask(() => {
                    if (this.registerItemsQueue.length > 0) {
                        this.items = this.items.concat(this.registerItemsQueue)

                        this.registerItemsQueue = []

                        this.reorderKeys()
                        this.activateSelectedOrFirst()
                    }
                })
            }

            let item = {
                key, el, value, disabled
            }

            this.registerItemsQueue.push(item)
        },

        unregisterKeysQueue: [] as any,

        unregisterItem(key: any) {
            if (this.unregisterKeysQueue.length === 0) {
                queueMicrotask(() => {
                    if (this.unregisterKeysQueue.length > 0) {
                        this.items = this.items.filter((i: any) => ! this.unregisterKeysQueue.includes(i.key))
                        this.orderedKeys = this.orderedKeys.filter((i: any) => ! this.unregisterKeysQueue.includes(i))

                        this.unregisterKeysQueue = []

                        this.reorderKeys()
                        this.activateSelectedOrFirst()
                    }
                })
            }

            this.unregisterKeysQueue.push(key)
        },

        getItemByKey(key: any) {
            return this.items.find((i: any) => i.key === key)
        },

        getItemByValue(value: any) {
            return this.items.find((i: any) => State.raw(i.value) === State.raw(value))
        },

        getItemByEl(el: any) {
            return this.items.find((i: any) => i.el === el)
        },

        getItemsByValues(values: any) {
            let rawValues = values.map((i: any) => State.raw(i));
            let filteredValue = this.items.filter((i: any) => rawValues.includes(State.raw(i.value)))
            filteredValue = filteredValue.slice().sort((a: any, b: any) => {
                let position = a.el.compareDocumentPosition(b.el)
                if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
                if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
                return 0
            })
            return filteredValue
        },

        getActiveItem() {
            if (! this.hasActive()) return null

            let item = this.items.find((i: any) => i.key === this.activeKey.get())

            if (! item) this.deactivateKey(this.activeKey.get())

            return item
        },

        activateItem(item: any) {
            if (! item) return

            this.activateKey(item.key)
        },

        /**
         * Handle elements...
         */
         reorderKeys: State.debounce(function () {
            this.orderedKeys = this.items.map((i: any) => i.key)

            this.orderedKeys = this.orderedKeys.slice().sort((a: any, z: any) => {
                if (a === null || z === null) return 0

                let aEl = this.items.find((i: any) => i.key === a).el
                let zEl = this.items.find((i: any) => i.key === z).el

                let position = aEl.compareDocumentPosition(zEl)

                if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
                if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
                return 0
            })

            if (! this.orderedKeys.includes(this.activeKey.get())) this.deactivateKey(this.activeKey.get())
        }),

        getActiveKey() {
            return this.activeKey.get()
        },

        activeEl() {
            if (! this.activeKey.get()) return

            return this.items.find((i: any) => i.key === this.activeKey.get()).el
        },

        isActiveEl(el: any) {
            let key = this.items.find((i: any) => i.el === el)

            return this.activeKey.is(key)
        },

        activateEl(el: any) {
            let item = this.items.find((i: any) => i.el === el)

            this.activateKey(item.key)
        },

        isDisabledEl(el: any) {
            return this.items.find((i: any) => i.el === el).disabled
        },

        get isScrollingTo() { return this.scrollingCount > 0 },

        scrollingCount: 0,

        activateAndScrollToKey(key: any, activatedByKeyPress: any) {
            if (! this.getItemByKey(key)) return

            this.scrollingCount++

            this.activateKey(key, activatedByKeyPress)

            let targetEl = this.items.find((i: any) => i.key === key).el

            targetEl.scrollIntoView({ block: 'nearest' })

            setTimeout(() => {
                this.scrollingCount--
            }, 25)
        },

        /**
         * Handle disabled keys...
         */
        isDisabled(key: any) {
            let item = this.items.find((i: any) => i.key === key)

            if (! item) return false

            return item.disabled
        },

        get nonDisabledOrderedKeys() { return this.orderedKeys.filter((i: any) => ! this.isDisabled(i)) },

        /**
         * Handle activated keys...
         */
        hasActive() { return !! this.activeKey.get() },

        wasActivatedByKeyPress() {return this.activatedByKeyPress},

        isActiveKey(key: any) { return this.activeKey.is(key) },

        activateKey(key: any, activatedByKeyPress = false) {
            if (this.isDisabled(key)) return

            this.activeKey.set(key)
            this.activatedByKeyPress = activatedByKeyPress
        },

        deactivateKey(key: any) {
            if (this.activeKey.get() === key) {
                this.activeKey.set(null)
                this.activatedByKeyPress = false
            }
        },

        deactivate() {
            if (! this.activeKey.get()) return
            if (this.isScrollingTo) return

            this.activeKey.set(null)
            this.activatedByKeyPress = false
        },

        nextKey() {
            if (! this.activeKey.get()) return

            let index = this.nonDisabledOrderedKeys.findIndex((i: any) => i === this.activeKey.get())

            return this.nonDisabledOrderedKeys[index + 1]
        },

        prevKey() {
            if (! this.activeKey.get()) return

            let index = this.nonDisabledOrderedKeys.findIndex((i: any) => i === this.activeKey.get())

            return this.nonDisabledOrderedKeys[index - 1]
        },

        firstKey() { return this.nonDisabledOrderedKeys[0] },

        lastKey() { return this.nonDisabledOrderedKeys[this.nonDisabledOrderedKeys.length - 1] },

        searchQuery: '',

        clearSearch: State.debounce(function () { this.searchQuery = '' }, 350),

        searchKey(query: any) {
            this.clearSearch()

            this.searchQuery += query

            let foundKey: any

            for (let key in this.items) {
                let content = this.items[key].el.textContent.trim().toLowerCase()

                if (content.startsWith(this.searchQuery)) {
                    foundKey = this.items[key].key
                    break;
                }
            }

            if (! this.nonDisabledOrderedKeys.includes(foundKey)) return

            return foundKey
        },

        activateByKeyEvent(e: any, searchable = false, isOpen = () => false, open = () => {}, setIsTyping: any) {
            let targetKey: any, hasActive: any

            setIsTyping(true)

            let activatedByKeyPress = true

            switch (e.key) {
                case ['ArrowDown', 'ArrowRight'][orientation === 'vertical' ? 0 : 1]:
                    e.preventDefault(); e.stopPropagation()

                    setIsTyping(false)

                    if (! isOpen()) {
                        open()
                        break;
                    }

                    this.reorderKeys(); hasActive = this.hasActive()

                    targetKey = hasActive ? this.nextKey() : this.firstKey()
                    break;

                case ['ArrowUp', 'ArrowLeft'][orientation === 'vertical' ? 0 : 1]:
                    e.preventDefault(); e.stopPropagation()

                    setIsTyping(false)

                    if (! isOpen()) {
                        open()
                        break;
                    }

                    this.reorderKeys(); hasActive = this.hasActive()

                    targetKey = hasActive ? this.prevKey() : this.lastKey()
                    break;
                case 'Home':
                case 'PageUp':
                    if (e.key == 'Home' && e.shiftKey) return;

                    e.preventDefault(); e.stopPropagation()
                    setIsTyping(false)
                    this.reorderKeys(); hasActive = this.hasActive()
                    targetKey = this.firstKey()
                    break;

                case 'End':
                case 'PageDown':
                    if (e.key == 'End' && e.shiftKey) return;

                    e.preventDefault(); e.stopPropagation()
                    setIsTyping(false)
                    this.reorderKeys(); hasActive = this.hasActive()
                    targetKey = this.lastKey()
                    break;

                default:
                    activatedByKeyPress = this.activatedByKeyPress
                    if (searchable && e.key.length === 1) {
                        targetKey = this.searchKey(e.key)
                    }
                    break;
            }

            if (targetKey) {
                this.activateAndScrollToKey(targetKey, activatedByKeyPress)
            }
        }
    }
}

function keyByValue(object: any, value: any) {
    return Object.keys(object).find((key: any) => object[key] === value)
}

export function renderHiddenInputs(State: any, el: any, name: any, value: any) {
    let newInputs = generateInputs(name, value)

    newInputs.forEach((i: any) => (i as any)._data_hiddenInput = true)

    newInputs.forEach((i: any) => (i as any)._data_ignore = true)

    let children = el.children

    let oldInputs: any[] = []

    for (let i = 0; i < children.length; i++) {
        let child = children[i];

        if ((child as any)._data_hiddenInput) oldInputs.push(child)
        else break
    }

    State.mutateDom(() => {
        oldInputs.forEach((i: any) => i.remove())

        newInputs.reverse().forEach((i: any) => el.prepend(i))
    })
}

function generateInputs(name: any, value: any, carry: any[] = []) {
    if (isObjectOrArray(value)) {
        for (let key in value) {
            carry = carry.concat(
                generateInputs(`${name}[${key}]`, value[key])
            )
        }
    } else {
        carry.push(createHiddenInput(name, value))
    }

    return carry
}

function isObjectOrArray(value: any) {
    return typeof value === 'object' && value !== null
}

function createHiddenInput(name: any, value: any) {
    let el = document.createElement('input')

    el.setAttribute('type', 'hidden')
    el.setAttribute('name', name)
    el.setAttribute('value', value)

    return el
}

function switchboard(State: any, value?: any) {
    let lookup: any = {}

    let current: any

    let changeTracker = State.reactive({ state: false })

    let get = () => {
        // Depend on the change tracker so reading "get" becomes reactive...
        if (changeTracker.state) {
            // noop
        }

        return current
    }

    let set = (newValue: any) => {
        if (newValue === current) return

        if (current !== undefined) lookup[current].state = false

        current = newValue

        if (lookup[newValue] === undefined) {
            lookup[newValue] = State.reactive({ state: true })
        } else {
            lookup[newValue].state = true
        }

        changeTracker.state = ! changeTracker.state
    }

    let is = (comparisonValue: any) => {
        if (lookup[comparisonValue] === undefined) {
            lookup[comparisonValue] = State.reactive({ state: false })
            return lookup[comparisonValue].state
        }

        return !! lookup[comparisonValue].state
    }

    value === undefined || set(value)

    return { get, set, is }
}
