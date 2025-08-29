import disclosure from './disclosure'

export default function (Alpine: any) {
    Alpine.directive('disclosure', (el: any, directive: any) => {
        if      (! directive.value)            handleRoot(el, Alpine)
        else if (directive.value === 'panel')  handlePanel(el, Alpine)
        else if (directive.value === 'button') handleButton(el, Alpine)
    }).before('bind')

    Alpine.magic('disclosure', (el: any) => {
        let $data = Alpine.$data(el)

        return {
            get isOpen() {
                return $data.__isOpen
            },
            close() {
                $data.__close()
            }
        }
    })
}

function handleRoot(el: any, Alpine: any) {
    Alpine.bind(el, {
        'data-modelable': '__isOpen',
        'data-signal'() {
            return {
                // The panel will call this...
                // We can't do this inside a microtask in data-init because, when default-open is set to "true",
                // It will cause the panel to transition in for the first time, instead of showing instantly...
                __determineDefaultOpenState() {
                    let defaultIsOpen = Boolean(Alpine.bound(this.$el, 'default-open', false))

                    if (defaultIsOpen) this.__isOpen = defaultIsOpen
                },
                __isOpen: false,
                __close() {
                    this.__isOpen = false
                },
                __toggle() {
                    this.__isOpen = ! this.__isOpen
                },
            }
        },
        'data-id'() { return ['alpine-disclosure-panel'] },
    })
}

function handleButton(el: any, Alpine: any) {
    Alpine.bind(el, {
        'data-init'() {
            if (this.$el.tagName.toLowerCase() === 'button' && !this.$el.hasAttribute('type')) this.$el.type = 'button'
        },
        '@click'() {
            this.$data.__isOpen = ! this.$data.__isOpen
        },
        ':aria-expanded'() {
            return this.$data.__isOpen
        },
        ':aria-controls'() {
            return this.$data.$id('alpine-disclosure-panel')
        },
        '@keydown.space.prevent.stop'() { this.$data.__toggle() },
        '@keydown.enter.prevent.stop'() { this.$data.__toggle() },
        // Required for firefox, event.preventDefault() in handleKeyDown for
        // the Space key doesn't cancel the handleKeyUp, which in turn
        // triggers a *click*.
        '@keyup.space.prevent'() {},
    })
}

function handlePanel(el: any, Alpine: any) {
    Alpine.bind(el, {
        'data-init'() {
            this.$data.__determineDefaultOpenState()
        },
        'data-show'() {
            return this.$data.__isOpen
        },
        ':id'() {
            return this.$data.$id('alpine-disclosure-panel')
        },
    })
}
