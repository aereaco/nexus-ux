import { exist, haveLength, haveText, html, notExist, test } from '../../utils'

test('renders loops with data-for',
    html`
        <div data-data="{ items: ['foo'] }">
            <button data-on:click="items = ['foo', 'bar']">click me</button>

            <template data-for="item in items">
                <span data-text="item"></span>
            </template>
        </div>
    `,
    ({ get }) => {
        get('span:nth-of-type(1)').should(haveText('foo'))
        get('span:nth-of-type(2)').should(notExist())
        get('button').click()
        get('span:nth-of-type(1)').should(haveText('foo'))
        get('span:nth-of-type(2)').should(haveText('bar'))
    }
)

test('renders loops with data-for that have space or newline',
    html`
        <div data-data="{ items: ['foo'] }">
            <button data-on:click="items = ['foo', 'bar']">click me</button>

            <div data-bind:id="1">
                <template data-for="
                    (
                        item
                    ) in items
                ">
                    <span data-text="item"></span>
                </template>
            </div>

            <div data-bind:id="2">
                <template data-for=" (
                        item,
                        index
                    ) in items
                ">
                    <span data-text="item"></span>
                </template>
            </div>
        </div>
    `,
    ({ get }) => {
        get('#1 span:nth-of-type(1)').should(haveText('foo'))
        get('#1 span:nth-of-type(2)').should(notExist())
        get('#2 span:nth-of-type(1)').should(haveText('foo'))
        get('#2 span:nth-of-type(2)').should(notExist())
        get('button').click()
        get('#1 span:nth-of-type(1)').should(haveText('foo'))
        get('#1 span:nth-of-type(2)').should(haveText('bar'))
        get('#2 span:nth-of-type(1)').should(haveText('foo'))
        get('#2 span:nth-of-type(2)').should(haveText('bar'))
    }
)

test('can destructure arrays',
    html`
        <div data-data="{ items: [[1, 'foo'], [2, 'bar']] }">
            <template data-for="[id, label] in items">
                <div data-bind:id="id">
                    <span data-text="id"></span>
                    <h1 data-text="label"></h1>
                </div>
            </template>
        </div>
    `,
    ({ get }) => {
        get('#1 span').should(haveText('1'))
        get('#1 h1').should(haveText('foo'))
        get('#2 span').should(haveText('2'))
        get('#2 h1').should(haveText('bar'))
    }
)

test('can destructure object',
    html`
        <div data-data="{ items: [{ foo: 'oof', bar: 'rab' }, { foo: 'ofo', bar: 'arb' }] }">
            <template data-for="({ foo, bar }, i) in items">
                <div data-bind:id="i + 1">
                    <span data-text="foo"></span>
                    <h1 data-text="bar"></h1>
                </div>
            </template>
        </div>
    `,
    ({ get }) => {
        get('#1 span').should(haveText('oof'))
        get('#1 h1').should(haveText('rab'))
        get('#2 span').should(haveText('ofo'))
        get('#2 h1').should(haveText('arb'))
    }
)

test('removes all elements when array is empty and previously had one item',
    html`
        <div data-data="{ items: ['foo'] }">
            <button data-on:click="items = []">click me</button>

            <template data-for="item in items">
                <span data-text="item"></span>
            </template>
        </div>
    `,
    ({ get }) => {
        get('span').should(exist())
        get('button').click()
        get('span').should(notExist())
    }
)

test('removes all elements when array is empty and previously had multiple items',
    html`
        <div data-data="{ items: ['foo', 'bar', 'world'] }">
            <button data-on:click="items = []">click me</button>

            <template data-for="item in items">
                <span data-text="item"></span>
            </template>
        </div>
    `,
    ({ get }) => {
        get('span:nth-of-type(1)').should(exist())
        get('span:nth-of-type(2)').should(exist())
        get('span:nth-of-type(3)').should(exist())
        get('button').click()
        get('span:nth-of-type(1)').should(notExist())
        get('span:nth-of-type(2)').should(notExist())
        get('span:nth-of-type(3)').should(notExist())
    }
)

