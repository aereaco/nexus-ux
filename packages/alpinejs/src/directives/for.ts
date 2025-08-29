import { addScopeToNode } from '../scope'
import { evaluateLater } from '../evaluator'
import { directive } from '../directives'
import { reactive } from '../reactivity'
import { initTree, destroyTree } from '../lifecycle'
import { mutateDom } from '../mutation'
import { warn } from '../utils/warn'
import { skipDuringClone } from '../clone'

directive('for', (el: any, { expression }: any, { effect, cleanup }: any) => {
    let iteratorNames = parseForExpression(expression)

    let evaluateItems = evaluateLater(el, iteratorNames.items)
    let evaluateKey = evaluateLater(el,
        // the data-bind:key expression is stored for our use instead of evaluated.
        el._data_keyExpression || 'index'
    )

    el._data_prevKeys = []
    el._data_lookup = {}

    effect(() => loop(el, iteratorNames, evaluateItems, evaluateKey))

    cleanup(() => {
        Object.values(el._data_lookup).forEach((el: any) =>
            mutateDom(() => {
                destroyTree(el)

                el.remove()
            }
        ))

        delete el._data_prevKeys
        delete el._data_lookup
    })
})

let shouldFastRender = true

function loop(el: any, iteratorNames: any, evaluateItems: any, evaluateKey: any) {
    let isObject = (i: any) => typeof i === 'object' && ! Array.isArray(i)
    let templateEl = el

    evaluateItems((items: any) => {
        if (isNumeric(items) && items >= 0) {
            items = Array.from(Array(items).keys(), (i: any) => i + 1)
        }

        if (items === undefined) items = []

        let lookup = el._data_lookup
        let prevKeys = el._data_prevKeys
        let scopes: any[] = []
        let keys: any[] = []

        if (isObject(items)) {
            items = Object.entries(items).map(([key, value]) => {
                let scope = getIterationScopeVariables(iteratorNames, value, key, items)

                evaluateKey((value: any) => {
                    if (keys.includes(value)) warn('Duplicate key on data-for', el)

                    keys.push(value)
                }, { scope: { index: key, ...scope} })

                scopes.push(scope)
            })
        } else {
            for (let i = 0; i < items.length; i++) {
                let scope = getIterationScopeVariables(iteratorNames, items[i], i, items)

                evaluateKey((value: any) => {
                    if (keys.includes(value)) warn('Duplicate key on data-for', el)

                    keys.push(value)
                }, { scope: { index: i, ...scope} })

                scopes.push(scope)
            }
        }

        let adds: any[] = []
        let moves: any[] = []
        let removes: any[] = []
        let sames: any[] = []

        for (let i = 0; i < prevKeys.length; i++) {
            let key = prevKeys[i]

            if (keys.indexOf(key) === -1) removes.push(key)
        }

        prevKeys = prevKeys.filter((key: any) => ! removes.includes(key))

        let lastKey = 'template'

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i]

            let prevIndex = prevKeys.indexOf(key)

            if (prevIndex === -1) {
                prevKeys.splice(i, 0, key)

                adds.push([lastKey, i])
            } else if (prevIndex !== i) {
                let keyInSpot = prevKeys.splice(i, 1)[0]
                let keyForSpot = prevKeys.splice(prevIndex - 1, 1)[0]

                prevKeys.splice(i, 0, keyForSpot)
                prevKeys.splice(prevIndex, 0, keyInSpot)

                moves.push([keyInSpot, keyForSpot])
            } else {
                sames.push(key)
            }

            lastKey = key
        }

        for (let i = 0; i < removes.length; i++) {
            let key = removes[i]

            if (! (key in lookup)) continue

            mutateDom(() => {
                destroyTree(lookup[key])

                lookup[key].remove()
            })

            delete lookup[key]
        }

        for (let i = 0; i < moves.length; i++) {
            let [keyInSpot, keyForSpot] = moves[i]

            let elInSpot = lookup[keyInSpot]
            let elForSpot = lookup[keyForSpot]

            let marker = document.createElement('div')

            mutateDom(() => {
                if (! elForSpot) warn(`data-for ":key" is undefined or invalid`, templateEl, keyForSpot, lookup)

                elForSpot.after(marker)
                elInSpot.after(elForSpot)
                elForSpot._data_currentIfEl && elForSpot.after(elForSpot._data_currentIfEl)
                marker.before(elInSpot)
                elInSpot._data_currentIfEl && elInSpot.after(elInSpot._data_currentIfEl)
                marker.remove()
            })

            elForSpot._data_refreshXForScope(scopes[keys.indexOf(keyForSpot)])
        }

        for (let i = 0; i < adds.length; i++) {
            let [lastKey, index] = adds[i]

            let lastEl = (lastKey === 'template') ? templateEl : lookup[lastKey]
            if (lastEl._data_currentIfEl) lastEl = lastEl._data_currentIfEl

            let scope = scopes[index]
            let key = keys[index]

            let clone = document.importNode(templateEl.content, true).firstElementChild

            let reactiveScope = reactive(scope)

            addScopeToNode(clone, reactiveScope, templateEl)

            clone._data_refreshXForScope = (newScope: any) => {
                Object.entries(newScope).forEach(([key, value]) => {
                    reactiveScope[key] = value
                })
            }

            mutateDom(() => {
                lastEl.after(clone)

                skipDuringClone(() => initTree(clone))()
            })

            if (typeof key === 'object') {
                warn('data-for key cannot be an object, it must be a string or an integer', templateEl)
            }

            lookup[key] = clone
        }

        for (let i = 0; i < sames.length; i++) {
            lookup[sames[i]]._data_refreshXForScope(scopes[keys.indexOf(sames[i])])
        }

        templateEl._data_prevKeys = keys
    })
}

function parseForExpression(expression: string) {
    let forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
    let stripParensRE = /^\s*\(|\)\s*$/g
    let forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
    let inMatch = expression.match(forAliasRE)

    if (! inMatch) return

    let res: any = {}
    res.items = inMatch[2].trim()
    let item = inMatch[1].replace(stripParensRE, '').trim()
    let iteratorMatch = item.match(forIteratorRE)

    if (iteratorMatch) {
        res.item = item.replace(forIteratorRE, '').trim()
        res.index = iteratorMatch[1].trim()

        if (iteratorMatch[2]) {
            res.collection = iteratorMatch[2].trim()
        }
    } else {
        res.item = item
    }

    return res
}

function getIterationScopeVariables(iteratorNames: any, item: any, index: any, items: any) {
    let scopeVariables: any = {}

    if (/^\[.*\]$/.test(iteratorNames.item) && Array.isArray(item)) {
        let names = iteratorNames.item.replace('[', '').replace(']', '').split(',').map((i: any) => i.trim())

        names.forEach((name: any, i: number) => {
            scopeVariables[name] = item[i]
        })
    } else if (/^\{.*\}$/.test(iteratorNames.item) && ! Array.isArray(item) && typeof item === 'object') {
        let names = iteratorNames.item.replace('{', '').replace('}', '').split(',').map((i: any) => i.trim())

        names.forEach((name: any) => {
            scopeVariables[name] = item[name]
        })
    } else {
        scopeVariables[iteratorNames.item] = item
    }

    if (iteratorNames.index) scopeVariables[iteratorNames.index] = index

    if (iteratorNames.collection) scopeVariables[iteratorNames.collection] = items

    return scopeVariables
}

function isNumeric(subject: any){
    return ! Array.isArray(subject) && ! isNaN(subject)
}
