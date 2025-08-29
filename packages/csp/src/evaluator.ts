import { generateEvaluatorFromFunction, runIfTypeOfFunction } from 'alpinejs/src/evaluator'
import { closestSignalStack, mergeProxies } from 'alpinejs/src/scope'
import { tryCatch } from 'alpinejs/src/utils/error'
import { injectMagics } from 'alpinejs/src/magics'

export function cspEvaluator(el: any, expression: any) {
    let signalStack = generateSignalStack(el)

    if (typeof expression === 'function') {
        return generateEvaluatorFromFunction(signalStack, expression)
    }

    let evaluator = generateEvaluator(el, expression, signalStack)

    return tryCatch.bind(null, el, expression, evaluator)
}

function generateSignalStack(el: any) {
    let overriddenMagics: Record<string, any> = {}

    injectMagics(overriddenMagics, el)

    return [overriddenMagics, ...closestSignalStack(el)]
}

function generateEvaluator(el: any, expression: string, signalStack: any[]) {
    return (receiver: any = () => {}, { scope = {}, params = [] } = {}) => {
        let completeScope = mergeProxies([scope, ...signalStack])

        let evaluatedExpression = expression.split('.').reduce(
            (currentScope: any, currentExpression: string) => {
                if (currentScope[currentExpression] === undefined) {
                    throwExpressionError(el, expression)
                }

                return currentScope[currentExpression]
            },
            completeScope,
        )

        runIfTypeOfFunction(receiver, evaluatedExpression, completeScope, params)
    }
}

function throwExpressionError(el: any, expression: string) {
    console.warn(
`Alpine Error: Alpine is unable to interpret the following expression using the CSP-friendly build:

"${expression}"

Read more about the Alpine's CSP-friendly build restrictions here: https://alpinejs.dev/advanced/csp

`,
el
    )
}
