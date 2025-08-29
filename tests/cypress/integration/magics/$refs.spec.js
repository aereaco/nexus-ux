import { haveText, html, test } from '../../utils'

test('can reference elements from event listeners',
    html`
        <div data-signal="{}">
            <button data-on:click="$refs['bob'].textContent = 'lob'"></button>

            <span data-ref="bob"></span>
        </div>
    `,
    ({ get }) => {
        get('button').click()
        get('span').should(haveText('lob'))
    }
)

test('can reference elements from data object methods',
    html`
        <div data-signal="{ foo() { this.$refs.bob.textContent = 'lob' } }">
            <button data-on:click="foo()"></button>

            <span data-ref="bob"></span>
        </div>
    `,
    ({ get }) => {
        get('button').click()
        get('span').should(haveText('lob'))
    }
)

test('can reference elements from data-init',
    html`
        <div data-signal data-init="$refs.foo.textContent = 'lob'">
            <span data-ref="foo">bob</span>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('lob'))
    }
)

test('can reference elements outside of data-init',
    html`
        <div data-signal data-ref="foo" data-foo="bar">
            <div data-init="() => {}">
                <span data-text="$refs.foo.dataset.foo"></span>
            </div>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar'))
    }
)

test('can reference refs of parent scope',
    html`
        <div data-signal data-ref="foo" data-foo="bar">
            <div data-signal>
                <span data-text="$refs.foo.dataset.foo"></span>
            </div>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar'))
    }
)

test('when referencing refs from parent scope, the closest ref is used',
    html`
        <div data-signal data-ref="foo" data-foo="bar">
            <div data-signal data-ref="foo" data-foo="baz">
                <span data-text="$refs.foo.dataset.foo"></span>
            </div>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('baz'))
    }
)