test('elements inside of loop are reactive',
    html`
        <div data-data="{ items: ['first'], foo: 'bar' }">
            <button data-on:click="foo = 'baz'">click me</button>

            <template data-for="item in items">
                <span>
                    <h1 data-text="item"></h1>
                    <h2 data-text="foo"></h2>
                </span>
            </template>
        </div>
    `,
    ({ get }) => {
        get('span').should(exist())
        get('h1').should(haveText('first'))
        get('h2').should(haveText('bar'))
        get('button').click()
        get('span').should(exist())
        get('h1').should(haveText('first'))
        get('h2').should(haveText('baz'))
    }
)

test('components inside of loop are reactive',
    html`
        <div data-data="{ items: ['first'] }">
            <template data-for="item in items">
                <div data-data="{foo: 'bar'}" class="child">
                    <span data-text="foo"></span>
                    <button data-on:click="foo = 'bob'">click me</button>
                </div>
            </template>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar'))
        get('button').click()
        get('span').should(haveText('bob'))
    }
)

test('components inside a plain element of loop are reactive',
    html`
        <div data-data="{ items: ['first'] }">
            <template data-for="item in items">
                <ul>
                    <div data-data="{foo: 'bar'}" class="child">
                        <span data-text="foo"></span>
                        <button data-on:click="foo = 'bob'">click me</button>
                    </div>
                </ul>
            </template>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar'))
        get('button').click()
        get('span').should(haveText('bob'))
    }
)

test('adding key attribute moves dom nodes properly',
    html`
        <div data-data="{ items: ['foo', 'bar'] }">
            <button data-on:click="items = ['bob', 'bar', 'foo', 'baz']" id="reorder">click me</button>
            <button data-on:click="$el.parentElement.querySelectorAll('span').forEach((el, index) => el.og_loop_index = index)" id="assign">click me</button>

            <template data-for="item in items" :key="item">
                <span data-text="item"></span>
            </template>
        </div>
    `,
    ({ get }) => {
        let haveOgIndex = index => el => expect(el[0].og_loop_index).to.equal(index)

        get('#assign').click()
        get('span:nth-of-type(1)').should(haveOgIndex(0))
        get('span:nth-of-type(2)').should(haveOgIndex(1))
        get('#reorder').click()
        get('span:nth-of-type(1)').should(haveOgIndex(undefined))
        get('span:nth-of-type(2)').should(haveOgIndex(1))
        get('span:nth-of-type(3)').should(haveOgIndex(0))
        get('span:nth-of-type(4)').should(haveOgIndex(undefined))
    }
)

test('can key by index',
    html`
        <div data-data="{ items: ['foo', 'bar'] }">
            <button data-on:click="items = ['bar', 'foo', 'baz']" id="reorder">click me</button>
            <button data-on:click="$el.parentElement.querySelectorAll('span').forEach((el, index) => el.og_loop_index = index)" id="assign">click me</button>

            <template data-for="(item, index) in items" :key="index">
                <span data-text="item"></span>
            </template>
        </div>
    `,
    ({ get }) => {
        let haveOgIndex = index => el => expect(el[0].og_loop_index).to.equal(index)

        get('#assign').click()
        get('span:nth-of-type(1)').should(haveOgIndex(0))
        get('span:nth-of-type(2)').should(haveOgIndex(1))
        get('#reorder').click()
        get('span:nth-of-type(1)').should(haveOgIndex(0))
        get('span:nth-of-type(2)').should(haveOgIndex(1))
        get('span:nth-of-type(3)').should(haveOgIndex(undefined))
    }
)

test('can use index inside of loop',
    html`
        <div data-data="{ items: ['foo'] }">
            <template data-for="(item, index) in items">
                <div>
                    <h1 data-text="items.indexOf(item)"></h1>
                    <h2 data-text="index"></h2>
                </div>
            </template>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText(0))
        get('h2').should(haveText(0))
    }
)

test('can use third iterator param (collection) inside of loop',
    html`
        <div data-data="{ items: ['foo'] }">
            <template data-for="(item, index, things) in items">
                <div>
                    <h1 data-text="items"></h1>
                    <h2 data-text="things"></h2>
                </div>
            </template>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText('foo'))
        get('h2').should(haveText('foo'))
    }
)

