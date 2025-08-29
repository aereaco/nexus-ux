import { haveText, html, test } from '../../utils'

test('data-signal attribute value is optional',
    html`
        <div data-signal>
            <span data-text="'foo'"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveText('foo'))
)

test('data-signal can be nested',
    html`
        <div data-signal="{ foo: 'bar', bar: 'baz' }">
            <div data-signal="{ bar: 'bob' }">
                <h1 data-text="foo"></h1>
                <h2 data-text="bar"></h2>
                <button id="inner" @click="foo = 'bob'; bar = 'lob'">click</button>
            </div>

            <h3 data-text="foo"></h3>
            <h4 data-text="bar"></h4>
            <button id="outer" @click="foo = 'law'; bar = 'blog'">click</button>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText('bar'))
        get('h2').should(haveText('bob'))
        get('h3').should(haveText('bar'))
        get('h4').should(haveText('baz'))

        get('button#inner').click()
        get('h1').should(haveText('bob'))
        get('h2').should(haveText('lob'))
        get('h3').should(haveText('bob'))
        get('h4').should(haveText('baz'))

        get('button#outer').click()
        get('h1').should(haveText('law'))
        get('h2').should(haveText('lob'))
        get('h3').should(haveText('law'))
        get('h4').should(haveText('blog'))
    }
)

test('data-signal can use attributes from a reusable function',
    html`
        <script>
            window.test = () => {
                return {
                    foo: 'bar'
                }
            }
        </script>
        <div data-signal="test()">
            <span data-text="foo"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveText('bar'))
)

test('data-signal can use $el',
    html`
        <div data-signal="{ text: $el.dataset.text }" data-text="test">
            <span data-text="text"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveText('test'))
)

test('functions in data-signal are reactive',
    html`
        <div data-signal="{ foo: 'bar', getFoo() {return this.foo}}">
            <span data-text="getFoo()"></span>
            <button data-on:click="foo = 'baz'">click me</button>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar'))
        get('button').click()
        get('span').should(haveText('baz'))
    }
)

test('functions in data-signal have access to proper this context',
    html`
        <div data-signal="{ foo: undefined, change() { this.foo = 'baz' }}" data-init="foo = 'bar'">
            <button @click="change()">change</button>
            <span data-text="foo"></span>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar'))
        get('button').click()
        get('span').should(haveText('baz'))
    }
)

test('data-signal works on the html tag',
    [html`
        <div>
            <span data-text="'foo'"></span>
        </div>
    `,
    `
        document.querySelector('html').setAttribute('data-signal', '')
    `],
    ({ get }) => {
        get('span').should(haveText('foo'))
    }
)

test('data-signal getters have access to parent scope',
    html`
    <div data-signal="{ foo: 'bar' }">
        <div data-signal="{
            get bob() {
                return this.foo
            }
        }">
            <h1 data-text="bob"></h1>
        </div>
    </div>
    `,
    ({ get }) => get('h1').should(haveText('bar'))
)
