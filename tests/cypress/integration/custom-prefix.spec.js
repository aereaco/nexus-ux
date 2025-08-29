import { haveText, html, test } from '../utils'

test('can set a custom data- prefix',
    html`
        <script>
            document.addEventListener('alpine:init', () => {
                Alpine.prefix('data-data-')
            })
        </script>

        <div data-data-data="{ foo: 'bar' }">
            <span data-data-text="foo"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveText('bar'))
)
