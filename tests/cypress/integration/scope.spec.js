import { haveText, html, test } from "../utils";

test(
    "properly merges the datastack",
    [
        html`
            <div data-signal="{ foo: 'fizz' }">
                <div data-signal="{ bar: 'buzz' }">
                    <span data-text="foo + bar"></span>
                </div>
            </div>
        `,
    ],
    ({ get }) => {
        get("span").should(haveText("fizzbuzz"));
    }
);

test(
    "merges stack from bottom up",
    [
        html`
            <div data-signal="{ foo: 'fizz' }">
                <div data-signal="{ foo: 'buzz', get bar() { return this.foo } }">
                    <span id="one" data-text="bar + foo"></span>
                </div>
                <span id="two" data-text="foo"></span>
            </div>
        `,
    ],
    ({ get }) => {
        get("span#one").should(haveText("buzzbuzz"));
        get("span#two").should(haveText("fizz"));
    }
);

test(
    "handles getter setter pairs",
    [
        html`
            <div data-signal="{ foo: 'fizzbuzz' }">
                <div
                    data-signal="{ get bar() { return this.foo }, set bar(value) { this.foo = value } }"
                >
                    <span id="one" data-text="bar" @click="bar = 'foobar'"></span>
                </div>
                <span id="two" data-text="foo"></span>
            </div>
        `,
    ],
    ({ get }) => {
        get("span#one").should(haveText("fizzbuzz"));
        get("span#two").should(haveText("fizzbuzz"));
        get("span#one").click();
        get("span#one").should(haveText("foobar"));
        get("span#two").should(haveText("foobar"));
    }
);

test(
    "allows accessing class methods",
    [
        html`
            <script>
                class Counter {
                    value = 0;
                    constructor() {}
                    increment() {
                        this.value++;
                    }
                }
                document.addEventListener("alpine:init", () =>
                    Alpine.data("counter", () => new Counter())
                );
            </script>
            <div data-signal="counter">
                <button
                    type="button"
                    @click="increment"
                    data-text="value"
                ></button>
            </div>
        `,
    ],
    ({ get }) => {
        get("button").should(haveText("0"));
        get("button").click();
        get("button").should(haveText("1"));
    }
);

test(
    "setting value doesn't register a dependency",
    [
        html`
            <div data-signal="{ message: 'original' }">
                <button
                    data-effect="message = 'effected'"
                    @click="message = 'clicked'"
                    data-text="message"
                ></button>
            </div>
            ;
        `,
    ],
    ({ get }) => {
        get("button").should(haveText("effected"));
        get("button").click();
        get("button").should(haveText("clicked"));
    }
);

test(
    "properly merges the datastack with nested data",
    [
        html`
            <div data-signal="{ foo: { bar: 'fizz' } }">
                <div data-signal="{ bar: 'buzz' }">
                    <span
                        id="1"
                        data-text="foo.bar + bar"
                        @click="foo.bar = foo.bar + bar"
                    ></span>
                </div>
                <span id="2" data-text="foo.bar"></span>
            </div>
        `,
    ],
    ({ get }) => {
        get("span#1").should(haveText("fizzbuzz"));
        get("span#2").should(haveText("fizz"));
        get("span#1").click();
        get("span#1").should(haveText("fizzbuzzbuzz"));
        get("span#2").should(haveText("fizzbuzz"));
    }
);

test(
    "handles getter setter pairs of object",
    [
        html`
            <div data-signal="{ foo:  { bar: 'fizzbuzz' } }">
                <div
                    data-signal="{ get bar() { return this.foo.bar }, set bar(value) { this.foo.bar = value } }"
                >
                    <span id="one" data-text="bar" @click="bar = 'foobar'"></span>
                </div>
                <span id="two" data-text="foo.bar"></span>
            </div>
        `,
    ],
    ({ get }) => {
        get("span#one").should(haveText("fizzbuzz"));
        get("span#two").should(haveText("fizzbuzz"));
        get("span#one").click();
        get("span#one").should(haveText("foobar"));
        get("span#two").should(haveText("foobar"));
    }
);