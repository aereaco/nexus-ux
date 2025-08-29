import { exist, haveText, html, notExist, test } from '../../utils'

test('can use a data-teleport',
    [html`
        <div data-signal="{ count: 1 }" id="a">
            <button @click="count++">Inc</button>

            <template data-teleport="#b">
                <span data-text="count"></span>
            </template>
        </div>

        <div id="b"></div>
    `],
    ({ get }) => {
        get('#b span').should(haveText('1'))
        get('button').click()
        get('#b span').should(haveText('2'))
    },
)

test('can use a data-teleport.append',
    [html`
        <div data-signal="{ count: 1 }" id="a">
            <button @click="count++">Inc</button>

            <template data-teleport.append="#b">
                <span data-text="count"></span>
            </template>
        </div>

        <div id="b"></div>
    `],
    ({ get }) => {
        get('#b + span').should(haveText('1'))
        get('button').click()
        get('#b + span').should(haveText('2'))
    },
)

test('can use a data-teleport.prepend',
    [html`
        <div data-signal="{ count: 1 }" id="a">
            <button @click="count++">Inc</button>

            <template data-teleport.prepend="#b">
                <span data-text="count"></span>
            </template>
        </div>

        <div id="b"></div>
    `],
    ({ get }) => {
        get('#a + span').should(haveText('1'))
        get('button').click()
        get('#a + span').should(haveText('2'))
    },
)

test('can teleport multiple',
    [html`
        <div data-signal="{ count: 1 }" id="a">
            <button @click="count++">Inc</button>

            <template data-teleport="#b">
                <h1 data-text="count"></h1>
            </template>

            <template data-teleport="#b">
                <h2 data-text="count + 1"></h2>
            </template>
        </div>

        <div id="b"></div>
    `],
    ({ get }) => {
        get('#b h1').should(haveText('1'))
        get('#b h2').should(haveText('2'))
        get('button').click()
        get('#b h1').should(haveText('2'))
        get('#b h2').should(haveText('3'))
    },
)

test('teleported targets forward events to teleport source if listeners are attached',
    [html`
        <div data-signal="{ count: 1 }" id="a">
            <button @click="count++">Inc</button>

            <template data-teleport="#b" @click="count++">
                <h1 data-text="count"></h1>
            </template>
        </div>

        <div id="b"></div>
    `],
    ({ get }) => {
        get('#b h1').should(haveText('1'))
        get('button').click()
        get('#b h1').should(haveText('2'))
        get('h1').click()
        get('#b h1').should(haveText('3'))
    },
)

test('removing teleport source removes teleported target',
    [html`
        <div data-signal="{ count: 1 }" id="a">
            <button @click="$refs.template.remove()">Remove</button>

            <template data-teleport="#b" @click="count++" data-ref="template">
                <h1 data-text="count"></h1>
            </template>
        </div>

        <div id="b"></div>
    `],
    ({ get }) => {
        get('#b h1').should(exist())
        get('button').click()
        get('#b h1').should(notExist())
    },
)

test(
    'immediately cleans up the clone when the original template is removed',
    [
        html`
            <div data-signal="{ show: true, shown: 'original' }">
                <span data-text="shown"></span>
                <template data-if="show">
                    <div>
                    <template data-teleport="#target">
                        <button data-signal="{ 
                            init() { this.shown = 'cloned' }, 
                            destroy() { this.shown = 'destroyed' }
                        }" @click="show = false">remove</button>
                    </template>
                    </div>
                </template>
                <section id="target"></section>
            </div>
        `,
    ],
    ({ get }) => {
        get('section').should(haveText('remove'));
        get("button").should(exist());
        get('span').should(haveText('cloned'));
        get('button').click();
        get('section').should(haveText(''));
        get('button').should(notExist());
        get('span').should(haveText('destroyed'));
    }
);

test('$refs inside teleport can be accessed outside',
    [html`
        <div data-signal="{ count: 1 }" id="a">
            <button @click="$refs.count.remove()">Remove</button>

            <template data-teleport="#b">
                <h1 data-text="count" data-ref="count"></h1>
            </template>
        </div>

        <div id="b"></div>
    `],
    ({ get }) => {
        get('#b h1').should(exist())
        get('button').click()
        get('#b h1').should(notExist())
    },
)

test('$root is accessed outside teleport',
    [html`
        <div data-signal="{ count: 1 }" id="a">
            <template data-teleport="#b">
                <h1 data-text="$root.id"></h1>
            </template>
        </div>

        <div id="b"></div>
    `],
    ({ get }) => {
        get('#b h1').should(exist())
        get('#b h1').should(haveText('a'))
    },
)

test('$id honors data-id outside teleport',
    [html`
        <div data-signal="{ count: 1 }" id="a" data-id="['foo']">
            <h1 data-text="$id('foo')"></h1>

            <template data-teleport="#b">
                <h1 data-text="$id('foo')"></h1>
            </template>
        </div>

        <div id="b"></div>
    `],
    ({ get }) => {
        get('#b h1').should(haveText('foo-1'))
    },
)

test('conditionally added elements get initialised inside teleport',
    [html`
        <div data-signal="{ show: false }" id="a">
            <button @click="show = true">Show Teleport Content</button>

            <template data-teleport="#b">
                <div>
                    <template data-if="show" >
                        <p data-text="'Teleport content initialised'">Teleport content waiting</p>
                    </template>
                </div>
            </template>
        </div>

        <div id="b"></div>
    `],
    ({ get }) => {
        get('#b p').should('not.exist')
        get('button').click()
        get('#b p').should('exist').and('have.text', 'Teleport content initialised')
    },
)
