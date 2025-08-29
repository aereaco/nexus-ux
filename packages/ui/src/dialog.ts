import dialog from './dialog'

export default function (Alpine: any) {
    Alpine.directive('dialog', (el: any, directive: any) => {
        if      (directive.value === 'overlay')     handleOverlay(el, Alpine)
        else if (directive.value === 'panel')       handlePanel(el, Alpine)
        else if (directive.value === 'title')       handleTitle(el, Alpine)
        else if (directive.value === 'description') handleDescription(el, Alpine)
        else                                        handleRoot(el, Alpine)
    })

    Alpine.magic('dialog', (el: any) => {
        let $data = Alpine.$data(el)

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

function handleRoot(el: any, Alpine: any) {
    Alpine.bind(el, {
        'data-data'() {
            return {
                init() {
                    // If the user chose to use :open and @close instead of data-model.
                    (Alpine.bound(el, 'open') !== undefined) && Alpine.effect(() => {
                        this.__isOpenState = Alpine.bound(el, 'open')
                    })

                    if (Alpine.bound(el, 'initial-focus') !== undefined) this.$watch('__isOpenState', () => {
                        if (! this.__isOpenState) return

                        setTimeout(() => {
                            Alpine.bound(el, 'initial-focus').focus()
                        }, 0);
                    })
                },
                __isOpenState: false,
                __close() {
                    if (Alpine.bound(el, 'open')) this.$dispatch('close')
                    else this.__isOpenState = false
                },
                get __isOpen() {
                    return Alpine.bound(el, 'static', this.__isOpenState)
                },
            }
        },
        'data-modelable': '__isOpenState',
        'data-id'() { return ['alpine-dialog-title', 'alpine-dialog-description'] },
        'data-show'() { return this.__isOpen },
        'data-trap.inert.noscroll'() { return this.__isOpen },
        '@keydown.escape'() { this.__close() },
        ':aria-labelledby'() { return this.$id('alpine-dialog-title') },
        ':aria-describedby'() { return this.$id('alpine-dialog-description') },
        'role': 'dialog',
        'aria-modal': 'true',
    })
}

function handleOverlay(el: any, Alpine: any) {
    Alpine.bind(el, {
        'data-init'() { if (this.$data.__isOpen === undefined) console.warn('\"data-dialog:overlay\" is missing a parent element with \"data-dialog\".') },
        'data-show'() { return this.__isOpen },
        '@click.prevent.stop'() { this.$data.__close() },
    })
}

function handlePanel(el: any, Alpine: any) {
    Alpine.bind(el, {
        '@click.outside'() { this.$data.__close() },
        'data-show'() { return this.$data.__isOpen },
    })
}

function handleTitle(el: any, Alpine: any) {
    Alpine.bind(el, {
        'data-init'() { if (this.$data.__isOpen === undefined) console.warn('\"data-dialog:title\" is missing a parent element with \"data-dialog\".') },
        ':id'() { return this.$id('alpine-dialog-title') },
    })
}

function handleDescription(el: any, Alpine: any) {
    Alpine.bind(el, {
        ':id'() { return this.$id('alpine-dialog-description') },
    })
}
