import { beHidden, beVisible, haveAttribute, haveClasses, haveText, html, notBeVisible, notExist, test } from '../../../utils'

test('has accessibility attributes',
    [html`
        <div data-signal="{ checked: false }">
            <article data-switch:group>
                <label data-switch:label>Enable notifications</label>
                <span description data-switch:description>A description of the switch.</span>

                <button data-switch data-model="checked">Enable Notifications</button>
            </article>
        </div>
    `],
    ({ get }) => {
        get('label').should(haveAttribute('id', 'alpine-switch-label-1'))
        get('[description]').should(haveAttribute('id', 'alpine-switch-description-1'))
        get('button').should(haveAttribute('type', 'button'))
        get('button').should(haveAttribute('aria-labelledby', 'alpine-switch-label-1'))
        get('button').should(haveAttribute('aria-describedby', 'alpine-switch-description-1'))
        get('button').should(haveAttribute('role', 'switch'))
        get('button').should(haveAttribute('tabindex', 0))
        get('button').should(haveAttribute('aria-checked', 'false'))
        get('button').click()
        get('button').should(haveAttribute('aria-checked', 'true'))
    },
)

test('works with data-model',
    [html`
        <div data-signal="{ checked: false }">
            <button data-switch data-model="checked">Enable notifications</button>

            <article data-show="checked">
                Notifications are enabled.
            </article>
        </div>
    `],
    ({ get }) => {
        get('article').should(notBeVisible())
        get('button').click()
        get('article').should(beVisible())
        get('button').click()
        get('article').should(notBeVisible())
    },
)

test('works with internal state/$switch.isChecked',
    [html`
        <div data-signal>
            <button data-switch data-bind:class="$switch.isChecked ? 'foo' : 'bar'">
                Enable notifications
            </button>
        </div>
    `],
    ({ get }) => {
        get('button').should(haveClasses(['bar']))
        get('button').click()
        get('button').should(haveClasses(['foo']))
        get('button').click()
        get('button').should(haveClasses(['bar']))
    },
)

test('pressing space toggles the switch',
    [html`
        <div data-signal="{ checked: false }">
            <div>
                <button data-switch data-model="checked">Enable notifications</button>

                <article data-show="checked">
                    Notifications are enabled.
                </article>
            </div>
        </div>
    `],
    ({ get }) => {
        get('article').should(notBeVisible())
        get('button').focus()
        get('button').type(' ')
        get('article').should(beVisible())
        get('button').type(' ')
        get('article').should(notBeVisible())
    },
)

test('default-checked',
    [html`
        <div data-signal>
            <div>
                <button
                    data-switch
                    default-checked
                    :class="$switch.isChecked ? 'checked' : 'not-checked'"
                >Enable notifications</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('button').should(haveClasses(['checked']))
        get('button').click()
        get('button').should(haveClasses(['not-checked']))
    },
)

test('name and value props',
    [html`
        <div data-signal>
            <div>
                <button
                    data-switch
                    name="notifications"
                    value="yes"
                >Enable notifications</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('input').should(notExist())
        get('button').click()
        get('input').should(beHidden())
            .should(haveAttribute('name', 'notifications'))
            .should(haveAttribute('value', 'yes'))
            .should(haveAttribute('type', 'hidden'))
        get('button').click()
        get('input').should(notExist())
    },
)


test('value defaults to "on"',
    [html`
        <div data-signal>
            <div>
                <button
                    data-switch
                    name="notifications"
                >Enable notifications</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('input').should(notExist())
        get('button').click()
        get('input').should(beHidden())
            .should(haveAttribute('name', 'notifications'))
            .should(haveAttribute('value', 'on'))
            .should(haveAttribute('type', 'hidden'))
        get('button').click()
        get('input').should(notExist())
    },
)
