import { haveText, html, test } from '../utils'

test('can register custom sprite properties',
    html`
        <script>
            document.addEventListener('alpine:init', () => {
                Alpine.sprite('foo', (el) => {
                    return { bar: 'baz' }
                })
            })
        </script>

        <div data-signal>
            <span data-text="$foo.bar"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveText('baz'))
)

test('sprites are lazily accessed',
    html`
        <script>
            window.hasBeenAccessed = false

            document.addEventListener('alpine:init', () => {
                Alpine.sprite('foo', (el) => {
                    window.hasBeenAccessed = true
                })
            })
        </script>

        <div data-signal>
            <button @click="$el.textContent = window.hasBeenAccessed">clickme</button>
        </div>
    `,
    ({ get }) => {
        get('button').click()
        get('button').should(haveText('false'))
    }
)
