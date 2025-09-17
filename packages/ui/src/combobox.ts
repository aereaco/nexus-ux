import { generateContext, renderHiddenInputs } from './list-context'

export default function (State: any) {
    State.directive('combobox', (el: any, directive: any, { evaluate }: any) => {
        if      (directive.value === 'input')        handleInput(el, State)
        else if (directive.value === 'button')       handleButton(el, State)
        else if (directive.value === 'label')        handleLabel(el, State)
        else if (directive.value === 'options')      handleOptions(el, State)
        else if (directive.value === 'option')       handleOption(el, State, directive, evaluate)
        else                                         handleRoot(el, State)
    }).before('bind')

    State.sprite('combobox', (el: any) => {
        let data = State.$data(el)

        return {
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
                let active = data.__context?.getActiveItem()

                return active && active.value
            },
            get activeIndex() {
                let active = data.__context?.getActiveItem()

                if (active) {
                    return Object.values(State.raw(data.__context.items)).findIndex((i: any) => State.raw(active) == State.raw(i))
                }

                return null
            },
        }
    })

    State.sprite('comboboxOption', (el: any) => {
        let data = State.$data(el)

        let optionEl = State.findClosest(el, (i: any) => {
            return i.hasAttribute('data-combobox:option')
        })

        if (! optionEl) throw 'No data-combobox:option directive found...'

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
        'data-id'() { return ['state-combobox-button', 'state-combobox-options', 'state-combobox-label'] },
        'data-modelable': '__value',

        'data-signal'() {
            return {
                __ready: false,
                __value: null,
                __isOpen: false,
                __context: undefined,
                __isMultiple: undefined,
                __isStatic: false,
                __isDisabled: undefined,
                __displayValue: undefined,
                __compareBy: null,
                __inputName: null,
                __isTyping: false,
                __hold: false,

                init() {
                    this.__isMultiple = State.extractProp(el, 'multiple', false)
                    this.__isDisabled = State.extractProp(el, 'disabled', false)
                    this.__inputName = State.extractProp(el, 'name', null)
                    this.__nullable = State.extractProp(el, 'nullable', false)
                    this.__compareBy = State.extractProp(el, 'by')

                    this.__context = generateContext(State, this.__isMultiple, 'vertical', () => this.__activateSelectedOrFirst())

                    let defaultValue = State.extractProp(el, 'default-value', this.__isMultiple ? [] : null)

                    this.__value = defaultValue

                    queueMicrotask(() => {
                        State.effect(() => {
                            this.__inputName && renderHiddenInputs(State, this.$el, this.__inputName, this.__value)
                        })

                        State.effect(() => ! this.__isMultiple && this.__resetInput())
                    })
                },
                __startTyping() {
                    this.__isTyping = true
                },
                __stopTyping() {
                    this.__isTyping = false
                },
                __resetInput() {
                    let input = this.$refs.__input

                    if (! input) return

                    let value = this.__getCurrentValue()

                    input.value = value
                },
                __getCurrentValue() {
                    if (! this.$refs.__input) return ''
                    if (! this.__value) return ''
                    if (this.__displayValue) return this.__displayValue(this.__value)
                    if (typeof this.__value === 'string') return this.__value
                    return ''
                },
                __open() {
                    if (this.__isOpen) return
                    this.__isOpen = true

                    let input = this.$refs.__input

                    if (input) {
                        let value = input.value
                        let { selectionStart, selectionEnd, selectionDirection } = input
                        input.value = ''
                        input.dispatchEvent(new Event('change'))
                        input.value = value
                        if (selectionDirection !== null) {
                            input.setSelectionRange(selectionStart, selectionEnd, selectionDirection)
                        } else {
                            input.setSelectionRange(selectionStart, selectionEnd)
                        }
                    }

                    let nextTick = (callback: any) => requestAnimationFrame(() => requestAnimationFrame(callback))

                    nextTick(() => {
                        this.$refs.__input.focus({ preventScroll: true })
                        this.__activateSelectedOrFirst()
                    })
                },
                __close() {
                    this.__isOpen = false

                    this.__context.deactivate()
                },
                __activateSelectedOrFirst(activateSelected = true) {
                    if (! this.__isOpen) return

                    if (this.__context.hasActive() && this.__context.wasActivatedByKeyPress()) return

                    let firstSelectedValue: any

                    if (this.__isMultiple) {
                        let selectedItem = this.__context.getItemsByValues(this.__value)

                        firstSelectedValue = selectedItem.length ? selectedItem[0].value : null
                    } else {
                        firstSelectedValue = this.__value
                    }

                    let firstSelected = null
                    if (activateSelected && firstSelectedValue) {
                        firstSelected = this.__context.getItemByValue(firstSelectedValue)
                    }

                    if (firstSelected) {
                        this.__context.activateAndScrollToKey(firstSelected.key)
                        return
                    }

                    this.__context.activateAndScrollToKey(this.__context.firstKey())
                },
                __selectActive() {
                    let active = this.__context.getActiveItem()
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
        '@mousedown.window'(e: any) {
            if (
                !! ! this.$refs.__input.contains(e.target)
                && ! this.$refs.__button.contains(e.target)
                && ! this.$refs.__options.contains(e.target)
            ) {
                this.__close()
                this.__resetInput()
            }
        }
    })
}

function handleInput(el: any, State: any) {
    State.bind(el, {
        'data-ref': '__input',
        ':id'() { return this.$id('state-combobox-input') },

        'role': 'combobox',
        'tabindex': '0',
        'aria-autocomplete': 'list',

        async ':aria-controls'() { return await microtask(() => this.$refs.__options && this.$refs.__options.id) },
        ':aria-expanded'() { return this.$data.__isDisabled ? undefined : this.$data.__isOpen },
        ':aria-multiselectable'() { return this.$data.__isMultiple ? true : undefined },
        ':aria-activedescendant'() {
            if (! this.$data.__context.hasActive()) return

            let active = this.$data.__context.getActiveItem()

            return active ? active.el.id : null
        },
        ':aria-labelledby'() { return this.$refs.__label ? this.$refs.__label.id : (this.$refs.__button ? this.$refs.__button.id : null) },

        'data-init'() {
            let displayValueFn = State.extractProp(this.$el, 'display-value')
            if (displayValueFn) this.$data.__displayValue = displayValueFn
        },

        '@input.stop'(e: any) {
            if(this.$data.__isTyping) {
                this.$data.__open();
                this.$dispatch('change')
            }
        },
        '@blur'() { this.$data.__stopTyping(false) },
        '@keydown'(e: any) {
            queueMicrotask(() => this.$data.__context.activateByKeyEvent(e, false, () => this.$data.__isOpen, () => this.$data.__open(), (state: any) => this.$data.__isTyping = state))
        },
        '@keydown.enter.prevent.stop'() {
            this.$data.__selectActive()

            this.$data.__stopTyping()

            if (! this.$data.__isMultiple) {
                this.$data.__close()
                this.$data.__resetInput()
            }
        },
        '@keydown.escape.prevent'(e: any) {
            if (! this.$data.__static) e.stopPropagation()

            this.$data.__stopTyping()
            this.$data.__close()
            this.$data.__resetInput()

        },
        '@keydown.tab'() {
            this.$data.__stopTyping()
            if (this.$data.__isOpen) { this.$data.__close() }
            this.$data.__resetInput()
        },
        '@keydown.backspace'(e: any) {
            if (this.$data.__isMultiple) return
            if (! this.$data.__nullable) return

            let input = e.target

            requestAnimationFrame(() => {
                if (input.value === '') {
                    this.$data.__value = null

                    let options = this.$refs.__options
                    if (options) {
                        options.scrollTop = 0
                    }

                    this.$data.__context.deactivate()
                }
            })
        },
    })
}

function handleButton(el: any, State: any) {
    State.bind(el, {
        'data-ref': '__button',
        ':id'() { return this.$id('state-combobox-button') },

        'aria-haspopup': 'true',
        async ':aria-controls'() { return await microtask(() => this.$refs.__options && this.$refs.__options.id) },
        ':aria-labelledby'() { return this.$refs.__label ? [this.$refs.__label.id, this.$el.id].join(' ') : null },
        ':aria-expanded'() { return this.$data.__isDisabled ? null : this.$data.__isOpen },
        ':disabled'() { return this.$data.__isDisabled },
        'tabindex': '-1',

        'data-init'() { if (this.$el.tagName.toLowerCase() === 'button' && ! this.$el.hasAttribute('type')) this.$el.type = 'button' },

        '@click'(e: any) {
            if (this.$data.__isDisabled) return
            if (this.$data.__isOpen) {
                this.$data.__close()
                this.$data.__resetInput()
            } else {
                e.preventDefault()
                this.$data.__open()
            }

            this.$nextTick(() => this.$refs.__input.focus({ preventScroll: true }))
        },
    })
}

function handleLabel(el: any, State: any) {
    State.bind(el, {
        'data-ref': '__label',
        ':id'() { return this.$id('state-combobox-label') },
        '@click'() { this.$refs.__input.focus({ preventScroll: true }) },
    })
}

function handleOptions(el: any, State: any) {
    State.bind(el, {
        'data-ref': '__options',
        ':id'() { return this.$id('state-combobox-options') },

        'role': 'listbox',
        ':aria-labelledby'() { return this.$refs.__label ? this.$refs.__label.id : (this.$refs.__button ? this.$refs.__button.id : null) },

        'data-init'() {
            this.$data.__isStatic = State.bound(this.$el, 'static', false)

            if (State.bound(this.$el, 'hold')) {
                this.$data.__hold = true;
            }
        },

        'data-show'() { return this.$data.__isStatic ? true : this.$data.__isOpen },
    })
}

function handleOption(el: any, State: any, directive?: any, evaluate?: any) {
    State.bind(el, {
        'data-id'() { return ['state-combobox-option'] },
        ':id'() { return this.$id('state-combobox-option') },

        'role': 'option',
        ':tabindex'() { return this.$comboboxOption.isDisabled ? undefined : '-1' },

        'data-effect'() {
            this.$comboboxOption.isSelected
                ? el.setAttribute('aria-selected', true)
                : el.setAttribute('aria-selected', false)
        },

        ':aria-disabled'() { return this.$comboboxOption.isDisabled },

        'data-signal'() {
            return {
                '__optionKey': null,

                init() {
                    this.__optionKey = (Math.random() + 1).toString(36).substring(7)

                    let value = State.extractProp(this.$el, 'value')
                    let disabled = State.extractProp(this.$el, 'disabled', false, false)

                    this.__context.registerItem(this.__optionKey, this.$el, value, disabled)
                },
                destroy() {
                    this.__context.unregisterItem(this.__optionKey)
                }
            }
        },

        '@click'() {
            if (this.$comboboxOption.isDisabled) return;

            this.__selectOption(this.$el)

            if (! this.__isMultiple) {
                this.__close()
                this.__resetInput()
            }

            this.$nextTick(() => this.$refs.__input.focus({ preventScroll: true }))
        },
        '@mouseenter'(e: any) {
            this.__context.activateEl(this.$el)
        },
        '@mousemove'(e: any) {
            if (this.__context.isActiveEl(this.$el)) return

            this.__context.activateEl(this.$el)
        },
        '@mouseleave'(e: any) {
            if (this.__hold) return

            this.__context.deactivate()
        },
    })
}

function microtask(callback: any) {
    return new Promise(resolve => queueMicrotask(() => resolve(callback())))
}
