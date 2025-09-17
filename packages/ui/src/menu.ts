import menu from './menu'

export default function (State: any) {
    State.directive('menu', (el: any, directive: any) => {
        if (! directive.value) handleRoot(el, State)
        else if (directive.value === 'items') handleItems(el, State)
        else if (directive.value === 'item') handleItem(el, State)
        else if (directive.value === 'button') handleButton(el, State)
    }).before('bind')

    State.sprite('menuItem', (el: any) => {
        let $data = State.$data(el)

        return {
            get isActive() {
                return $data.__activeEl == $data.__itemEl
            },
            get isDisabled() {
                return $data.__itemEl.__isDisabled.value
            },
        }
    })
}

function handleRoot(el: any, State: any) {
    State.bind(el, {
        'data-id'() { return ['menu-button', 'menu-items'] },
        'data-modelable': '__isOpen',
        'data-signal'() {
            return {
                __itemEls: [],
                __activeEl: null,
                __isOpen: false,
                __open(activationStrategy: any) {
                    this.__isOpen = true

                    // Safari needs more of a "tick" for focusing after data-show for some reason.
                    // Probably because Nexus-UX adds an extra tick when data-showing for @click.outside
                    let nextTick = (callback: any) => requestAnimationFrame(() => requestAnimationFrame(callback))

                    nextTick(() => {
                        this.$refs.__items.focus({ preventScroll: true })

                        // Activate the first item every time the menu is open...
                        activationStrategy && activationStrategy(State, this.$refs.__items, (el: any) => el.__activate())
                    })
                },
                __close(focusAfter = true) {
                    this.__isOpen = false

                    focusAfter && this.$nextTick(() => this.$refs.__button.focus({ preventScroll: true }))
                },
                __contains(outer: any, inner: any) {
                    return !! State.findClosest(inner, (el: any) => el.isSameNode(outer))
                }
            }
        },
        '@focusin.window'() {
            if (! this.$data.__contains(this.$el, document.activeElement)) {
                this.$data.__close(false)
            }
        },
    })
}

function handleButton(el: any, State: any) {
    State.bind(el, {
        'data-ref': '__button',
        'aria-haspopup': 'true',
        ':aria-labelledby'() { return this.$id('menu-label') },
        ':id'() { return this.$id('menu-button') },
        ':aria-expanded'() { return this.$data.__isOpen },
        ':aria-controls'() { return this.$data.__isOpen && this.$id('menu-items') },
        'data-init'() { if (this.$el.tagName.toLowerCase() === 'button' && ! this.$el.hasAttribute('type')) this.$el.type = 'button' },
        '@click'() { this.$data.__open() },
        '@keydown.down.stop.prevent'() { this.$data.__open() },
        '@keydown.up.stop.prevent'() { this.$data.__open((State as any).dom.last) },
        '@keydown.space.stop.prevent'() { this.$data.__open() },
        '@keydown.enter.stop.prevent'() { this.$data.__open() },
    })
}

function handleItems(el: any, State: any) {
    State.bind(el, {
        'data-ref': '__items',
        'aria-orientation': 'vertical',
        'role': 'menu',
        ':id'() { return this.$id('menu-items') },
        ':aria-labelledby'() { return this.$id('menu-button') },
        ':aria-activedescendant'() { return this.$data.__activeEl && this.$data.__activeEl.id },
        'data-show'() { return this.$data.__isOpen },
        'tabindex': '0',
        '@click.outside'() { this.$data.__close() },
        '@keydown'(e: any) { (State as any).dom.search(State, this.$refs.__items, e.key, (el: any) => el.__activate()) },
        '@keydown.down.stop.prevent'() {
            if (this.$data.__activeEl) (State as any).dom.next(State, this.$data.__activeEl, (el: any) => el.__activate())
            else (State as any).dom.first(State, this.$refs.__items, (el: any) => el.__activate())
        },
        '@keydown.up.stop.prevent'() {
            if (this.$data.__activeEl) (State as any).dom.previous(State, this.$data.__activeEl, (el: any) => el.__activate())
            else (State as any).dom.last(State, this.$refs.__items, (el: any) => el.__activate())
        },
        '@keydown.home.stop.prevent'() { (State as any).dom.first(State, this.$refs.__items, (el: any) => el.__activate()) },
        '@keydown.end.stop.prevent'() { (State as any).dom.last(State, this.$refs.__items, (el: any) => el.__activate()) },
        '@keydown.page-up.stop.prevent'() { (State as any).dom.first(State, this.$refs.__items, (el: any) => el.__activate()) },
        '@keydown.page-down.stop.prevent'() { (State as any).dom.last(State, this.$refs.__items, (el: any) => el.__activate()) },
        '@keydown.escape.stop.prevent'() { this.$data.__close() },
        '@keydown.space.stop.prevent'() { this.$data.__activeEl && this.$data.__activeEl.click() },
        '@keydown.enter.stop.prevent'() { this.$data.__activeEl && this.$data.__activeEl.click() },
        '@keyup.space.prevent'() { },
    })
}

