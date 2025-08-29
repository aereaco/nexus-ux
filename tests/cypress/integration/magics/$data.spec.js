import { haveText, html, test } from '../../utils'

test('$data returns the current scope (with cascading)',
    html`
        <div data-signal="{ foo: 'bar'}">
            <div data-signal="{ bob: 'lob' }">
                <span data-text="$data.foo + ' ' + $data.bob"></span>
            </div>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar lob'))
    }
)
