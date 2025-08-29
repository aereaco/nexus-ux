import { haveText, html, test } from '../../utils'

test('sets text on init',
    html`
        <div data-signal="{ foo: 'bar' }" data-init="foo = 'baz'">
            <span data-text="foo"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveText('baz'))
)

test('data-init can be used outside of data-signal',
    html`
        <div data-init="$el.textContent = 'foo'"></div>
    `,
    ({ get }) => get('div').should(haveText('foo'))
)

test('changes made in data-init happen before the rest of the component',
    html`
        <div data-signal="{ foo: 'bar' }" data-init="$refs.foo.innerText = 'yo'">
            <span data-text="foo" data-ref="foo">baz</span>
        </div>
    `,
    ({ get }) => get('span').should(haveText('bar'))
)

test('can make deferred changes with $nextTick',
    html`
        <div data-signal="{ foo: 'bar' }" data-init="$nextTick(() => $refs.foo.innerText = 'yo')">
            <span data-text="foo" data-ref="foo">baz</span>
        </div>
    `,
    ({ get }) => get('span').should(haveText('yo'))
)

test('data-init will not evaluate expression if it is empty',
    html`
        <div data-signal="{ foo: 'bar' }" data-init=" ">
            <span data-text="foo" data-ref="foo">baz</span>
        </div>
    `,
    ({ get }) => get('span').should(haveText('bar'))
)

test('component nested into data-init without data-signal are not initialised twice',
    html`
        <div data-init="$el.setAttribute('attribute', 'value')">
            <p data-signal="{foo: 'foo'}" data-init="$el.textContent += foo"></p>
        </div>
    `,
    ({ get }) => get('p').should(haveText('foo'))
)
