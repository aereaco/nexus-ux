import { haveText, html, notHaveText, test } from '../../utils'

test('sets text on init',
    html`
        <div data-signal="{ foo: 'bar' }">
            <span data-text="foo"></span>
        </div>
    `,
    ({ get }) => { get('span').should(haveText('bar')) }
)

test('sets text on update',
    html`
        <div data-signal="{ foo: '' }">
            <button data-on:click="foo = 'bar'">Show "bar"</button>

            <span data-text="foo"></span>
        </div>
    `,
    ({ get }) => {
        get('span').should(notHaveText('bar'))
        get('button').click()
        get('span').should(haveText('bar'))
    }
)

test('sets text on SVG elements',
    html`
        <div data-signal="{ foo: 'bar' }">
            <svg viewBox="0 0 240 80">
                <text x="30" y="50" data-text="foo"></text>
            </svg>
        </div>
    `,
    ({ get }) => get('svg text').should(haveText('bar'))
)
