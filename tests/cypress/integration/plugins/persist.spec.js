import { beEqualTo, exist, haveText, html, notExist, test } from '../../utils'

test('can persist number',
    [html`
        <div data-signal="{ count: $persist(1) }">
            <button @click="count++">Inc</button>
            <span data-text="count"></span>
        </div>
    `],
    ({ get }, reload) => {
        get('span').should(haveText('1'))
        get('button').click()
        get('span').should(haveText('2'))
        reload()
        get('span').should(haveText('2'))
    },
)

test('can persist string',
    [html`
        <div data-signal="{ message: $persist('foo') }">
            <input data-model="message">

            <span data-text="message"></span>
        </div>
    `],
    ({ get }, reload) => {
        get('span').should(haveText('foo'))
        get('input').clear().type('bar')
        get('span').should(haveText('bar'))
        reload()
        get('span').should(haveText('bar'))
    },
)

test('can persist array',
    [html`
        <div data-signal="{ things: $persist(['foo', 'bar']) }">
            <button @click="things.push('baz')"></button>

            <span data-text="things.join('-')"></span>
        </div>
    `],
    ({ get }, reload) => {
        get('span').should(haveText('foo-bar'))
        get('button').click()
        get('span').should(haveText('foo-bar-baz'))
        reload()
        get('span').should(haveText('foo-bar-baz'))
    },
)

test('can persist object',
    [html`
        <div data-signal="{ something: $persist({foo: 'bar'}) }">
            <button id="one" @click="something.foo = 'baz'"></button>
            <button id="two" @click="something = {foo: 'bob'}"></button>

            <span data-text="something.foo"></span>
        </div>
    `],
    ({ get }, reload) => {
        get('span').should(haveText('bar'))
        get('button#one').click()
        get('span').should(haveText('baz'))
        reload()
        get('span').should(haveText('baz'))
        get('button#two').click()
        get('span').should(haveText('bob'))
        reload()
        get('span').should(haveText('bob'))
    },
)

test('can persist boolean',
    [html`
        <div data-signal="{ show: $persist(false) }">
            <button @click="show = true"></button>

            <template data-if="show">
                <span>Foo</span>
            </template>
        </div>
    `],
    ({ get }, reload) => {
        get('span').should(notExist())
        get('button').click()
        get('span').should(exist())
        reload()
        get('span').should(exist())
    },
)

test('can persist multiple components using the same property',
    [html`
        <div data-signal="{ duplicate: $persist('foo') }">
            <button @click="duplicate = 'bar'"></button>
            <span id="one" data-text="duplicate"></span>
        </div>
        <div data-signal="{ duplicate: $persist('foo') }">
            <span id="two" data-text="duplicate"></span>
        </div>
    `],
    ({ get }, reload) => {
        get('span#one').should(haveText('foo'))
        get('span#two').should(haveText('foo'))
        get('button').click()
        get('span#one').should(haveText('bar'))
        reload()
        get('span#one').should(haveText('bar'))
        get('span#two').should(haveText('bar'))
    },
)

test('can persist using an alias',
    [html`
        <div data-signal="{ show: $persist(false) }">
            <template data-if="show">
                <span id="one">Foo</span>
            </template>
        </div>
        <div data-signal="{ show: $persist(false).as('foo') }">
            <button id="test" @click="show = true"></button>

            <template data-if="show">
                <span id="two">Foo</span>
            </template>
        </div>
    `],
    ({ get }, reload) => {
        get('span#one').should(notExist())
        get('span#two').should(notExist())
        get('button').click()
        get('span#one').should(notExist())
        get('span#two').should(exist())
        reload()
        get('span#one').should(notExist())
        get('span#two').should(exist())
    },
)

test('aliases do not affect other $persist calls',
    [html`
        <div data-signal="{ show: $persist(false).as('foo') }">
            <button id="test" @click="show = true"></button>

            <template data-if="show">
                <span id="two">Foo</span>
            </template>
        </div>
        <div data-signal="{ open: $persist(false) }">
            <template data-if="open">
                <span id="one">Foo</span>
            </template>
        </div>
    `],
    ({ get }, reload) => {
        get('span#one').should(notExist())
        get('span#two').should(notExist())
        get('button').click()
        get('span#one').should(notExist())
        get('span#two').should(exist())
        reload()
        get('span#one').should(notExist())
        get('span#two').should(exist())
    },
)

test('can persist to custom storage',
    [html`
        <div data-signal="{ message: $persist('foo').using(sessionStorage) }">
            <input data-model="message">

            <span data-text="message"></span>
        </div>
    `],
    ({ get, window }, reload) => {
        get('span').should(haveText('foo'))
        get('input').clear().type('bar')
        get('span').should(haveText('bar'))
        reload()
        get('span').should(haveText('bar'))
        window().its('sessionStorage._data_message').should(beEqualTo(JSON.stringify('bar')))
        window().then((win) => {
            win.sessionStorage.clear()
        });
    },
)

test('can persist to custom storage using an alias',
    [html`
        <div data-signal="{ message: $persist('foo').as('mymessage').using(sessionStorage) }">
            <input data-model="message">

            <span data-text="message"></span>
        </div>
    `],
    ({ get, window }, reload) => {
        get('span').should(haveText('foo'))
        get('input').clear().type('bar')
        get('span').should(haveText('bar'))
        window().its('sessionStorage.mymessage').should(beEqualTo(JSON.stringify('bar')))
        window().then((win) => {
            win.sessionStorage.clear()
        });
    },
)

test('can persist using global Alpine.$persist within Alpine.store',
    [html`
        <div data-signal>
            <input data-model="$store.name.firstName">

            <span data-text="$store.name.firstName"></span>
        </div>
    `, `
        Alpine.store('name', {
            firstName: Alpine.$persist('Daniel').as('dev-name')
        })
    `],
    ({ get, window }, reload) => {
        get('span').should(haveText('Daniel'))
        get('input').clear().type('Malcolm')
        get('span').should(haveText('Malcolm'))
        reload()
        get('span').should(haveText('Malcolm'))
    },
)

test('persist in Stores is available in init call',
    [html`
        <div data-signal>
            <span data-text="$store.name.name"></span>
        </div>
    `, `
        Alpine.store('name', {
            firstName: Alpine.$persist('Daniel').as('dev-name'),
            name: null,
            init() {
                this.name = String(this.firstName)
            }
        })
    `],
    ({ get }) => {
        get('span').should(haveText('Daniel'))
    },
)

test('multiple aliases work when using global Alpine.$persist',
    [html`
        <div data-signal>
            <input data-model="$store.name.firstName">

            <span data-text="$store.name.firstName"></span>
            <p data-text="$store.name.lastName"></p>
        </div>
    `, `
        Alpine.store('name', {
            firstName: Alpine.$persist('John').as('first-name'),
            lastName: Alpine.$persist('Doe').as('name-name')
        })
    `],
    ({ get, window }, reload) => {
        get('span').should(haveText('John'))
        get('p').should(haveText('Doe'))
        get('input').clear().type('Joe')
        get('span').should(haveText('Joe'))
        get('p').should(haveText('Doe'))
        reload()
        get('span').should(haveText('Joe'))
        get('p').should(haveText('Doe'))
    },
)
