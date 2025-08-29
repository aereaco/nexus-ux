import { haveText, html, test } from '../utils'

test('can set a custom data- prefix',
    html`
        <script>
            document.addEventListener('alpine:init', () => {
                Alpine.prefix('data-signal-')
            })
        </script>

        <div data-signal-data="{ foo: 'bar' }">
            <span data-signal-text="foo"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveText('bar'))
)