test('listeners in loop get fresh iteration data even though they are only registered initially',
    html`
        <div data-data="{ items: ['foo'], output: '' }">
            <button data-on:click="items = ['bar']">click me</button>

            <template data-for="(item, index) in items">
                <span data-text="item" data-on:click="output = item"></span>
            </template>

            <h1 data-text="output"></h1>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText(''))
        get('span').click()
        get('h1').should(haveText('foo'))
        get('button').click()
        get('span').click()
        get('h1').should(haveText('bar'))
    }
)

test('nested data-for',
    html`
        <div data-data="{ foos: [ {bars: ['bob', 'lob']} ] }">
            <button data-on:click="foos = [ {bars: ['bob', 'lob']}, {bars: ['law']} ]">click me</button>
            <template data-for="foo in foos">
                <h1>
                    <template data-for="bar in foo.bars">
                        <h2 data-text="bar"></h2>
                    </template>
                </h1>
            </template>
        </div>
    `,
    ({ get }) => {
        get('h1:nth-of-type(1) h2:nth-of-type(1)').should(exist())
        get('h1:nth-of-type(1) h2:nth-of-type(2)').should(exist())
        get('h1:nth-of-type(2) h2:nth-of-type(1)').should(notExist())
        get('button').click()
        get('h1:nth-of-type(1) h2:nth-of-type(1)').should(exist())
        get('h1:nth-of-type(1) h2:nth-of-type(2)').should(exist())
        get('h1:nth-of-type(2) h2:nth-of-type(1)').should(exist())
    }
)

test('data-for updates the right elements when new item are inserted at the beginning of the list',
    html`
        <div data-data="{ items: [{name: 'one', key: '1'}, {name: 'two', key: '2'}] }">
            <button data-on:click="items = [{name: 'zero', key: '0'}, {name: 'one', key: '1'}, {name: 'two', key: '2'}]">click me</button>

            <template data-for="item in items" :key="item.key">
                <span data-text="item.name"></span>
            </template>
        </div>
    `,
    ({ get }) => {
        get('span:nth-of-type(1)').should(haveText('one'))
        get('span:nth-of-type(2)').should(haveText('two'))
        get('button').click()
        get('span:nth-of-type(1)').should(haveText('zero'))
        get('span:nth-of-type(2)').should(haveText('one'))
        get('span:nth-of-type(3)').should(haveText('two'))
    }
)

test('nested data-for access outer loop variable',
    html`
        <div data-data="{ foos: [ {name: 'foo', bars: ['bob', 'lob']}, {name: 'baz', bars: ['bab', 'lab']} ] }">
            <template data-for="foo in foos">
                <h1>
                    <template data-for="bar in foo.bars">
                        <h2 data-text="foo.name+': '+bar"></h2>
                    </template>
                </h1>
            </template>
        </div>
    `,
    ({ get }) => {
        get('h1:nth-of-type(1) h2:nth-of-type(1)').should(haveText('foo: bob'))
        get('h1:nth-of-type(1) h2:nth-of-type(2)').should(haveText('foo: lob'))
        get('h1:nth-of-type(2) h2:nth-of-type(1)').should(haveText('baz: bab'))
        get('h1:nth-of-type(2) h2:nth-of-type(2)').should(haveText('baz: lab'))
    }
)

test('sibling data-for do not interact with each other',
    html`
        <div data-data="{ foos: [1], bars: [1, 2] }">
            <template data-for="foo in foos">
                <h1 data-text="foo"></h1>
            </template>
            <template data-for="bar in bars">
                <h2 data-text="bar"></h2>
            </template>
            <button @click="foos = [1, 2];bars = [1, 2, 3]">Change</button>
        </div>
    `,
    ({ get }) => {
        get('h1:nth-of-type(1)').should(haveText('1'))
        get('h2:nth-of-type(1)').should(haveText('1'))
        get('h2:nth-of-type(2)').should(haveText('2'))
        get('button').click()
        get('h1:nth-of-type(1)').should(haveText('1'))
        get('h1:nth-of-type(2)').should(haveText('2'))
        get('h2:nth-of-type(1)').should(haveText('1'))
        get('h2:nth-of-type(2)').should(haveText('2'))
        get('h2:nth-of-type(3)').should(haveText('3'))
    }
)

test('data-for over range using i in x syntax',
    html`
        <div data-data>
            <template data-for="i in 10">
                <span data-text="i"></span>
            </template>
        </div>
    `,
    ({ get }) => get('span').should(haveLength('10'))
)

test('data-for over range using i in property syntax',
    html`
        <div data-data="{ count: 10 }">
            <template data-for="i in count">
                <span data-text="i"></span>
            </template>
        </div>
    `,
    ({ get }) => get('span').should(haveLength('10'))
)

test.retry(2)('data-for with an array of numbers',
    `
        <div data-data="{ items: [] }">
            <template data-for="i in items">
                <span data-text="i"></span>
            </template>
            <button @click="items.push(2)" id="first">click me</button>
            <button @click="items.push(3)" id="second">click me</button>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveLength('0'))
        get('#first').click()
        get('span').should(haveLength('1'))
        get('#second').click()
        get('span').should(haveLength('2'))
    }
)

