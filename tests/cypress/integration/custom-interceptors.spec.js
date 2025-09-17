import { haveText, html, test } from '../utils'

test('can register custom interceptors',
    [html`
        <div data-signal="{ foo: $sprite() }">
            <span data-text="foo"></span>
        </div>
    `,
    `
        Alpine.sprite('sprite', () => {
            return Alpine.interceptor((initialValue, getter, setter, path, key) => {
                return key+path
            })
        })
    `],
    ({ get }) => get('span').should(haveText('foofoo'))
)

test('interceptors are nesting aware',
    [html`
        <div data-signal="{ foo: { bar: { baz: $sprite() }}}">
            <span data-text="foo.bar.baz"></span>
        </div>
    `,
    `
        Alpine.sprite('sprite', () => {
            return Alpine.interceptor((initialValue, getter, setter, path, key) => {
                return key+path
            })
        })
    `],
    ({ get }) => get('span').should(haveText('bazfoo.bar.baz'))
)

test('interceptor system prevents against circular references',
    [html`
        <div data-signal="{ foo: $foo }">
            <span data-text="'...'">
        </div>
    `,
    `
        Alpine.sprite('foo', () => {
            return {
                get anyGivenProperty() {
                    return this
                }
            }
        })
    `],
    ({ get }) => get('span').should(haveText('...'))
)
