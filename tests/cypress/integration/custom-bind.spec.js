import { haveText, html, test } from '../utils'

test('can register custom bind object',
    html`
        <script>
            document.addEventListener('alpine:init', () => {
                Alpine.bind('Foo', {
                    'data-init'() { this.$el.innerText = 'bar' },
                })
            })
        </script>

        <div data-signal data-bind="Foo"></div>
    `,
    ({ get }) => get('div').should(haveText('bar'))
)

test('can register custom bind as function',
    html`
        <script>
            document.addEventListener('alpine:init', () => {
                Alpine.bind('Foo', () => ({
                    'data-init'() { this.$el.innerText = 'bar' },
                }))
            })
        </script>

        <div data-signal data-bind="Foo"></div>
    `,
    ({ get }) => get('div').should(haveText('bar'))
)

test('can consume custom bind as function',
    html`
        <script>
            document.addEventListener('alpine:init', () => {
                Alpine.bind('Foo', (subject) => ({
                    'data-init'() { this.$el.innerText = subject },
                }))
            })
        </script>

        <div data-signal data-bind="Foo('bar')"></div>
    `,
    ({ get }) => get('div').should(haveText('bar'))
)

test('can bind directives individually to an element',
    html`
        <script>
            document.addEventListener('alpine:init', () => {
                Alpine.bind(document.querySelector('#one'), () => ({
                    'data-text'() { return 'foo' },
                }))
            })
        </script>

        <div data-signal id="one"></div>
    `,
    ({ get }) => get('div').should(haveText('foo'))
)
