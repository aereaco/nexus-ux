import { haveText, html, test } from '../utils'

test('can clone a component',
    html`
        <script>
            document.addEventListener('alpine:initialized', () => {
                window.original = document.getElementById('original')
                window.copy = document.getElementById('copy')

                window.copy.removeAttribute('data-ignore')
                delete window.copy._data_ignore
            })
        </script>

        <button data-signal @click="Alpine.clone(original, copy)">click</button>

        <div data-signal="{ foo: 'bar' }" id="original">
            <h1 @click="foo = 'baz'">click me</h1>

            <span data-text="foo"></span>
        </div>

        <div data-signal="{ foo: 'bar' }" id="copy" data-ignore>
            <h1 @click="foo = 'baz'">click me</h1>

            <span data-text="foo"></span>
        </div>
    `,
    ({ get }) => {
        get('#original h1').click()
        get('#original span').should(haveText('baz'))
        get('#copy span').should(haveText(''))
        get('button').click()
        get('#copy span').should(haveText('baz'))
    }
)

test('wont run init on clone',
    html`
        <script>
            document.addEventListener('alpine:initialized', () => {
                window.original = document.getElementById('original')
                window.copy = document.getElementById('copy')

                window.copy.removeAttribute('data-ignore')
                delete window.copy._data_ignore
            })
        </script>

        <button data-signal @click="Alpine.clone(original, copy)">click</button>

        <div data-signal="{ count: 0 }" data-init="count++" id="original">
            <span data-text="count"></span>
        </div>

        <div data-signal="{ count: 0 }" data-init="count++" id="copy" data-ignore>
            <span data-text="count"></span>
        </div>
    `,
    ({ get }) => {
        get('#original span').should(haveText('1'))
        get('#copy span').should(haveText(''))
        get('button').click()
        get('#copy span').should(haveText('1'))
    }
)

test('wont register listeners on clone',
    html`
        <script>
            document.addEventListener('alpine:initialized', () => {
                window.original = document.getElementById('original')
                window.copy = document.getElementById('copy')

                window.copy.removeAttribute('data-ignore')
                delete window.copy._data_ignore
            })
        </script>

        <button data-signal @click="Alpine.clone(original, copy)">click</button>

        <div data-signal="{ count: 0 }" data-init="count++" id="original">
            <span data-text="count"></span>
        </div>

        <div data-signal="{ count: 0 }" data-init="count++" id="copy" data-ignore>
            <h1 @click="count++">inc</h1>
            <span data-text="count"></span>
        </div>
    `,
    ({ get }) => {
        get('#original span').should(haveText('1'))
        get('#copy span').should(haveText(''))
        get('button').click()
        get('#copy span').should(haveText('1'))
        get('#copy h1').click()
        get('#copy span').should(haveText('1'))
    }
)

test('wont register extra listeners on data-model on clone',
    html`
        <script>
            document.addEventListener('alpine:initialized', () => {
                window.original = document.getElementById('original')
                window.copy = document.getElementById('copy')
            })
        </script>

        <button data-signal @click="Alpine.clone(original, copy)">click</button>

        <div data-signal="{ checks: [] }" id="original">
            <input type="checkbox" data-model="checks" value="1">
            <span data-text="checks"></span>
        </div>

        <div data-signal="{ checks: [] }" id="copy">
            <input type="checkbox" data-model="checks" value="1">
            <span data-text="checks"></span>
        </div>
    `,
    ({ get }) => {
        get('#original span').should(haveText(''))
        get('#copy span').should(haveText(''))
        get('button').click()
        get('#copy span').should(haveText(''))
        get('#copy input').click()
        get('#copy span').should(haveText('1'))
    }
)
