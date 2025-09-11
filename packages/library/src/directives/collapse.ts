export default function (State: any) {
    State.directive('collapse', collapse)

    collapse.inline = (el: any, { modifiers }: any) => {
        if (! modifiers.includes('min')) return

        el._data_doShow = () => {}
        el._data_doHide = () => {}
    }

    function collapse(el: any, { modifiers }: any) {
        let duration = modifierValue(modifiers, 'duration', 250) / 1000
        let floor = modifierValue(modifiers, 'min', 0)
        let fullyHide = ! modifiers.includes('min')

        if (! el._data_isShown) el.style.height = `${floor}px`
        if (! el._data_isShown && fullyHide) el.hidden = true
        if (! el._data_isShown) el.style.overflow = 'hidden'

        let setFunction = (el: any, styles: any) => {
            let revertFunction = State.setStyles(el, styles);

            return styles.height ? () => {} : revertFunction
        }

        let transitionStyles = {
            transitionProperty: 'height',
            transitionDuration: `${duration}s`,
            transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        }

        el._data_transition = {
            in(before = () => {}, after = () => {}) {
                if (fullyHide) el.hidden = false;
                if (fullyHide) el.style.display = null

                let current = el.getBoundingClientRect().height

                el.style.height = 'auto'

                let full = el.getBoundingClientRect().height

                if (current === full) { current = floor }

                State.transition(el, State.setStyles, {
                    during: transitionStyles,
                    start: { height: current+'px' },
                    end: { height: full+'px' },
                }, () => el._data_isShown = true, () => {
                    if (Math.abs(el.getBoundingClientRect().height - full) < 1) {
                        el.style.overflow = null
                    }
                })
            },

            out(before = () => {}, after = () => {}) {
                let full = el.getBoundingClientRect().height

                State.transition(el, setFunction, {
                    during: transitionStyles,
                    start: { height: full+'px' },
                    end: { height: floor+'px' },
                }, () => el.style.overflow = 'hidden', () => {
                    el._data_isShown = false

                    if (el.style.height == `${floor}px` && fullyHide) {
                        el.style.display = 'none'
                        el.hidden = true
                    }
                })
            },
        }
    }
}

function modifierValue(modifiers: any[], key: string, fallback: any) {
    if (modifiers.indexOf(key) === -1) return fallback

    const rawValue = modifiers[modifiers.indexOf(key) + 1]

    if (! rawValue) return fallback

    if (key === 'duration') {
        let match = rawValue.match(/([0-9]+)ms/)
        if (match) return match[1]
    }

    if (key === 'min') {
        let match = rawValue.match(/([0-9]+)px/)
        if (match) return match[1]
    }

    return rawValue
}
