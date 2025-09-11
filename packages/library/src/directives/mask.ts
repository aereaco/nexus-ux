export default function (State: any) {
    State.directive('mask', (el: HTMLInputElement, { value, expression }: { value: any; expression: string }, { effect, evaluateLater, cleanup }: any) => {
        let templateFn: (input?: string) => any = () => expression
        let lastInputValue = ''

        queueMicrotask(() => {
            if (['function', 'dynamic'].includes(value)) {
                // This is an data-mask:function directive.

                let evaluator = evaluateLater(expression)

                effect(() => {
                    templateFn = (input: string) => {
                        let result: any

                        // We need to prevent "auto-evaluation" of functions like
                        // data-on expressions do so that we can use them as mask functions.
                        State.dontAutoEvaluateFunctions(() => {
                            evaluator((value: any) => {
                                result = typeof value === 'function' ? value(input) : value
                            }, { scope: {
                                // These are "magics" we'll make available to the data-mask:function:
                                '$input': input,
                                '$money': formatMoney.bind({ el }),
                            }})
                        })

                        return result
                    }

                    // Run on initialize which serves a dual purpose:
                    // - Initializing the mask on the input if it has an initial value.
                    // - Running the template function to set up reactivity, so that
                    //   when a dependency inside it changes, the input re-masks.
                    processInputValue(el, false)
                })
            } else {
                processInputValue(el, false)
            }

            // Override data-model's initial value...
            if ((el as any)._data_model) {
                // If the data-model value is the same, don't override it as that will trigger updates...
                if ((el as any)._data_model.get() === el.value) return

                // If the data-model value is `null` and the input value is an empty 
                // string, don't override it as that will trigger updates...
                if ((el as any)._data_model.get() === null && el.value === '') return

                (el as any)._data_model.set(el.value)
            }
        })

        const controller = new AbortController()

        cleanup(() => {
            controller.abort()
        })

        el.addEventListener('input', () => processInputValue(el), {
            signal: controller.signal,
            // Setting this as a capture phase listener to ensure it runs
            // before wire:model or data-model added as a latent binding...
            capture: true,
        } as AddEventListenerOptions)

        // Don't "restoreCursorPosition" on "blur", because Safari
        // will re-focus the input and cause a focus trap.
        el.addEventListener('blur', () => processInputValue(el, false), { signal: controller.signal } as AddEventListenerOptions)

        function processInputValue (el: HTMLInputElement, shouldRestoreCursor = true) {
            let input = el.value

            let template = templateFn(input)

            // If a template value is `falsy`, then don't process the input value
            if(!template || template === 'false') return false

            // If they hit backspace, don't process input.
            if (lastInputValue.length - el.value.length === 1) {
                return lastInputValue = el.value
            }

            let setInput = () => {
                lastInputValue = el.value = formatInput(input, template)
            }

            if (shouldRestoreCursor) {
                // When an input element's value is set, it moves the cursor to the end
                // therefore we need to track, estimate, and restore the cursor after
                // a change was made.
                restoreCursorPosition(el, template, () => {
                    setInput()
                })
            } else {
                setInput()
            }
        }

        function formatInput(input: string, template: string) {
            // Let empty inputs be empty inputs.
            if (input === '') return ''

            let strippedDownInput = stripDown(template, input)
            let rebuiltInput = buildUp(template, strippedDownInput)

            return rebuiltInput
        }
    }).before('model')
}

export function restoreCursorPosition(el: HTMLInputElement, template: string, callback: () => void) {
    let cursorPosition = el.selectionStart ?? 0
    let unformattedValue = el.value

    callback()

    let beforeLeftOfCursorBeforeFormatting = unformattedValue.slice(0, cursorPosition)

    let newPosition = buildUp(
        template, stripDown(
            template, beforeLeftOfCursorBeforeFormatting
        )
    ).length

    el.setSelectionRange(newPosition, newPosition)
}

export function stripDown(template: string, input: string) {
    let inputToBeStripped = input
    let output = ''
    let regexes: Record<string, RegExp> = {
        '9': /[0-9]/,
        'a': /[a-zA-Z]/,
        '*': /[a-zA-Z0-9]/,
    }

    let wildcardTemplate = ''

    // Strip away non wildcard template characters.
    for (let i = 0; i < template.length; i++) {
        if (['9', 'a', '*'].includes(template[i])) {
            wildcardTemplate += template[i]
            continue;
        }

        for (let j = 0; j < inputToBeStripped.length; j++) {
            if (inputToBeStripped[j] === template[i]) {
                inputToBeStripped = inputToBeStripped.slice(0, j) + inputToBeStripped.slice(j+1)

                break;
            }
        }
    }

    for (let i = 0; i < wildcardTemplate.length; i++) {
        let found = false

        for (let j = 0; j < inputToBeStripped.length; j++) {
            if (regexes[wildcardTemplate[i]].test(inputToBeStripped[j])) {
                output += inputToBeStripped[j]
                inputToBeStripped = inputToBeStripped.slice(0, j) + inputToBeStripped.slice(j+1)

                found = true
                break;
            }
        }

        if (! found) break;
    }

    return output
}

export function buildUp(template: string, input: string) {
    let clean = Array.from(input)
    let output = ''

    for (let i = 0; i < template.length; i++) {
        if (! ['9', 'a', '*'].includes(template[i])) {
            output += template[i]
            continue;
        }

        if (clean.length === 0) break;

        output += clean.shift()
    }

    return output
}

export function formatMoney(input: string, delimiter = '.', thousands?: string | null, precision = 2) {
    if (input === '-') return '-'
    if (/^\D+$/.test(input)) return '9'

    if (thousands === null || thousands === undefined) {
        thousands = delimiter === "," ? "." : ","
    }

    let addThousands = (inputStr: string, thousandsChar: string) => {
        let output = ''
        let counter = 0

        for (let i = inputStr.length - 1; i >= 0; i--) {
            if (inputStr[i] === thousandsChar) continue;

            if (counter === 3) {
                output = inputStr[i] + thousandsChar + output
                counter = 0
            } else {
                output = inputStr[i] + output
            }
            counter++
        }

        return output
    }

    let minus = input.startsWith('-') ? '-' : ''
    let strippedInput = input.replaceAll(new RegExp(`[^0-9\\${delimiter}]`, 'g'), '')
    let template = Array.from({ length: strippedInput.split(delimiter)[0].length }).fill('9').join('')

    template = `${minus}${addThousands(template, thousands as string)}`

    if (precision > 0 && input.includes(delimiter))
        template += `${delimiter}` + '9'.repeat(precision)

    queueMicrotask(() => {
        if ((this as any).el.value.endsWith(delimiter)) return

        if ((this as any).el.value[(this as any).el.selectionStart - 1] === delimiter) {
            (this as any).el.setSelectionRange((this as any).el.selectionStart - 1, (this as any).el.selectionStart - 1)
        }
    })

    return template
}
