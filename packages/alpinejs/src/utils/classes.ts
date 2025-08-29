export function setClasses(el: any, value: any) {
    if (Array.isArray(value)) {
        return setClassesFromString(el, value.join(' '))
    } else if (typeof value === 'object' && value !== null) {
        return setClassesFromObject(el, value)
    } else if (typeof value === 'function') {
        return setClasses(el, value())
    }

    return setClassesFromString(el, value)
}

function setClassesFromString(el: any, classString: any) {
    let split = (classString: string) => classString.split(' ').filter(Boolean)

    let missingClasses = (classString: string) => classString.split(' ').filter((i: string) => ! el.classList.contains(i)).filter(Boolean)

    let addClassesAndReturnUndo = (classes: string[]) => {
        el.classList.add(...classes)

        return () => { el.classList.remove(...classes) }
    }

    classString = (classString === true) ? '' : (classString || '')

    return addClassesAndReturnUndo(missingClasses(classString))
}

function setClassesFromObject(el: any, classObject: Record<string, boolean>) {
    let split = (classString: string) => classString.split(' ').filter(Boolean)

    let forAdd = Object.entries(classObject).flatMap(([classString, bool]) => bool ? split(classString) : []).filter(Boolean as any)
    let forRemove = Object.entries(classObject).flatMap(([classString, bool]) => ! bool ? split(classString) : []).filter(Boolean as any)

    let added: string[] = []
    let removed: string[] = []

    forRemove.forEach((i: string) => {
        if (el.classList.contains(i)) {
            el.classList.remove(i)
            removed.push(i)
        }
    })

    forAdd.forEach((i: string) => {
        if (! el.classList.contains(i)) {
            el.classList.add(i)
            added.push(i)
        }
    })

    return () => {
        removed.forEach(i => el.classList.add(i))
        added.forEach(i => el.classList.remove(i))
    }
}
