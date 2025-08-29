import { haveText, notHaveText, html, test } from '../../utils'

test('sets html on init',
    html`
        <div data-data="{ foo: '<h1>hey</h1>' }">
            <span data-html="foo"></span>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText('hey'))
    }
)

test('sets html on update',
    html`
        <div data-data="{ foo: '' }">
            <button data-on:click="foo = '<h1>hey</h1>'">Show "bar"</button>

            <span data-html="foo"></span>
        </div>
    `,
    ({ get }) => {
        get('span').should(notHaveText('hey'))
        get('button').click()
        get('h1').should(haveText('hey'))
    }
)

test('data-html allows alpine code within',
    html`
        <div data-data="{ foo: '<h1  data-text=&quot;bar&quot;></h1>', bar: 'baz' }" data-html="foo"></div>
    `,
    ({ get }) => {
        get('h1').should(haveText('baz'))
    }
)

test('data-html runs even after data-if or data-for',
    html`
        <div data-data="{ html: '<span data-text=&quot;foo&quot;></span>', foo: 'bar' }">
            <template data-if="true">
                <h1>yoyoyo</h1>
            </template>

            <div data-html="html"></div>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar'))
    }
)
