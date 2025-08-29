import { haveText, html, test } from '../../utils'

test('can expose data for data-model binding',
    html`
        <div data-data="{ outer: 'foo' }">
            <div data-data="{ inner: 'bar' }" data-modelable="inner" data-model="outer">
                <h1 data-text="outer"></h1>
                <h2 data-text="inner"></h2>

                <button @click="inner = 'bob'" id="1">change inner</button>
                <button @click="outer = 'lob'" id="2">change outer</button>
            </div>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText('foo'))
        get('h2').should(haveText('foo'))
        get('#1').click()
        get('h1').should(haveText('bob'))
        get('h2').should(haveText('bob'))
        get('#2').click()
        get('h1').should(haveText('lob'))
        get('h2').should(haveText('lob'))
    }
)

test('data-modelable works when inside data-bind and data-model is outside',
    html`
        <div data-data="{ outer: 'foo', thing: {
            ['data-modelable']: 'inner',
        } }">
            <div data-data="{ inner: 'bar' }" data-bind="thing" data-model="outer">
                <h1 data-text="outer"></h1>
                <h2 data-text="inner"></h2>

                <button @click="inner = 'bob'" id="1">change inner</button>
                <button @click="outer = 'lob'" id="2">change outer</button>
            </div>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText('foo'))
        get('h2').should(haveText('foo'))
        get('#1').click()
        get('h1').should(haveText('bob'))
        get('h2').should(haveText('bob'))
        get('#2').click()
        get('h1').should(haveText('lob'))
        get('h2').should(haveText('lob'))
    }
)

test('data-modelable removes the event listener used by corresponding data-model',
    html`
        <div data-data="{ outer: 'foo' }">
            <div data-data="{ inner: 'bar' }" data-modelable="inner" data-model="outer">
                <h1 data-text="outer"></h1>
                <h2 data-text="inner"></h2>
                <button id="1" @click="$dispatch('input', 'baz')"></button>
            </div>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText('foo'))
        get('h2').should(haveText('foo'))
        get('#1').click()
        get('h1').should(haveText('foo'))
        get('h2').should(haveText('foo'))
    }
)
