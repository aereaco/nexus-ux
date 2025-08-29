import { beHidden, beVisible, haveAttribute, html, test } from '../../utils'

test('data-show toggles display: none; with no other style attributes',
    html`
        <div data-signal="{ show: true }">
            <span data-show="show">thing</span>

            <button data-on:click="show = false"></button>
        </div>
    `,
    ({ get }) => {
        get('span').should(beVisible())
        get('button').click()
        get('span').should(beHidden())
    }
)

test('data-show (with true default) toggles display: none; even if it exists with the page load',
    html`
        <div data-signal="{ show: true }">
            <span data-show="show" style="display: none;">thing</span>

            <button data-on:click="show = false"></button>
        </div>
    `,
    ({ get }) => {
        get('span').should(beVisible())
        get('button').click()
        get('span').should(beHidden())
    }
)

test('data-show (with false default) toggles display: none; even if it exists with the page load',
    html`
        <div data-signal="{ show: false }">
            <span data-show="show" style="display: none;">thing</span>

            <button data-on:click="show = true"></button>
        </div>
    `,
    ({ get }) => {
        get('span').should(beHidden())
        get('button').click()
        get('span').should(beVisible())
    }
)

test('data-show toggles display: none; with other style attributes',
    html`
        <div data-signal="{ show: true }">
            <span data-show="show" style="color: blue;">thing</span>

            <button data-on:click="show = false"></button>
        </div>
    `,
    ({ get }) => {
        get('span').should(beVisible())
        get('span').should(haveAttribute('style', 'color: blue;'))
        get('button').click()
        get('span').should(beHidden())
        get('span').should(haveAttribute('style', 'color: blue; display: none;'))
    }
)

test('data-show waits for transitions within it to finish before hiding an elements',
    html`
        <style>
            .transition { transition-property: background-color, border-color, color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
            .duration-100 { transition-duration: 100ms; }
        </style>
        <div data-signal="{ show: true }">
            <span data-show="show">
                <h1 data-show="show" data-transition:leave="transition duration-100">thing</h1>
            </span>

            <button data-on:click="show = false"></button>
        </div>
    `,
    ({ get }) => {
        get('span').should(beVisible())
        get('button').click()
        get('span').should(beVisible())
        get('h1').should(beHidden())
        get('span').should(beHidden())
    }
)

test('data-show does NOT wait for transitions to finish if .immediate is present',
    html`
        <style>
            .transition { transition-property: background-color, border-color, color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
            .duration-100 { transition-duration: 100ms; }
        </style>
        <div data-signal="{ show: true }">
            <span data-show.immediate="show">
                <h1 data-show="show" data-transition:leave="transition duration-100">thing</h1>
            </span>

            <button data-on:click="show = false"></button>
        </div>
    `,
    ({ get }) => {
        get('span').should(beVisible())
        get('button').click()
        get('span').should(beHidden())
    }
)

test('data-show with data-bind:style inside data-for works correctly',
    html`
        <div data-signal="{items: [{ cleared: false }, { cleared: false }]}">
            <template data-for="(item, index) in items" :key="index">
                <button data-show="! item.cleared"
                    data-bind:style="'background: #999'"
                    @click="item.cleared = true"
                >
                </button>
            </template>
        </div>
    `,
    ({ get }) => {
        get('button:nth-of-type(1)').should(beVisible())
        get('button:nth-of-type(1)').should(haveAttribute('style', 'background: #999'))
        get('button:nth-of-type(2)').should(beVisible())
        get('button:nth-of-type(2)').should(haveAttribute('style', 'background: #999'))
        get('button:nth-of-type(1)').click()
        get('button:nth-of-type(1)').should(beHidden())
        get('button:nth-of-type(1)').should(haveAttribute('style', 'background: rgb(153, 153, 153); display: none;'))
        get('button:nth-of-type(2)').should(beVisible())
        get('button:nth-of-type(2)').should(haveAttribute('style', 'background: #999'))
    }
)

test('data-show takes precedence over style bindings for display property',
    html`
        <div data-signal="{ show: false }">
            <span data-show="show" :style="'color: red;'">thing</span>
            <span :style="'color: red;'" data-show="show">thing</span>
        </div>
    `,
    ({ get }) => {
        get('span:nth-of-type(1)').should(haveAttribute('style', 'color: red; display: none;'))
        get('span:nth-of-type(2)').should(haveAttribute('style', 'color: red; display: none;'))
    }
)

test('data-show executes consecutive state changes in correct order',
    html`
        <div
            data-signal="{ isEnabled: false }"
            data-init="$watch('isEnabled', () => { if (isEnabled) isEnabled = false })"
        >
            <button id="enable" data-show="!isEnabled" @click="isEnabled = true"></button>
            <button id="disable" data-show="isEnabled" @click="isEnabled = false"></button>
        </div>
    `,
    ({ get }) => {
        get('button#enable').should(beVisible())
        get('button#disable').should(beHidden())
    }
)

test('data-show toggles display: none; with the !important property when using the .important modifier while respecting other style attributes',
    html`
        <div data-signal="{ show: true }">
            <span data-show.important="show" style="color: blue;">thing</span>

            <button data-on:click="show = false"></button>
        </div>
    `,
    ({ get }) => {
        get('span').should(beVisible())
        get('span').should(haveAttribute('style', 'color: blue;'))
        get('button').click()
        get('span').should(beHidden())
        get('span').should(haveAttribute('style', 'color: blue; display: none !important;'))
    }
)
