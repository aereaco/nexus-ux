import dialog from './dialog'

export default function (State: any) {
    State.directive('dialog', (el: any, directive: any) => {
        if      (directive.value === 'overlay')     handleOverlay(el, State)
        else if (directive.value === 'panel')       handlePanel(el, State)
        else if (directive.value === 'title')       handleTitle(el, State)
        else if (directive.value === 'description') handleDescription(el, State)
        else                                        handleRoot(el, State)
    })

    State.sprite('dialog', (el: any) => {
        let $data = State.$data(el)

        return {
            // Kept here for legacy. Remove after out of beta.
            get open() {
                return $data.__isOpen
            },
            get isOpen() {
                return $data.__isOpen
            },
            close() {
                $data.__close()
            }
        }
    })
}

function handleRoot(el: any, State: any) {
    State.bind(el, {
        'data-signal'() {
            return {
                init() {
                    // If the user chose to use :open and @close instead of data-model.
                    (State.bound(el, 'open') !== undefined) && State.effect(() => {
                        this.__isOpenState = State.bound(el, 'open')
                    })

                    if (State.bound(el, 'initial-focus') !== undefined) this.$watch('__isOpenState', () => {
                        if (! this.__isOpenState) return

                        setTimeout(() => {
                            State.bound(el, 'initial-focus').focus()
                        }, 0);
                    })
                },
                __isOpenState: false,
                __close() {
                    if (State.bound(el, 'open')) this.$dispatch('close')
                    else this.__isOpenState = false
                },
                get __isOpen() {
                    return State.bound(el, 'static', this.__isOpenState)
                },
            }
        },
        'data-modelable': '__isOpenState',
        'data-id'() { return ['state-dialog-title', 'state-dialog-description'] },
        'data-show'() { return this.__isOpen },
        'data-trap.inert.noscroll'() { return this.__isOpen },
        '@keydown.escape'() { this.__close() },
        ':aria-labelledby'() { return this.$id('state-dialog-title') },
        ':aria-describedby'() { return this.$id('state-dialog-description') },
        'role': 'dialog',
        'aria-modal': 'true',
    })
}

function handleOverlay(el: any, State: any) {
    State.bind(el, {
        'data-init'() { if (this.$data.__isOpen === undefined) console.warn('\"data-dialog:overlay\" is missing a parent element with \"data-dialog\".') },
        'data-show'() { return this.__isOpen },
        '@click.prevent.stop'() { this.$data.__close() },
    })
}

function handlePanel(el: any, State: any) {
    State.bind(el, {
        '@click.outside'() { this.$data.__close() },
        'data-show'() { return this.$data.__isOpen },
    })
}

function handleTitle(el: any, State: any) {
    State.bind(el, {
        'data-init'() { if (this.$data.__isOpen === undefined) console.warn('\"data-dialog:title\" is missing a parent element with \"data-dialog\".') },
        ':id'() { return this.$id('state-dialog-title') },
    })
}

function handleDescription(el: any, State: any) {
    State.bind(el, {
        ':id'() { return this.$id('state-dialog-description') },
    })
}
