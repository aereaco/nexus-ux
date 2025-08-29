import { haveText, html, test } from '../../utils'

/**
 * Skipping all these tests because they are flaky in CI.
 * They should all pass locally though...
 */

test.skip('basic drag sorting works',
    [html`
        <div data-data>
            <ul data-sort>
                <li id="1">foo</li>
                <li id="2">bar</li>
                <li id="3">baz</li>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('ul li').eq(0).should(haveText('foo'))
        get('ul li').eq(1).should(haveText('bar'))
        get('ul li').eq(2).should(haveText('baz'))

        // Unfortunately, github actions doesn't like "async/await" here
        // so we need to use .then() throughout this entire test...
        get('#1').drag('#3').then(() => {
            get('ul li').eq(0).should(haveText('bar'))
            get('ul li').eq(1).should(haveText('baz'))
            get('ul li').eq(2).should(haveText('foo'))

            get('#3').drag('#1').then(() => {
                get('ul li').eq(0).should(haveText('bar'))
                get('ul li').eq(1).should(haveText('foo'))
                get('ul li').eq(2).should(haveText('baz'))
            })
        })
    },
)

test.skip('can use a custom handle',
    [html`
        <div data-data>
            <ul data-sort>
                <li id="1"><span data-sort:handle>handle</span> - foo</li>
                <li id="2"><span data-sort:handle>handle</span> - bar</li>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('ul li').eq(0).should(haveText('handle - foo'))
        get('ul li').eq(1).should(haveText('handle - bar'))

        get('#1 span').drag('#2').then(() => {
            get('ul li').eq(0).should(haveText('handle - bar'))
            get('ul li').eq(1).should(haveText('handle - foo'))
        })
    },
)

test.skip('can move items between groups',
    [html`
        <div data-data>
            <ul data-sort data-sort:group="one">
                <li id="1">foo</li>
                <li id="2">bar</li>
            </ul>

            <ol data-sort data-sort:group="one">
                <li id="3">oof</li>
                <li id="4">rab</li>
            </ol>
        </div>
    `],
    ({ get }) => {
        get('ul li').eq(0).should(haveText('foo'))
        get('ul li').eq(1).should(haveText('bar'))
        get('ol li').eq(0).should(haveText('oof'))
        get('ol li').eq(1).should(haveText('rab'))

        get('#1').drag('#4').then(() => {
            get('ul li').eq(0).should(haveText('bar'))
            get('ol li').eq(0).should(haveText('oof'))
            get('ol li').eq(1).should(haveText('foo'))
            get('ol li').eq(2).should(haveText('rab'))
        })
    },
)

test.skip('sort handle method',
    [html`
        <div data-data="{ handle(key, position) { $refs.outlet.textContent = key+'-'+position } }">
            <ul data-sort="handle">
                <li data-sort:key="1" id="1">foo</li>
                <li data-sort:key="2" id="2">bar</li>
                <li data-sort:key="3" id="3">baz</li>
            </ul>

            <h1 data-ref="outlet"></h1>
        </div>
    `],
    ({ get }) => {
        get('#1').drag('#3').then(() => {
            get('h1').should(haveText('1-2'))

            get('#3').drag('#1').then(() => {
                get('h1').should(haveText('3-2'))
            })
        })
    },
)

test.skip('item is also supported for the key in the sort handle method',
    [html`
        <div data-data="{ handle(item, position) { $refs.outlet.textContent = item+'-'+position } }">
            <ul data-sort="handle">
                <li data-sort:item="1" id="1">foo</li>
                <li data-sort:item="2" id="2">bar</li>
                <li data-sort:item="3" id="3">baz</li>
            </ul>

            <h1 data-ref="outlet"></h1>
        </div>
    `],
    ({ get }) => {
        get('#1').drag('#3').then(() => {
            get('h1').should(haveText('1-2'))

            get('#3').drag('#1').then(() => {
                get('h1').should(haveText('3-2'))
            })
        })
    },
)

