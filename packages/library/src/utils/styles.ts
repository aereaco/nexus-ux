export function setStyles(el: any, value: any) {
    if (typeof value === 'object' && value !== null) {
        return setStylesFromObject(el, value)
    }

    return setStylesFromString(el, value)
}

function setStylesFromObject(el: any, value: Record<string, any>) {
    let previousStyles: Record<string, any> = {}

    Object.entries(value).forEach(([key, value]) => {
        previousStyles[key] = el.style[key]

        if (! key.startsWith('--')) {
            key = kebabCase(key);
        }

        el.style.setProperty(key, value)
    })

    setTimeout(() => {
        if (el.style.length === 0) {
            el.removeAttribute('style')
        }
    })

    return () => {
        setStyles(el, previousStyles)
    }
}

function setStylesFromString(el: any, value: string) {
    let cache = el.getAttribute('style', value)

    el.setAttribute('style', value)

    return () => {
        el.setAttribute('style', cache || '')
    }
}

function kebabCase(subject: string) {
    return subject.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
}
