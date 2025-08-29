import { haveAttribute, haveComputedStyle, html, notHaveAttribute, test } from '../../utils'

test('can collapse and expand element',
    [html`
        <div data-data="{ expanded: false }">
            <button @click="expanded = ! expanded">toggle</button>
            <h1 data-show="expanded" data-collapse>contents <a href="#">focusable content</a></h1>
        </div>
    `],
    ({ get }, reload) => {
        get('h1').should(haveComputedStyle('height', '0px'))
        get('h1').should(haveAttribute('style', 'display: none; height: 0px; overflow: hidden;'))
        get('h1').should(haveAttribute('hidden', 'hidden'))
        get('button').click()
        get('h1').should(haveAttribute('style', 'height: auto;'))
        get('h1').should(notHaveAttribute('hidden'))
        get('button').click()
        get('h1').should(haveComputedStyle('height', '0px'))
        get('h1').should(haveAttribute('style', 'height: 0px; overflow: hidden; display: none;'))
        get('h1').should(haveAttribute('hidden', 'hidden'))
    },
)

test('can collapse and expand with a minimum height instead of "display: none"',
    [html`
        <div data-data="{ expanded: false }">
            <button @click="expanded = ! expanded">toggle</button>
            <h1 data-show="expanded" data-collapse.min.25px>contents <a href="#">focusable content</a></h1>
        </div>
    `],
    ({ get }) => {
        get('h1').should(haveComputedStyle('height', '25px'))
        get('h1').should(haveAttribute('style', 'height: 25px; overflow: hidden;'))
        get('h1').should(notHaveAttribute('hidden', 'hidden'))
        get('button').click()
        get('h1').should(haveAttribute('style', 'height: auto;'))
        get('button').click()
        get('h1').should(haveComputedStyle('height', '25px'))
        get('h1').should(haveAttribute('style', 'height: 25px; overflow: hidden;'))
    },
)

test('@click.away with data-collapse (prevent race condition)',
    html`
        <div data-data="{ show: false }">
            <button @click="show = true">Show</button>

            <h1 data-show="show" @click.away="show = false" data-collapse>h1</h1>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveComputedStyle('height', '0px'))
        get('button').click()
        get('h1').should(haveAttribute('style', 'height: auto;'))
    }
)

test('@click.away with data-collapse and borders (prevent race condition)',
    html`
        <div data-data="{ show: false }">
            <button @click="show = true">Show</button>

            <h1 style="border: 1x solid" data-show="show" @click.away="show = false" data-collapse>h1</h1>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveComputedStyle('height', '0px'))
        get('button').click()
        get('h1').should(haveAttribute('style', 'height: auto;'))
    }
)

// https://github.com/alpinejs/alpine/issues/2335
test('double-click on data-collapse does not mix styles up',
    [html`
        <div data-data="{ expanded: false }">
            <button @click="expanded = ! expanded">toggle</button>
            <h1 data-show="expanded" data-collapse>contents</h1>
        </div>
    `],
    ({ get }, reload) => {
        get('h1').should(haveComputedStyle('height', '0px'))
        get('h1').should(haveAttribute('style', 'display: none; height: 0px; overflow: hidden;'))
        get('button').click()
        get('button').click()
        get('h1').should(haveAttribute('style', 'height: 0px; overflow: hidden; display: none;'))
        get('button').click()
        get('h1').should(haveAttribute('style', 'height: auto;'))
        get('button').click()
        get('button').click()
        get('h1').should(haveAttribute('style', 'height: auto;'))
    },
)
