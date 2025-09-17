export default function (State: any) {
    State.directive('tabs', (el: any, directive: any) => {
        if      (! directive.value)                handleRoot(el, State)
        else if (directive.value === 'list')       handleList(el, State)
        else if (directive.value === 'tab')        handleTab(el, State)
        else if (directive.value === 'panels')     handlePanels(el, State)
        else if (directive.value === 'panel')      handlePanel(el, State)
    }).before('bind')

    State.sprite('tab', (el: any) => {
        let $data = State.$data(el)

        return {
            get isSelected() {
                return $data.__selectedIndex === $data.__tabs.indexOf($data.__tabEl)
            },
            get isDisabled() {
                return $data.__isDisabled
            }
        }
    })

    State.sprite('panel', (el: any) => {
        let $data = State.$data(el)

        return {
            get isSelected() {
                return $data.__selectedIndex === $data.__panels.indexOf($data.__panelEl)
            }
        }
    })
}

function handleRoot(el: any, State: any) {
    State.bind(el, {
        'data-modelable': '__selectedIndex',
        'data-signal'() {
            return {
                init() {
                    queueMicrotask(() => {
                        let defaultIndex = this.__selectedIndex || Number(State.bound(this.$el, 'default-index', 0))
                        let tabs = this.__activeTabs()
                        let clamp = (number: any, min: any, max: any) => Math.min(Math.max(number, min), max)

                        this.__selectedIndex = clamp(defaultIndex, 0, tabs.length -1)

                        State.effect(() => {
                            this.__manualActivation = State.bound(this.$el, 'manual', false)
                        })
                    })
                },
                __tabs: [] as any,
                __panels: [] as any,
                __selectedIndex: null as any,
                __tabGroupEl: undefined as any,
                __manualActivation: false,
                __addTab(el: any) { this.__tabs.push(el) },
                __addPanel(el: any) { this.__panels.push(el) },
                __selectTab(el: any) {
                    this.__selectedIndex = this.__tabs.indexOf(el)
                },
                __activeTabs() {
                   return this.__tabs.filter((i: any) => !i.__disabled)
                },
            }
        }
    })
}

function handleList(el: any, State: any) {
    State.bind(el, {
        'data-init'() { this.$data.__tabGroupEl = this.$el }
    })
}

function handleTab(el: any, State: any) {
    State.bind(el, {
        'data-init'() { if (this.$el.tagName.toLowerCase() === 'button' && !this.$el.hasAttribute('type')) this.$el.type = 'button' },
        'data-signal'() { return {
            init() {
                this.__tabEl = this.$el
                this.$data.__addTab(this.$el)
                this.__tabEl.__disabled = State.bound(this.$el, 'disabled', false)
                this.__isDisabled = this.__tabEl.__disabled
            },
            __tabEl: undefined as any,
            __isDisabled: false,
        }},
        '@click'() {
            if (this.$el.__disabled) return

            this.$data.__selectTab(this.$el)

            this.$el.focus()
        },
        '@keydown.enter.prevent.stop'() { this.__selectTab(this.$el) },
        '@keydown.space.prevent.stop'() { this.__selectTab(this.$el) },
        '@keydown.home.prevent.stop'() { this.$focus.within(this.$data.__activeTabs()).first() },
        '@keydown.page-up.prevent.stop'() { this.$focus.within(this.$data.__activeTabs()).first() },
        '@keydown.end.prevent.stop'() { this.$focus.within(this.$data.__activeTabs()).last() },
        '@keydown.page-down.prevent.stop'() { this.$focus.within(this.$data.__activeTabs()).last() },
        '@keydown.down.prevent.stop'() { this.$focus.within(this.$data.__activeTabs()).withWrapAround().next() },
        '@keydown.right.prevent.stop'() { this.$focus.within(this.$data.__activeTabs()).withWrapAround().next() },
        '@keydown.up.prevent.stop'() { this.$focus.within(this.$data.__activeTabs()).withWrapAround().prev() },
        '@keydown.left.prevent.stop'() { this.$focus.within(this.$data.__activeTabs()).withWrapAround().prev() },
        ':tabindex'() { return this.$tab.isSelected ? 0 : -1 },
        '@mousedown'(event: any) { event.preventDefault() },
        '@focus'() {
            if (this.$data.__manualActivation) {
                this.$el.focus()
            } else {
                if (this.$el.__disabled) return

                this.$data.__selectTab(this.$el)

                this.$el.focus()
            }
        },
    })
}

function handlePanels(el: any, State: any) {
    State.bind(el, {
        //
    })
}

function handlePanel(el: any, State: any) {
    State.bind(el, {
        ':tabindex'() { return this.$panel.isSelected ? 0 : -1 },
        'data-signal'() { return {
            init() {
                this.__panelEl = this.$el
                this.$data.__addPanel(this.$el)
            },
            __panelEl: undefined as any,
        }},
        'data-show'() { return this.$panel.isSelected },
    })
}