test('data-for works with undefined',
    `
        <div data-data="{ items: undefined }">
            <template data-for="i in items">
                <span data-text="i"></span>
            </template>
            <button @click="items = [2]" id="first">click me</button>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveLength('0'))
        get('#first').click()
        get('span').should(haveLength('1'))
    }
)

test('data-for works with variables that start with let',
    `
        <ul data-data="{ letters: ['a','b','c'] }">
          <template data-for="letter in letters">
            <li data-text="letter"></li>
          </template>
        </ul>
    `,
    ({ get }) => {
        get('li:nth-of-type(1)').should(haveText('a'))
        get('li:nth-of-type(2)').should(haveText('b'))
        get('li:nth-of-type(3)').should(haveText('c'))
    }
)

test('data-for works with variables that start with const',
    `
        <ul data-data="{ constants: ['a','b','c'] }">
          <template data-for="constant in constants">
            <li data-text="constant"></li>
          </template>
        </ul>
    `,
    ({ get }) => {
        get('li:nth-of-type(1)').should(haveText('a'))
        get('li:nth-of-type(2)').should(haveText('b'))
        get('li:nth-of-type(3)').should(haveText('c'))
    }
)

test('renders children in the right order when combined with data-if',
    html`
        <div data-data="{ items: ['foo', 'bar'] }">
            <template data-for="item in items">
                <template data-if="true">
                    <span data-text="item"></span>
                </template>
            </template>
        </div>
    `,
    ({ get }) => {
        get('span:nth-of-type(1)').should(haveText('foo'))
        get('span:nth-of-type(2)').should(haveText('bar'))
    }
)

test('correctly renders data-if children when reordered',
    html`
        <div data-data="{ items: ['foo', 'bar'] }">
            <button @click="items = ['bar', 'foo']">click me</button>
            <button @click="items = ['bar', 'baz', 'foo']">click me</button>
            <button @click="items = ['baz', 'foo']">click me</button>
            <template data-for="item in items" :key="item">
                <template data-if="true">
                    <span data-text="item"></span>
                </template>
            </template>
        </div>
    `,
    ({ get }) => {
        get('span:nth-of-type(1)').should(haveText('foo'))
        get('span:nth-of-type(2)').should(haveText('bar'))
        get('button:nth-of-type(1)').click()
        get('span').should(haveLength('2'))
        get('span:nth-of-type(1)').should(haveText('bar'))
        get('span:nth-of-type(2)').should(haveText('foo'))
        get('button:nth-of-type(2)').click()
        get('span').should(haveLength('3'))
        get('span:nth-of-type(1)').should(haveText('bar'))
        get('span:nth-of-type(2)').should(haveText('baz'))
        get('span:nth-of-type(3)').should(haveText('foo'))
        get('button:nth-of-type(3)').click()
        get('span').should(haveLength('2'))
        get('span:nth-of-type(1)').should(haveText('baz'))
        get('span:nth-of-type(2)').should(haveText('foo'))
    }
)
//If an data-for element is removed from DOM, expectation is that the removed DOM element will not have any of its reactive expressions evaluated after removal.
test('data-for removed dom node does not evaluate child expressions after being removed',
    html`
        <div data-data="{ users: [{ name: 'lebowski' }] }">
            <template data-for="(user, idx) in users">
                <span data-text="users[idx].name"></span>
            </template>
            <button @click="users = []">Reset</button>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('lebowski'))

        /** Clicking button sets users=[] and thus data-for loop will remove all children.
            If the sub-expression data-text="users[idx].name" is evaluated, the button click
            will produce an error because users[idx] is no longer defined and the test will fail
        **/
        get('button').click()
        get('span').should('not.exist')
    }
)

