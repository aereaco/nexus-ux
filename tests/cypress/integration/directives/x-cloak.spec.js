import { html, notHaveAttribute, test } from '../../utils'

test('data-cloak is removed',
    html`
        <div data-signal="{ hidden: true }">
            <span data-cloak></span>
        </div>
    `,
    ({ get }) => get('span').should(notHaveAttribute('data-cloak'))
)
