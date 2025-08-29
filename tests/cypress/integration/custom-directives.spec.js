import { haveText, haveAttribute, html, test } from '../utils'

test('can register custom directive',
    [html`
        <div data-data>
            <span data-foo:bar.baz="bob"></span>
        </div>
    `,
    `
        Alpine.directive('foo', (el, { value, modifiers, expression }) => {
            el.textContent = value+modifiers+expression
        })
    `],
    ({ get }) => get('span').should(haveText('barbazbob'))
)

test('directives are auto cleaned up',
    [html`
        <div data-data="{ count: 0 }">
            <span data-foo data-ref="foo"></span>
            <h1 data-text="count"></h1>

            <button @click="count++" id="change">change</button>
            <button @click="$refs.foo.remove()" id="remove">remove</button>
        </div>
    `,
    `
        Alpine.directive('foo', (el, {}, { effect, cleanup, evaluateLater }) => {
            let incCount = evaluateLater('count++')

            cleanup(() => {
                incCount()
                incCount()
            })

            effect(() => {
                incCount()
            })
        })
    `],
    ({ get }) => {
        get('h1').should(haveText('1'))
        get('#change').click()
        get('h1').should(haveText('3'))
        get('#remove').click()
        get('#change').click()
        get('h1').should(haveText('6'))
        get('#change').click()
        get('h1').should(haveText('7'))
    }
)

test('can register a custom directive before an existing one',
    [html`
        <div data-data>
            <span data-foo data-bind:foo="foo"></span>
        </div>
    `,
    `
        Alpine.directive('foo', (el, { value, modifiers, expression }) => {
            Alpine.addScopeToNode(el, {foo: 'bar'})
        }).before('bind')
    `],
    ({ get }) => get('span').should(haveAttribute('foo', 'bar'))
)
