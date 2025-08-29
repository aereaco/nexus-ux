import { closestSignalStack, mergeProxies } from './scope'
import { injectMagics } from './magics'
import { tryCatch, handleError } from './utils/error'

let shouldAutoEvaluateFunctions: boolean = true

export function dontAutoEvaluateFunctions(callback: any) {
    let cache = shouldAutoEvaluateFunctions

    shouldAutoEvaluateFunctions = false

    let result = callback()

    shouldAutoEvaluateFunctions = cache

    return result
}

export function evaluate(el: any, expression: any, extras: any = {}) {
    let result: any

    evaluateLater(el, expression)((value: any) => result = value, extras)

    return result
}

export function evaluateLater(...args: any[]) {
    return theEvaluatorFunction(...args)
}

let theEvaluatorFunction: any = normalEvaluator

export function setEvaluator(newEvaluator: any) {
    theEvaluatorFunction = newEvaluator
}

export function normalEvaluator(el: any, expression: any) {
    let overriddenMagics: Record<string, any> = {}

    injectMagics(overriddenMagics, el)

    let signalStack = [overriddenMagics, ...closestSignalStack(el)]

    let evaluator = (typeof expression === 'function')
        ? generateEvaluatorFromFunction(signalStack, expression)
        : generateEvaluatorFromString(signalStack, expression, el)

    return tryCatch.bind(null, el, expression, evaluator)
}

export function generateEvaluatorFromFunction(signalStack: any[], func: any) {
    return (receiver: any = () => {}, { scope = {}, params = [], context }: { scope?: any, params?: any[], context?: any } = {}) => {
        let result = func.apply(mergeProxies([scope, ...signalStack]), params)

        runIfTypeOfFunction(receiver, result)
    }
}

let evaluatorMemo: Record<string, any> = {}

function generateFunctionFromString(expression: string, el: any) {
    if (evaluatorMemo[expression]) {
        return evaluatorMemo[expression]
    }

    let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor

    let rightSideSafeExpression = 0
        || /^[\n\s]*if.*\(.*\)/.test(expression.trim())
        || /^(let|const)\s/.test(expression.trim())
            ? `(async()=>{ ${expression} })()`
            : expression

    const safeAsyncFunction = () => {
        try {
            let func = new AsyncFunction(
                ["__self", "scope"],
                `with (scope) { __self.result = ${rightSideSafeExpression} }; __self.finished = true; return __self.result;`
            )

            Object.defineProperty(func, "name", {
                value: `[Alpine] ${expression}`,
            })

            return func
        } catch ( error ) {
            handleError( error, el, expression )
            return Promise.resolve()
        }
    }
    let func = safeAsyncFunction()

    evaluatorMemo[expression] = func

    return func
}

function generateEvaluatorFromString(signalStack: any[], expression: string, el: any) {
    let func = generateFunctionFromString(expression, el)

    return (receiver: any = () => {}, { scope = {}, params = [], context }: { scope?: any, params?: any[], context?: any } = {}) => {
        func.result = undefined
        func.finished = false

        let completeScope = mergeProxies([ scope, ...signalStack ])

        if (typeof func === 'function' ) {
            let promise = func.call(context, func, completeScope).catch((error: any) => handleError(error, el, expression))

            if (func.finished) {
                runIfTypeOfFunction(receiver, func.result, completeScope, params, el)
                func.result = undefined
            } else {
                promise.then((result: any) => {
                    runIfTypeOfFunction(receiver, result, completeScope, params, el)
                }).catch( (error: any) => handleError( error, el, expression ) )
                .finally( () => func.result = undefined )
            }
        }
    }
}

export function runIfTypeOfFunction(receiver: any, value: any, scope?: any, params?: any, el?: any) {
    if (shouldAutoEvaluateFunctions && typeof value === 'function') {
        let result = value.apply(scope, params)

        if (result instanceof Promise) {
            result.then((i: any) => runIfTypeOfFunction(receiver, i, scope, params)).catch( (error: any) => handleError( error, el, value ) )
        } else {
            receiver(result)
        }
    } else if (typeof value === 'object' && value instanceof Promise) {
        value.then((i: any) => receiver(i))
    } else {
        receiver(value)
    }
}