test.skip('can access key and position in handler',
    [html`
        <div data-data="{ handle(key, position) { $refs.outlet.textContent = key+'-'+position } }">
            <ul data-sort="handle($position, $key)">
                <li data-sort:key="1" id="1">foo</li>
                <li data-sort:key="2" id="2">bar</li>
                <li data-sort:key="3" id="3">baz</li>
            </ul>

            <h1 data-ref="outlet"></h1>
        </div>
    `],
    ({ get }) => {
        get('#1').drag('#3').then(() => {
            get('h1').should(haveText('2-1'))

            get('#3').drag('#1').then(() => {
                get('h1').should(haveText('2-3'))
            })
        })
    },
)

test.skip('can access $item instead of $key',
    [html`
        <div data-data="{ handle(key, position) { $refs.outlet.textContent = key+'-'+position } }">
            <ul data-sort="handle($position, $item)">
                <li data-sort:key="1" id="1">foo</li>
                <li data-sort:key="2" id="2">bar</li>
                <li data-sort:key="3" id="3">baz</li>
            </ul>

            <h1 data-ref="outlet"></h1>
        </div>
    `],
    ({ get }) => {
        get('#1').drag('#3').then(() => {
            get('h1').should(haveText('2-1'))

            get('#3').drag('#1').then(() => {
                get('h1').should(haveText('2-3'))
            })
        })
    },
)

test.skip('can use custom sortablejs configuration',
    [html`
        <div data-data>
            <ul data-sort data-sort:config="{ filter: '[data-ignore]' }">
                <li id="1" data-ignore>foo</li>
                <li id="2">bar</li>
                <li id="3">baz</li>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('ul li').eq(0).should(haveText('foo'))
        get('ul li').eq(1).should(haveText('bar'))
        get('ul li').eq(2).should(haveText('baz'))

        get('#1').drag('#3').then(() => {
            get('ul li').eq(0).should(haveText('foo'))
            get('ul li').eq(1).should(haveText('bar'))
            get('ul li').eq(2).should(haveText('baz'))

            get('#3').drag('#1').then(() => {
                get('ul li').eq(0).should(haveText('baz'))
                get('ul li').eq(1).should(haveText('foo'))
                get('ul li').eq(2).should(haveText('bar'))
            })
        })
    },
)

test.skip('works with Livewire morphing',
    [html`
        <div data-data>
            <ul data-sort>
                <!-- [if BLOCK]><![endif] -->
                <li id="1">foo</li>
                <li id="2">bar</li>
                <li id="3">baz</li>
                <!-- [if ENDBLOCK]><![endif] -->
            </ul>
        </div>
    `],
    ({ get }) => {
        get('#1').drag('#3').then(() => {
            // This is the easiest way I can think of to assert the order of HTML comments doesn't change...
            get('ul').should('have.html', `\n                <!-- [if BLOCK]><![endif] -->\n                \n                <li id="2" style="">bar</li>\n                <li id="3" style="">baz</li>\n                \n            <li id="1" draggable="false" class="" style="opacity: 1;">foo</li><!-- [if ENDBLOCK]><![endif] -->`)
        })
    },
)

test.skip('data-sort:item can be used as a filter',
    [html`
        <div data-data>
            <ul data-sort>
                <li data-sort:item id="1">foo</li>
                <li id="2">bar</li>
                <li data-sort:item id="3">baz</li>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('ul li').eq(0).should(haveText('foo'))
        get('ul li').eq(1).should(haveText('bar'))
        get('ul li').eq(2).should(haveText('baz'))

        // Unfortunately, github actions doesn't like "async/await" here
        // so we need to use .then() throughout this entire test...
        get('#1').drag('#3').then(() => {
            get('ul li').eq(0).should(haveText('bar'))
            get('ul li').eq(1).should(haveText('baz'))
            get('ul li').eq(2).should(haveText('foo'))

            get('#2').drag('#1').then(() => {
                get('ul li').eq(0).should(haveText('bar'))
                get('ul li').eq(1).should(haveText('baz'))
                get('ul li').eq(2).should(haveText('foo'))
            })
        })
    },
)
