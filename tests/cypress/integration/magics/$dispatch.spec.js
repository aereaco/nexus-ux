import { haveText, html, test } from '../../utils'

test('$dispatch dispatches events properly',
    html`
        <div data-signal="{ foo: 'bar' }" data-on:custom-event="foo = $event.detail.newValue">
            <span data-text="foo"></span>

            <button data-on:click="$dispatch('custom-event', {newValue: 'baz'})">click me</button>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar'))
        get('button').click()
        get('span').should(haveText('baz'))
    }
)
