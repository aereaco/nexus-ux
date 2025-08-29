import { haveText, test, html } from '../../utils'

test('can intersect',
    [html`
    <div data-data="{ count: 0 }">
        <span data-text="count"></span>

        <div data-intersect="count++" style="margin-top: 100vh;" id="1">hi</div>
    </div>
    `],
    ({ get }) => {
        get('span').should(haveText('0'))
        get('#1').scrollIntoView({duration: 100})
        get('span').should(haveText('1'))
        get('span').scrollIntoView({duration: 100})
        get('span').should(haveText('1'))
        get('#1').scrollIntoView({duration: 100})
        get('span').should(haveText('2'))
    },
)

test('It should evaluate with ":enter" only when the component is intersected',
    [html`
    <div data-data="{ count: 0 }">
        <span data-text="count"></span>

        <div data-intersect:enter="count++" style="margin-top: 100vh;" id="1">hi</div>
    </div>
    `],
    ({ get }) => {
        get('span').should(haveText('0'))
        get('#1').scrollIntoView({duration: 100})
        get('span').should(haveText('1'))
        get('span').scrollIntoView({duration: 100})
        get('span').should(haveText('1'))
        get('#1').scrollIntoView({duration: 100})
        get('span').should(haveText('2'))
    },
)

test('It should evaluate with ":leave" only when the component is not intersected',
    [html`
    <div data-data="{ count: 0 }">
        <span data-text="count"></span>

        <div data-intersect:leave="count++" style="margin-top: 100vh;" id="1">hi</div>
    </div>
    `],
    ({ get }) => {
        get('span').should(haveText('1'))
        get('#1').scrollIntoView({duration: 100})
        get('span').should(haveText('1'))
        get('span').scrollIntoView({duration: 100})
        get('span').should(haveText('2'))
        get('#1').scrollIntoView({duration: 100})
        get('span').should(haveText('2'))
        get('span').scrollIntoView({duration: 100})
        get('span').should(haveText('3'))
    },
)

test('.half',
    [html`
    <div data-data="{ count: 0 }">
        <span data-text="count"></span>

        <div id="container" style="height: 400px; overflow-y: scroll;">
            <div style="height: 410px;">spacer</div>

            <div style="height: 400px" data-intersect.half="count++">
                <div style="text-align: center;">content</div>
            </div>
        </div>
    </div>
    `],
    ({ get }) => {
        get('span').should(haveText('0'))
        get('#container').scrollTo(0, 100, {duration: 100})
        get('span').should(haveText('0'))
        get('#container').scrollTo(0, 210, {duration: 100})
        get('span').should(haveText('1'))
    },
)

test('.full',
    [html`
    <div data-data="{ count: 0 }">
        <span data-text="count"></span>

        <div id="container" style="height: 400px; overflow-y: scroll;">
            <div style="height: 401px;">spacer</div>

            <div style="height: 400px" data-intersect.full="count++">
                <div style="text-align: center;">content</div>
            </div>
        </div>
    </div>
    `],
    ({ get }) => {
        get('span').should(haveText('0'))
        get('#container').scrollTo(0, 200, {duration: 100})
        get('span').should(haveText('0'))
        get('#container').scrollTo(0, 400, {duration: 100})
        get('span').should(haveText('1'))
    },
)

test('.once',
    [html`
    <div data-data="{ count: 0 }" data-init="setTimeout(() => count++, 300)">
        <span data-text="count"></span>

        <div data-intersect.once="count++" style="margin-top: 100vh;" id="1">hi</div>
    </div>
    `],
    ({ get }) => {
        get('span').should(haveText('0'))
        get('#1').scrollIntoView({duration: 100})
        get('span').should(haveText('1'))
        get('span').scrollIntoView({duration: 100})
        get('span').should(haveText('1'))
        get('#1').scrollIntoView({duration: 100})
        get('span').should(haveText('2'))
    },
)

test('.margin',
    [html`
    <div data-data="{ count: 0 }">
        <span data-text="count"></span>
        <div id="buffer-top" style="height: calc(100vh - 50px); margin-top: 100vh; background: pink"></div>
        <div id="buffer-bottom" style="height: 50px; background: green"></div>
        <div data-intersect.margin.100px="count++;$nextTick(() => console.log(count))" id="1">hi</div>
    </div>
    `],
    ({ get }) => {
        get('span').should(haveText('0'))
        get('#buffer-top').scrollIntoView({duration: 100})
        get('span').should(haveText('1'))
        get('#1').scrollIntoView({duration: 100})
        get('span').should(haveText('1'))
        get('span').scrollIntoView({duration: 100})
        get('span').should(haveText('1'))
        get('#buffer-top').scrollIntoView({duration: 100})
        get('span').should(haveText('2'))
        get('#1').scrollIntoView({duration: 100})
        get('span').should(haveText('2'))
    },
)

test('.threshold',
    [html`
    <div data-data="{ count: 0 }">
        <div data-ref="foo" style="width: 250px; overflow: scroll; display: flex; justify-content: start">
            <div style="min-width: 250px;">first</div>
            <div style="min-width: 250px" data-intersect.threshold.50="count++;">second</div>
        </div>
        <button @click="$refs.foo.scrollTo({ left: 15 })" id="1">first</button>
        <button @click="$refs.foo.scrollTo({ left: 250 })" id="2">second</button>
        <span data-text="count"></span>
    </div>
    `],
    ({ get }) => {
        get('span').should(haveText('0'))
        get('#1').click()
        get('span').should(haveText('0'))
        get('#2').click()
        get('span').should(haveText('1'))
    },
)
