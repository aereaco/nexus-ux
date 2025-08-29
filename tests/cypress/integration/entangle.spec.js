import { haveValue, html, test } from '../utils'

test.skip('can entangle to getter/setter pairs',
    [html`
    <div data-signal="{ outer: 'foo' }">
        <input data-model="outer" outer>

        <div data-signal="{ inner: 'bar' }" data-init="() => {}; Alpine.entangle(
            {
                get() { return outer },
                set(value) { outer = value },
            },
            {
                get() { return inner },
                set(value) { inner = value },
            }
        )">
            <input data-model="inner" inner>
        </div>
    </div>
    `],
    ({ get }) => {
        get('input[outer]').should(haveValue('foo'))
        get('input[inner]').should(haveValue('foo'))

        get('input[inner]').type('bar')
        get('input[inner]').should(haveValue('foobar'))
        get('input[outer]').should(haveValue('foobar'))

        get('input[outer]').type('baz')
        get('input[outer]').should(haveValue('foobarbaz'))
        get('input[inner]').should(haveValue('foobarbaz'))
    }
)

test.skip('can release entanglement',
    [html`
        <div data-signal="{ outer: 'foo' }">
            <input data-model="outer" outer>

            <div data-signal="{ inner: 'bar', release: () => {} }" data-init="() => {}; release = Alpine.entangle(
                {
                    get() { return outer },
                    set(value) { outer = value },
                },
                {
                    get() { return inner },
                    set(value) { inner = value },
                }
            )">
                <input data-model="inner" inner>

                <button @click="release()">release</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('input[outer]').should(haveValue('foo'))
        get('input[inner]').should(haveValue('foo'))

        get('input[inner]').type('bar')
        get('input[inner]').should(haveValue('foobar'))
        get('input[outer]').should(haveValue('foobar'))

        get('button').click()

        get('input[inner]').type('baz')
        get('input[inner]').should(haveValue('foobarbaz'))
        get('input[outer]').should(haveValue('foobar'))
    }
)

test(
    "can handle undefined",
    [
        html`
            <div data-signal="{ outer: undefined }">
                <input data-model="outer" outer />

                <div
                    data-signal="{ inner: 'bar' }"
                    data-init="() => {}; Alpine.entangle(
            {
                get() { return outer },
                set(value) { outer = value },
            },
            {
                get() { return inner },
                set(value) { inner = value },
            }
        )"
                >
                    <input data-model="inner" inner />
                </div>
            </div>
        `,
    ],
    ({ get }) => {
        get("input[outer]").should(haveValue(''));
        get("input[inner]").should(haveValue(''));

        get("input[inner]").type("bar");
        get("input[inner]").should(haveValue("bar"));
        get("input[outer]").should(haveValue("bar"));
    }
);