test('renders children using directives injected by data-html correctly',
    html`
        <div data-data="{foo: 'bar'}">
            <template data-for="i in 2">
                <p data-html="'<span data-text=&quot;foo&quot;></span>'"></p>
            </template>
        </div>
    `,
    ({ get }) => {
        get('p:nth-of-type(1) span').should(haveText('bar'))
        get('p:nth-of-type(2) span').should(haveText('bar'))
    }
)

test(
    'handles data-data directly inside data-for',
    html`
        <div data-data="{ items: [{x:0, k:1},{x:1, k:2}] }">
            <button data-on:click="items = [{x:3, k:1},{x:4, k:2}]">update</button>
            <template data-for="item in items" :key="item.k">
                <div :id="'item-' + item.k" data-data="{ inner: true }">
                    <span data-text="item.x.toString()"></span>:
                    <span data-text="item.k"></span>
                </div>
            </template>
        </div>
    `,
    ({ get }) => {
        get('#item-1 span:nth-of-type(1)').should(haveText('0'))
        get('#item-2 span:nth-of-type(1)').should(haveText('1'))
        get('button').click()
        get('#item-1 span:nth-of-type(1)').should(haveText('3'))
        get('#item-2 span:nth-of-type(1)').should(haveText('4'))
})

test('data-for throws descriptive error when key is undefined',
    html`
        <div data-data="{ items: [
            {
                id: 1,
                name: 'foo',
            },
            {
                id: 2,
                name: 'bar',
            },
            {
                id: 3,
                name: 'baz',
            },
        ]}">
            <template data-for="item in items" :key="item.doesntExist">
                <span data-text="i"></span>
            </template>
        </div>
    `,
    ({ get }) => {},
    true
)

// If data-for removes a child, all cleanups in the tree should be handled.
test('data-for eagerly cleans tree',
    html`
        <div data-data="{ show: 0, counts: [0,0,0], items: [0,1,2] }">
            <button
                id="toggle"
                @click="show^=true"
                data-text="counts.reduce((a,b)=>a+b)">
                Toggle
            </button>
            <button id="remove" @click="items.pop()">Remove</button>
            <template data-for="num in items" :key="num">
                <div>
                <template data-for="n in show">
                    <p data-effect="if (show) counts[num]++">hello</p>
                </template>
                </div>
            </template>
        </div>
    `,
    ({ get }) => {
        get('#toggle').should(haveText('0'))
        get('#toggle').click()
        get('#toggle').should(haveText('3'))
        get('#toggle').click()
        get('#toggle').should(haveText('3'))
        get('#toggle').click()
        get('#toggle').should(haveText('6'))
        get('#remove').click()
        get('#toggle').should(haveText('6'))
        get('#toggle').click()
        get('#toggle').should(haveText('6'))
        get('#toggle').click()
        get('#toggle').should(haveText('8'))
    }
)
