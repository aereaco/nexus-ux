import Sortable from 'sortablejs'

export default function (State: any) {
    State.directive('sort', (el: any, { value, modifiers, expression }: any, { effect, evaluate, evaluateLater, cleanup }: any) => {
        if (value === 'config') {
            return // This will get handled by the main directive...
        }

        if (value === 'handle') {
            return // This will get handled by the main directive...
        }

        if (value === 'group') {
            return // This will get handled by the main directive...
        }

        // Supporting both `data-sort:item` AND `data-sort:key` (key for BC)...
        if (value === 'key' || value === 'item') {
            if ([undefined, null, ''].includes(expression)) return

            el._data_sort_key = evaluate(expression)

            return
        }

        let preferences = {
            hideGhost: ! modifiers.includes('ghost'),
            useHandles: !! el.querySelector('[data-sort\\:handle]'),
            group: getGroupName(el, modifiers),
        }

        let handleSort = generateSortHandler(expression, evaluateLater)

        let config = getConfigurationOverrides(el, modifiers, evaluate)

        let sortable = initSortable(el, config, preferences, (key: any, position: any) => {
            handleSort(key, position)
        })

        cleanup(() => sortable.destroy())
    })
}

function generateSortHandler(expression: any, evaluateLater: any) {
    // No handler was passed to data-sort...
    if ([undefined, null, ''].includes(expression)) return () => {}

    let handle = evaluateLater(expression)

    return (key: any, position: any) => {
        // In the case of `data-sort="handleSort"`, let us call it manually...
    const StateLocal = (window as any).State

    StateLocal && StateLocal.dontAutoEvaluateFunctions(() => {
            handle(
                // If a function is returned, call it with the key/position params...
                (received: any) => {
                    if (typeof received === 'function') received(key, position)
                },
                // Provide $key and $position to the scope in case they want to call their own function...
                { scope: {
                    // Supporting both `$item` AND `$key` ($key for BC)...
                    $key: key,
                    $item: key,
                    $position: position,
                } },
            )
    })
    }
}

function getConfigurationOverrides(el: any, modifiers: any, evaluate: any)
{
    return el.hasAttribute('data-sort:config')
        ? evaluate(el.getAttribute('data-sort:config'))
        : {}
}

function initSortable(el: any, config: any, preferences: any, handle: any) {
    let ghostRef: any

    let options: any = {
        animation: 150,

        handle: preferences.useHandles ? '[data-sort\\:handle]' : null,

        group: preferences.group,

        filter(e: any) {
            // Normally, we would just filter out any elements without `[data-sort\\:item]`
            // on them, however for backwards compatibility (when we didn't require
            // `[data-sort:item]`) we will check for data-sort\\:item being used at all
            if (! el.querySelector('[data-sort\\:item]')) return false

            let itemHasAttribute = e.target.closest('[data-sort\\:item]')

            return itemHasAttribute ? false : true
        },

        onSort(e: any) {
            // If item has been dragged between groups...
            if (e.from !== e.to) {
                // And this is the group it was dragged FROM...
                if (e.to !== e.target) {
                    return // Don't do anything, because the other group will call the handler...
                }
            }

            let key = e.item._data_sort_key
            let position = e.newIndex

            if (key !== undefined || key !== null) {
                handle(key, position)
            }
        },

        onStart() {
            document.body.classList.add('sorting')

            ghostRef = document.querySelector('.sortable-ghost')

            if (preferences.hideGhost && ghostRef) ghostRef.style.opacity = '0'
        },

        onEnd() {
            document.body.classList.remove('sorting')

            if (preferences.hideGhost && ghostRef) ghostRef.style.opacity = '1'

            ghostRef = undefined

            keepElementsWithinMorphMarkers(el)
        }
    }

    return new Sortable(el, { ...options, ...config })
}

function keepElementsWithinMorphMarkers(el: any) {
    let cursor: any = el.firstChild

    while (cursor.nextSibling) {
        if (cursor.textContent.trim() === '[if ENDBLOCK]><![endif]') {
            el.append(cursor)
            break
        }

        cursor = cursor.nextSibling
    }
}

function getGroupName(el: any, modifiers: any)
{
    if (el.hasAttribute('data-sort:group')) {
        return el.getAttribute('data-sort:group')
    }

    return modifiers.indexOf('group') !== -1 ? modifiers[modifiers.indexOf('group') + 1] : null
}
