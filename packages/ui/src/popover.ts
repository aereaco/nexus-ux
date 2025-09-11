export default function (State: any) {
    State.directive('popover', (el: any, directive: any) => {
        if      (! directive.value)                 handleRoot(el, State)
        else if (directive.value === 'overlay')     handleOverlay(el, State)
        else if (directive.value === 'button')      handleButton(el, State)
        else if (directive.value === 'panel')       handlePanel(el, State)
        else if (directive.value === 'group')       handleGroup(el, State)
    })

    State.magic('popover', (el: any) => {
        let $data = State.$data(el)

        return {
            get isOpen() {
                return $data.__isOpenState
            },
            open() {
                $data.__open()
            },
            close() {
                $data.__close()
            },
        }
    })
}

function handleRoot(el: any, State: any) {
    State.bind(el, {
        'data-id'() { return ['popover-button', 'popover-panel'] },
        'data-modelable': '__isOpenState',
        'data-signal'() {
            return {
                init() {
                    if (this.$data.__groupEl) {
                        this.$data.__groupEl.addEventListener('__close-others', ({ detail }: any) => {
                            if (detail.el.isSameNode(this.$el)) return

                            this.__close(false)
                        })
                    }
                },
                __buttonEl: undefined,
                __panelEl: undefined,
                __isStatic: false,
                get __isOpen() {
                    if (this.__isStatic) return true

                    return this.__isOpenState
                },
                __isOpenState: false,
                __open() {
                    this.__isOpenState = true

                    this.$dispatch('__close-others', { el: this.$el })
                },
                __toggle() {
                    this.__isOpenState ? this.__close() : this.__open()
                },
                __close(el: any) {
                    if (this.__isStatic) return

                    this.__isOpenState = false

                    if (el === false) return

                    el = el || this.$data.__buttonEl

                    if (document.activeElement.isSameNode(el)) return

                    setTimeout(() => el.focus())
                },
                __contains(outer: any, inner: any) {
                    return !! State.findClosest(inner, (el: any) => el.isSameNode(outer))
                }
            }
        },
        '@keydown.escape.stop.prevent'() {
            this.__close()
        },
        '@focusin.window'() {
            if (this.$data.__groupEl) {
                if (! this.$data.__contains(this.$data.__groupEl, document.activeElement)) {
                    this.$data.__close(false)
                }

                return
            }

            if (! this.$data.__contains(this.$el, document.activeElement)) {
                this.$data.__close(false)
            }
        },
    })
}

function handleButton(el: any, State: any) {
    State.bind(el, {
        'data-ref': 'button',
        ':id'() { return this.$id('popover-button') },
        ':aria-expanded'() { return this.$data.__isOpen },
        ':aria-controls'() { return this.$data.__isOpen && this.$id('popover-panel') },
        'data-init'() {
            if (this.$el.tagName.toLowerCase() === 'button' && !this.$el.hasAttribute('type')) this.$el.type = 'button'

            this.$data.__buttonEl = this.$el
        },
        '@click'() { this.$data.__toggle() },
        '@keydown.tab'(e: any) {
            if (! e.shiftKey && this.$data.__isOpen) {
                let firstFocusableEl = this.$focus.within(this.$data.__panelEl).getFirst()

                if (firstFocusableEl) {
                    e.preventDefault()
                    e.stopPropagation()

                    this.$focus.focus(firstFocusableEl)
                }
            }
        },
        '@keyup.tab'(e: any) {
            if (this.$data.__isOpen) {
                // Check if the last focused element was "after" this one
                let lastEl = this.$focus.previouslyFocused()

                if (! lastEl) return

                if (
                    // Make sure the last focused wasn't part of this popover.
                    (! this.$data.__buttonEl.contains(lastEl) && ! this.$data.__panelEl.contains(lastEl))
                    // Also make sure it appeared "after" this button in the DOM.
                    && (lastEl && (this.$el.compareDocumentPosition(lastEl) & Node.DOCUMENT_POSITION_FOLLOWING))
                ) {
                    e.preventDefault()
                    e.stopPropagation()

                    this.$focus.within(this.$data.__panelEl).last()
                }
            }
        },
        '@keydown.space.stop.prevent'() { this.$data.__toggle() },
        '@keydown.enter.stop.prevent'() { this.$data.__toggle() },
        // This is to stop Firefox from firing a "click".
        '@keyup.space.stop.prevent'() { },
    })
}

function handlePanel(el: any, State: any) {
    State.bind(el, {
        'data-init'() {
            this.$data.__isStatic = State.bound(this.$el, 'static', false)
            this.$data.__panelEl = this.$el
        },
        'data-effect'() {
            this.$data.__isOpen && State.bound(el, 'focus') && this.$focus.first()
        },
        'data-ref': 'panel',
        ':id'() { return this.$id('popover-panel') },
        'data-show'() { return this.$data.__isOpen },
        '@mousedown.window'($event: any) {
            if (! this.$data.__isOpen) return
            if (this.$data.__contains(this.$data.__buttonEl, $event.target)) return
            if (this.$data.__contains(this.$el, $event.target)) return

            if (! this.$focus.focusable($event.target)) {
                this.$data.__close()
            }
        },
        '@keydown.tab'(e: any) {
            if (e.shiftKey && this.$focus.isFirst(e.target)) {
                e.preventDefault()
                e.stopPropagation()
                State.bound(el, 'focus') ? this.$data.__close() : this.$data.__buttonEl.focus()
            } else if (! e.shiftKey && this.$focus.isLast(e.target)) {
                e.preventDefault()
                e.stopPropagation()

                // Get the next panel button:
                let els = this.$focus.within(document).all()
                let buttonIdx = els.indexOf(this.$data.__buttonEl)

                let nextEls = els
                    .splice(buttonIdx + 1) // Elements after button
                    .filter((el: any) => ! this.$el.contains(el)) // Ignore items in panel

                nextEls[0].focus()

                State.bound(el, 'focus') && this.$data.__close(false)
            }
        },
    })
}

function handleGroup(el: any, State: any) {
    State.bind(el, {
        'data-ref': 'container',
        'data-signal'() {
            return {
                __groupEl: this.$el,
            }
        },
    })
}

function handleOverlay(el: any, State: any) {
    State.bind(el, {
        'data-show'() { return this.$data.__isOpen }
    })
}
