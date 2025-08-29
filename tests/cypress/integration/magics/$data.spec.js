import { haveText, html, test } from '../../utils'

test('$data returns the current scope (with cascading)',
    html`
        <div data-data="{ foo: 'bar'}">
            <div data-data="{ bob: 'lob' }">
                <span data-text="$data.foo + ' ' + $data.bob"></span>
            </div>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar lob'))
    }
)
