import { haveText, html, test } from '../../utils'

test('$nextTick runs code on the next available managed tick',
    html`
        <div data-signal="{foo: 'bar'}">
            <span data-text="foo" data-ref="span"></span>

            <button data-on:click="foo = 'baz'; $nextTick(() => {$refs.span.textContent = 'bob'})">click</button>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar'))
        get('button').click()
        get('span').should(haveText('bob'))
    }
)

test('$nextTick waits for data-for to finish rendering',
    html`
        <div data-signal="{list: ['one', 'two'], check: 2}">
            <template data-for="item in list">
                <span data-text="item"></span>
            </template>

            <p data-text="check"></p>

            <button data-on:click="list = ['one', 'two', 'three']; $nextTick(() => {check = document.querySelectorAll('span').length})">click</button>
        </div>
    `,
    ({ get }) => {
        get('p').should(haveText('2'))
        get('button').click()
        get('p').should(haveText('3'))
    }
)

test('$nextTick works with transition',
    html`
        <div data-signal="{ show: false, loggedDisplayStyle: null }" data-init="$nextTick(() => { loggedDisplayStyle = document.querySelector('h1').style.display })">
            <h1 data-show="show" data-transition:enter="animation-enter"></h1>

            <h2 data-text="loggedDisplayStyle"></h2>

            <button @click="show = true; $nextTick(() => { loggedDisplayStyle = document.querySelector('h1').style.display })">click</button>
        </div>
    `,
    ({ get }) => {
        get('h2').should(haveText('none'))
        get('button').click()
        get('h2').should(haveText(''))
    }
)
