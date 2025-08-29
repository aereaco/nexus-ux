import { haveText, html, test } from '../../utils'

test('$watch',
    html`
        <div
            data-signal="{ foo: 'bar', bob: 'lob' }"
            data-init="$watch('foo', value => { bob = value })"
        >
            <h1 data-text="foo"></h1>
            <h2 data-text="bob"></h2>

            <button data-on:click="foo = 'baz'"></button>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText('bar'))
        get('h2').should(haveText('lob'))
        get('button').click()
        get('h1').should(haveText('baz'))
        get('h2').should(haveText('baz'))
    }
)

test('$watch receives old value',
    html`
        <div
            data-signal="{ foo: 'bar', fresh: '', old: '' }"
            data-init="$watch('foo', (value, oldValue) => { fresh = value; old = oldValue; })"
        >
            <h1 data-text="fresh"></h1>
            <h2 data-text="old"></h2>

            <button data-on:click="foo = 'baz'"></button>
        </div>
    `,
    ({ get }) => {
        get('button').click()
        get('h1').should(haveText('baz'))
        get('h2').should(haveText('bar'))
    }
)

test('$watch nested properties',
    html`
        <div data-signal="{ foo: { bar: 'baz', bob: 'lob' } }" data-init="
            $watch('foo.bar', value => { foo.bob = value });
        ">
            <h1 data-text="foo.bar"></h1>
            <h2 data-text="foo.bob"></h2>

            <button data-on:click="foo.bar = 'law'"></button>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText('baz'))
        get('h2').should(haveText('lob'))
        get('button').click()
        get('h1').should(haveText('law'))
        get('h2').should(haveText('law'))
    }
)

test('$watch arrays',
    html`
        <div data-signal="{ foo: ['one'], bob: 'lob' }"
            data-init="$watch('foo', value => { bob = value })">
            <h1 data-text="foo"></h1>
            <h2 data-text="bob"></h2>

            <button id="push" data-on:click="foo.push('two')"></button>
            <button id="pop" data-on:click="foo.pop()"></button>
            <button id="unshift" data-on:click="foo.unshift('zero')"></button>
            <button id="shift" data-on:click="foo.shift()"></button>
            <button id="assign" data-on:click="foo = [2,1,3]"></button>
            <button id="sort" data-on:click="foo.sort()"></button>
            <button id="reverse" data-on:click="foo.reverse()"></button>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText('one'))
        get('h2').should(haveText('lob'))

        get('button#push').click()
        get('h1').should(haveText('one,two'))
        get('h2').should(haveText('one,two'))

        get('button#pop').click()
        get('h1').should(haveText('one'))
        get('h2').should(haveText('one'))

        get('button#unshift').click()
        get('h1').should(haveText('zero,one'))
        get('h2').should(haveText('zero,one'))

        get('button#shift').click()
        get('h1').should(haveText('one'))
        get('h2').should(haveText('one'))

        get('button#assign').click()
        get('h1').should(haveText('2,1,3'))
        get('h2').should(haveText('2,1,3'))

        get('button#sort').click()
        get('h1').should(haveText('1,2,3'))
        get('h2').should(haveText('1,2,3'))

        get('button#reverse').click()
        get('h1').should(haveText('3,2,1'))
        get('h2').should(haveText('3,2,1'))
    }
)

test('$watch nested arrays',
    html`
        <div data-signal="{ foo: {baz: ['one']}, bob: 'lob' }" data-init="$watch('foo.baz', value => { bob = value })">
            <h1 data-text="foo.baz"></h1>
            <h2 data-text="bob"></h2>

            <button id="push" data-on:click="foo.baz.push('two')"></button>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText('one'))
        get('h2').should(haveText('lob'))

        get('button').click()
        get('h1').should(haveText('one,two'))
        get('h2').should(haveText('one,two'))
    }
)

test('$watch ignores other dependencies',
    html`
        <div
            data-signal="{ a: 0, b: 0, c: 0 }"
            data-init="$watch('a', () => { c = a + b })"
        >
            <button @click="a++" id="a">a</button>
            <button @click="b++" id="b">b</button>
            <span data-text="c"></span>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('0'))
        get('#a').click()
        get('span').should(haveText('1'))
        get('#b').click()
        get('span').should(haveText('1'))
    }
)


test('deep $watch',
    html`
        <div data-signal="{ foo: { bar: 'baz'}, bob: 'lob' }" data-init="
            $watch('foo', value => { bob = value.bar }, {deep: true});
        ">
            <h1 data-text="foo.bar"></h1>
            <h2 data-text="bob"></h2>

            <button data-on:click="foo.bar = 'law'"></button>
        </div>
    `,
    ({ get }) => {
        get('h1').should(haveText('baz'))
        get('h2').should(haveText('lob'))
        get('button').click()
        get('h1').should(haveText('law'))
        get('h2').should(haveText('law'))
    }
)

