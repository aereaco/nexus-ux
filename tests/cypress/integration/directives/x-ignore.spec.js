import { haveClasses, haveText, html, notHaveClasses, notHaveText, test } from '../../utils'

test('data-ignore',
    html`
        <div data-data="{ foo: 'bar' }">
            <div data-ignore>
                <span data-text="foo"></span>
            </div>
        </div>
    `,
    ({ get }) => {
        get('span').should(notHaveText('bar'))
    }
)

test('data-ignore.self',
    html`
        <div data-data="{ foo: 'bar' }">
            <h1 data-ignore.self :class="foo">
                <span data-text="foo"></span>
            </h1>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar'))
        get('h1').should(notHaveClasses(['bar']))
    }
)

test('can lazyload a component',
    html`
        <div data-data="{ lazyLoad() {$el.querySelector('#lazy').removeAttribute('data-ignore'); Alpine.nextTick(() => Alpine.initTree($el.querySelector('#lazy')))} }">
            <button @click="lazyLoad">Load</button>
            <div data-data="{ foo: 'bar' }" id="lazy" data-ignore :class="foo">
                <span data-text="foo"></span>
            </div>
        </div>
    `,
    ({ get }) => {
        get('span').should(notHaveText('bar'))
        get('div#lazy').should(notHaveClasses(['bar']))
        get('button').click()
        get('span').should(haveText('bar'))
        get('div#lazy').should(haveClasses(['bar']))
    }
)