function handleItem(el: any, State: any) {
    State.bind(el, () => {
        return {
            'data-signal'() {
                return {
                    __itemEl: this.$el,
                    init() {
                        // Add current element to element list for navigating.
                        let els = State.raw(this.$data.__itemEls)
                        let inserted = false

                        for (let i = 0; i < els.length; i++) {
                            if (els[i].compareDocumentPosition(this.$el) & Node.DOCUMENT_POSITION_PRECEDING) {
                                els.splice(i, 0, this.$el)
                                inserted = true
                                break
                            }
                        }

                        if (! inserted) els.push(this.$el)

                        this.$el.__activate = () => {
                            this.$data.__activeEl = this.$el
                            this.$el.scrollIntoView({ block: 'nearest' })
                        }

                        this.$el.__deactivate = () => {
                            this.$data.__activeEl = null
                        }


                        this.$el.__isDisabled = State.reactive({ value: false })

                        queueMicrotask(() => {
                            this.$el.__isDisabled.value = State.bound(this.$el, 'disabled', false)
                        })
                    },
                    destroy() {
                        // Remove this element from the elements list.
                        let els = this.$data.__itemEls
                        els.splice(els.indexOf(this.$el), 1)
                    },
                }
            },
            'data-id'() { return ['menu-item'] },
            ':id'() { return this.$id('menu-item') },
            ':tabindex'() { return this.__itemEl.__isDisabled.value ? false : '-1' },
            'role': 'menuitem',
            '@mousemove'() { this.__itemEl.__isDisabled.value || this.$menuItem.isActive || this.__itemEl.__activate() },
            '@mouseleave'() { this.__itemEl.__isDisabled.value || ! this.$menuItem.isActive || this.__itemEl.__deactivate() },
        }
    })
}

let dom = {
    first(State: any, parent: any, receive = (i: any) => i, fallback = () => { }) {
        let first = State.$data(parent).__itemEls[0]

        if (! first) return fallback()

        if (first.tagName.toLowerCase() === 'template') {
            return this.next(State, first, receive)
        }

        if (first.__isDisabled.value) return this.next(State, first, receive)

        return receive(first)
    },
    last(State: any, parent: any, receive = (i: any) => i, fallback = () => { }) {
        let last = State.$data(parent).__itemEls.slice(-1)[0]

        if (! last) return fallback()
        if (last.__isDisabled.value) return this.previous(State, last, receive)
        return receive(last)
    },
    next(State: any, el: any, receive = (i: any) => i, fallback = () => { }) {
        if (! el) return fallback()

        let els = State.$data(el).__itemEls
        let next = els[els.indexOf(el) + 1]

        if (! next) return fallback()
        if (next.__isDisabled.value || next.tagName.toLowerCase() === 'template') return this.next(State, next, receive, fallback)
        return receive(next)
    },
    previous(State: any, el: any, receive = (i: any) => i, fallback = () => { }) {
        if (! el) return fallback()

        let els = State.$data(el).__itemEls
        let prev = els[els.indexOf(el) - 1]

        if (! prev) return fallback()
        if (prev.__isDisabled.value || prev.tagName.toLowerCase() === 'template') return this.previous(State, prev, receive, fallback)
        return receive(prev)
    },
    searchQuery: '',
    debouncedClearSearch: undefined as any,
    clearSearch(State: any) {
        if (! this.debouncedClearSearch) {
            this.debouncedClearSearch = State.debounce(function () { this.searchQuery = '' }, 350)
        }

        this.debouncedClearSearch()
    },
    search(State: any, parent: any, key: string, receiver: any) {
        if (key.length > 1) return

        this.searchQuery += key

        let els = State.raw(State.$data(parent).__itemEls)

        let el = els.find((el: any) => {
            return el.textContent.trim().toLowerCase().startsWith(this.searchQuery)
        })

        el && ! el.__isDisabled.value && receiver(el)

        this.clearSearch(State)
    },
}
