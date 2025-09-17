import { generateContext, renderHiddenInputs } from './list-context'

export default function (State: any) {
    State.directive('listbox', (el: any, directive: any) => {
        if (! directive.value) handleRoot(el, State)
        else if (directive.value === 'label') handleLabel(el, State)
        else if (directive.value === 'button') handleButton(el, State)
        else if (directive.value === 'options') handleOptions(el, State)
        else if (directive.value === 'option') handleOption(el, State)
    }).before('bind')

    State.sprite('listbox', (el: any) => {
        let data = State.$data(el)

        return {
            // @deprecated:
            get selected() {
                return data.__value
            },
            // @deprecated:
            get active() {
                let active = data.__context.getActiveItem()

                return active && active.value
            },
            get value() {
                return data.__value
            },
            get isOpen() {
                return data.__isOpen
            },
            get isDisabled() {
                return data.__isDisabled
            },
            get activeOption() {
                let active = data.__context.getActiveItem()

                return active && active.value
            },
            get activeIndex() {
                let active = data.__context.getActiveItem()

                return active && active.key
            },
        }
    })

    State.sprite('listboxOption', (el: any) => {
        let data = State.$data(el)

        // It's not great depending on the existence of the attribute in the DOM
        // but it's probably the fastest and most reliable at this point...
        let optionEl = State.findClosest(el, (i: any) => {
            return i.hasAttribute('data-listbox:option')
        })

        if (! optionEl) throw 'No data-listbox:option directive found...'

        return {
            get isActive() {
                return data.__context.isActiveKey(State.$data(optionEl).__optionKey)
            },
            get isSelected() {
                return data.__isSelected(optionEl)
            },
            get isDisabled() {
                return data.__context.isDisabled(State.$data(optionEl).__optionKey)
            },
        }
    })
}

function handleRoot(el: any, State: any) {
    State.bind(el, {
        // Setup...
        'data-id'() { return ['listbox-button', 'listbox-options', 'listbox-label'] },
        'data-modelable': '__value',

        // Initialize...
        'data-signal'() {
            return {
                /**
                 * Listbox state...
                 */
                __ready: false,
                __value: null,
                __isOpen: false,
                __context: undefined,
                __isMultiple: undefined,
                __isStatic: false,
                __isDisabled: undefined,
                __compareBy: null,
                __inputName: null,
                __orientation: 'vertical',
                __hold: false,

                /**
                 * Listbox initialization...
                 */
                init() {
                    this.__isMultiple = State.extractProp(el, 'multiple', false)
                    this.__isDisabled = State.extractProp(el, 'disabled', false)
                    this.__inputName = State.extractProp(el, 'name', null)
                    this.__compareBy = State.extractProp(el, 'by')
                    this.__orientation = State.extractProp(el, 'horizontal', false) ? 'horizontal' : 'vertical'

                    this.__context = generateContext(State, this.__isMultiple, this.__orientation, () => this.__activateSelectedOrFirst())

                    let defaultValue = State.extractProp(el, 'default-value', this.__isMultiple ? [] : null)

                    this.__value = defaultValue

                    // We have to wait again until after the "ready" processes are finished
                    // to settle up currently selected Values (this prevents this next bit
                    // of code from running multiple times on startup...)
                    queueMicrotask(() => {
                        State.effect(() => {
                            // Everytime the value changes, we need to re-render the hidden inputs,
                            // if a user passed the "name" prop...
                            this.__inputName && renderHiddenInputs(State, this.$el, this.__inputName, this.__value)
                        })

                        // Keep the currently selected value in sync with the input value...
                        State.effect(() => {
                            this.__resetInput()
                        })
                    })
                },
                __resetInput() {
                    let input = this.$refs.__input
                    if (! input) return

                    let value = this.$data.__getCurrentValue()

                    input.value = value
                },
                __getCurrentValue() {
                    if (! this.$refs.__input) return ''
                    if (! this.__value) return ''
                    if (this.$data.__displayValue && this.__value !== undefined) return this.$data.__displayValue(this.__value)
                    if (typeof this.__value === 'string') return this.__value
                    return ''
                },
                __open() {
                    if (this.__isOpen) return
                    this.__isOpen = true

                    this.__activateSelectedOrFirst()

                    // Safari needs more of a "tick" for focusing after data-show for some reason.
                    // Probably because Nexus-UX adds an extra tick when data-showing for @click.outside
                    let nextTick = (callback: any) => requestAnimationFrame(() => requestAnimationFrame(callback))

                    nextTick(() => this.$refs.__options.focus({ preventScroll: true }))
                },
                __close() {
                    this.__isOpen = false

                    this.__context.deactivate()

                    this.$nextTick(() => this.$refs.__button.focus({ preventScroll: true }))
                },
                __activateSelectedOrFirst(activateSelected = true) {
                    if (! this.__isOpen) return

                    if (this.__context.getActiveKey()) {
                        this.__context.activateAndScrollToKey(this.__context.getActiveKey())
                        return
                    }

                    let firstSelectedValue

                    if (this.__isMultiple) {
                        firstSelectedValue = this.__value.find((i: any) => {
                            return !! this.__context.getItemByValue(i)
                        })
                    } else {
                        firstSelectedValue = this.__value
                    }

                    if (activateSelected && firstSelectedValue) {
                        let firstSelected = this.__context.getItemByValue(firstSelectedValue)

                        firstSelected && this.__context.activateAndScrollToKey(firstSelected.key)
                    } else {
                        this.__context.activateAndScrollToKey(this.__context.firstKey())
                    }
                },
                __selectActive() {
                    let active = this.$data.__context.getActiveItem()
                    if (active) this.__toggleSelected(active.value)
                },
                __selectOption(el: any) {
                    let item = this.__context.getItemByEl(el)

                    if (item) this.__toggleSelected(item.value)
                },
                __isSelected(el: any) {
                    let item = this.__context.getItemByEl(el)

                    if (! item) return false
                    if (item.value === null || item.value === undefined) return false

                    return this.__hasSelected(item.value)
                },
                __toggleSelected(value: any) {
                    if (! this.__isMultiple) {
                        this.__value = value

                        return
                    }

                    let index = this.__value.findIndex((j: any) => this.__compare(j, value))

                    if (index === -1) {
                        this.__value.push(value)
                    } else {
                        this.__value.splice(index, 1)
                    }
                },
                __hasSelected(value: any) {
                    if (! this.__isMultiple) return this.__compare(this.__value, value)

                    return this.__value.some((i: any) => this.__compare(i, value))
                },
                __compare(a: any, b: any) {
                    let by = this.__compareBy

                    if (! by) by = (a: any, b: any) => State.raw(a) === State.raw(b)

                    if (typeof by === 'string') {
                        let property = by
                        by = (a: any, b: any) => {
                            // Handle null values
                            if ((! a || typeof a !== 'object') || (! b || typeof b !== 'object')) {
                                return State.raw(a) === State.raw(b)
                            }

                            return a[property] === b[property];
                        }
                    }

                    return by(a, b)
                },
            }
        },
    })
}

