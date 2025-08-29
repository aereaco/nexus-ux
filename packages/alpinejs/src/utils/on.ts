import { debounce } from './debounce'
import { throttle } from './throttle'

export default function on (el: any, event: string, modifiers: string[], callback: (e: any) => void) {
    let listenerTarget: any = el

    let handler = (e: any) => callback(e)

    let options: any = {}

    // This little helper allows us to add functionality to the listener's
    // handler more flexibly in a "middleware" style.
    let wrapHandler = (callback: any, wrapper: any) => (e: any) => wrapper(callback, e)

    if (modifiers.includes("dot")) event = dotSyntax(event)
    if (modifiers.includes('camel')) event = camelCase(event)
    if (modifiers.includes('passive')) options.passive = true
    if (modifiers.includes('capture')) options.capture = true
    if (modifiers.includes('window')) listenerTarget = window
    if (modifiers.includes('document')) listenerTarget = document

    // By wrapping the handler with debounce & throttle first, we ensure that the wrapping logic itself is not
    // throttled/debounced, only the user's callback is. This way, if the user expects
    // `e.preventDefault()` to happen, it'll still happen even if their callback gets throttled.
    if (modifiers.includes('debounce')) {
        let nextModifier = modifiers[modifiers.indexOf('debounce')+1] || 'invalid-wait'
        let wait = isNumeric(nextModifier.split('ms')[0]) ? Number(nextModifier.split('ms')[0]) : 250

        handler = debounce(handler, wait)
    }
    if (modifiers.includes('throttle')) {
        let nextModifier = modifiers[modifiers.indexOf('throttle')+1] || 'invalid-wait'
        let wait = isNumeric(nextModifier.split('ms')[0]) ? Number(nextModifier.split('ms')[0]) : 250

        handler = throttle(handler, wait)
    }

    if (modifiers.includes('prevent')) handler = wrapHandler(handler, (next: any, e: any) => { e.preventDefault(); next(e) })
    if (modifiers.includes('stop')) handler = wrapHandler(handler, (next: any, e: any) => { e.stopPropagation(); next(e) })

    if (modifiers.includes("once")) {
        handler = wrapHandler(handler, (next: any, e: any) => {
            next(e);

            listenerTarget.removeEventListener(event, handler, options);
        });
    }

    if (modifiers.includes('away') || modifiers.includes('outside')) {
        listenerTarget = document

        handler = wrapHandler(handler, (next: any, e: any) => {
            if (el.contains(e.target)) return

            if (e.target.isConnected === false) return

            if (el.offsetWidth < 1 && el.offsetHeight < 1) return

            // Additional check for special implementations like data-collapse
            // where the element doesn't have display: none
            if (el._data_isShown === false) return

            next(e)
        })
    }

    if (modifiers.includes('self')) handler = wrapHandler(handler, (next: any, e: any) => { e.target === el && next(e) })

    // Handle :keydown and :keyup listeners.
    // Handle :click and :auxclick listeners.
    if (isKeyEvent(event) || isClickEvent(event)) {
        handler = wrapHandler(handler, (next: any, e: any) => {
            if (isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers)) {
                return
            }
            
            next(e)
        })
    }

    listenerTarget.addEventListener(event, handler, options)

    return () => {
        listenerTarget.removeEventListener(event, handler, options)
    }
}

function dotSyntax(subject: string) {
    return subject.replace(/-/g, ".")
}

function camelCase(subject: string) {
    return subject.toLowerCase().replace(/-(\w)/g, (match: string, char: string) => char.toUpperCase())
}

function isNumeric(subject: any){
    return ! Array.isArray(subject) && ! isNaN(subject)
}

function kebabCase(subject: string) {
    if ([' ','_'].includes(subject
    )) return subject
    return subject.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[_\s]/, '-').toLowerCase()
}

function isKeyEvent(event: string) {
    return ['keydown', 'keyup'].includes(event)
}

function isClickEvent(event: string) {
    return ['contextmenu','click','mouse'].some(i => event.includes(i))
}

function isListeningForASpecificKeyThatHasntBeenPressed(e: any, modifiers: string[]) {
    let keyModifiers = modifiers.filter(i => {
        // `preserve-scroll` is specifically for Livewire and is not used by Alpine...
        return ! ['window', 'document', 'prevent', 'stop', 'once', 'capture', 'self', 'away', 'outside', 'passive', 'preserve-scroll'].includes(i)
    })

    if (keyModifiers.includes('debounce')) {
        let debounceIndex = keyModifiers.indexOf('debounce')
        keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex+1] || 'invalid-wait').split('ms')[0]) ? 2 : 1)
    }

    if (keyModifiers.includes('throttle')) {
        let debounceIndex = keyModifiers.indexOf('throttle')
        keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex+1] || 'invalid-wait').split('ms')[0]) ? 2 : 1)
    }

    // If no modifier is specified, we'll call it a press.
    if (keyModifiers.length === 0) return false

    // If one is passed, AND it matches the key pressed, we'll call it a press.
    if (keyModifiers.length === 1 && keyToModifiers(e.key).includes(keyModifiers[0])) return false

    // The user is listening for key combinations.
    const systemKeyModifiers = ['ctrl', 'shift', 'alt', 'meta', 'cmd', 'super']
    const selectedSystemKeyModifiers = systemKeyModifiers.filter(modifier => keyModifiers.includes(modifier))

    keyModifiers = keyModifiers.filter(i => ! selectedSystemKeyModifiers.includes(i))

    if (selectedSystemKeyModifiers.length > 0) {
        const activelyPressedKeyModifiers = selectedSystemKeyModifiers.filter(modifier => {
            // Alias "cmd" and "super" to "meta"
            if (modifier === 'cmd' || modifier === 'super') modifier = 'meta'

            return e[`${modifier}Key`]
        })

        // If all the modifiers selected are pressed, ...
        if (activelyPressedKeyModifiers.length === selectedSystemKeyModifiers.length) {

            // AND the event is a click. It's a pass.
            if (isClickEvent(e.type)) return false

            // OR the remaining key is pressed as well. It's a press.
            if (keyToModifiers(e.key).includes(keyModifiers[0])) return false
        }
    }

    // We'll call it NOT a valid keypress.
    return true
}

function keyToModifiers(key: string) {
    if (! key) return []

    key = kebabCase(key)

    let modifierToKeyMap: Record<string, string> = {
        'ctrl': 'control',
        'slash': '/',
        'space': ' ',
        'spacebar': ' ',
        'cmd': 'meta',
        'esc': 'escape',
        'up': 'arrow-up',
        'down': 'arrow-down',
        'left': 'arrow-left',
        'right': 'arrow-right',
        'period': '.',
        'comma': ',',
        'equal': '=',
        'minus': '-',
        'underscore': '_',
    }

    modifierToKeyMap[key] = key

    return Object.keys(modifierToKeyMap).map(modifier => {
        if (modifierToKeyMap[modifier] === key) return modifier
    }).filter(modifier => modifier) as string[]
}