function handleLabel(el: any, State: any) {
    State.bind(el, {
        'data-ref': '__label',
        ':id'() { return this.$id('listbox-label') },
        '@click'() { this.$refs.__button.focus({ preventScroll: true }) },
    })
}

function handleButton(el: any, State: any) {
    State.bind(el, {
        // Setup...
        'data-ref': '__button',
        ':id'() { return this.$id('listbox-button') },

        // Accessibility attributes...
        'aria-haspopup': 'true',
        ':aria-labelledby'() { return this.$id('listbox-label') },
        ':aria-expanded'() { return this.$data.__isOpen },
        ':aria-controls'() { return this.$data.__isOpen && this.$id('listbox-options') },

        // Initialize....
        'data-init'() { if (this.$el.tagName.toLowerCase() === 'button' && !this.$el.hasAttribute('type')) this.$el.type = 'button' },

        // Register listeners...
        '@click'() { this.$data.__open() },
        '@keydown'(e: any) {
            if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.stopPropagation()
                e.preventDefault()

                this.$data.__open()
            }
        },
        '@keydown.space.stop.prevent'() { this.$data.__open() },
        '@keydown.enter.stop.prevent'() { this.$data.__open() },
    })
}

function handleOptions(el: any, State: any) {
    State.bind(el, {
        // Setup...
        'data-ref': '__options',
        ':id'() { return this.$id('listbox-options') },

        // Accessibility attributes...
        'role': 'listbox',
        tabindex: '0',
        ':aria-orientation'() {
            return this.$data.__orientation
        },
        ':aria-labelledby'() { return this.$id('listbox-button') },
        ':aria-activedescendant'() {
            if (! this.$data.__context.hasActive()) return

            let active = this.$data.__context.getActiveItem()

            return active ? active.el.id : null
        },

        // Initialize...
        'data-init'() {
            this.$data.__isStatic = State.extractProp(this.$el, 'static', false)

            if (State.bound(this.$el, 'hold')) {
                this.$data.__hold = true;
            }
        },

        'data-show'() { return this.$data.__isStatic ? true : this.$data.__isOpen },
        'data-trap'() { return this.$data.__isOpen },
        '@click.outside'() { this.$data.__close() },
        '@keydown.escape.stop.prevent'() { this.$data.__close() },
        '@focus'() { this.$data.__activateSelectedOrFirst() },
        '@keydown'(e: any) {
            queueMicrotask(() => this.$data.__context.activateByKeyEvent(e, true, () => this.$data.__isOpen, () => this.$data.__open(), () => {}))
         },
        '@keydown.enter.stop.prevent'() {
            this.$data.__selectActive();

            this.$data.__isMultiple || this.$data.__close()
        },
        '@keydown.space.stop.prevent'() {
            this.$data.__selectActive();

            this.$data.__isMultiple || this.$data.__close()
        },
    })
}

function handleOption(el: any, State: any) {
    State.bind(el, () => {
        return {
            'data-id'() { return ['listbox-option'] },
            ':id'() { return this.$id('listbox-option') },

            // Accessibility attributes...
            'role': 'option',
            ':tabindex'() { return this.$listboxOption.isDisabled ? false : '-1' },
            ':aria-selected'() { return this.$listboxOption.isSelected },

            // Initialize...
            'data-signal'() {
                return {
                    '__optionKey': null,

                    init() {
                        this.__optionKey = (Math.random() + 1).toString(36).substring(7)

                        let value = State.extractProp(el, 'value')
                        let disabled = State.extractProp(el, 'disabled', false, false)

                        this.$data.__context.registerItem(this.__optionKey, el, value, disabled)
                    },
                    destroy() {
                        this.$data.__context.unregisterItem(this.__optionKey)
                    },
                }
            },

            // Register listeners...
            '@click'() {
                if (this.$listboxOption.isDisabled) return;

                this.$data.__selectOption(el)

                this.$data.__isMultiple || this.$data.__close()
            },
            '@mouseenter'() { this.$data.__context.activateEl(el) },
            '@mouseleave'() {
                this.$data.__hold || this.$data.__context.deactivate()
            },
        }
    })
}

// Little utility to defer a callback into the microtask queue...
function microtask(callback: any) {
    return new Promise(resolve => queueMicrotask(() => resolve(callback())))
}
