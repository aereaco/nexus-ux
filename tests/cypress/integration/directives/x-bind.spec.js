import { beHidden, beVisible, haveText, beChecked, haveAttribute, haveClasses, haveProperty, haveValue, notBeChecked, notHaveAttribute, notHaveClasses, test, html } from '../../utils';

test('sets attribute bindings on initialize',
    html`
        <div data-signal="{ foo: 'bar' }">
            <span data-ref="me" data-bind:foo="foo">[Subject]</span>
        </div>
    `,
    ({ get }) => get('span').should(haveAttribute('foo', 'bar'))
)

test('sets undefined nested keys to empty string',
    html`
        <div data-signal="{ nested: {} }">
            <span data-bind:foo="nested.field">
        </div>
    `,
    ({ get }) => get('span').should(haveAttribute('foo', ''))
)

test('style attribute bindings are added by string syntax',
    html`
        <div data-signal="{ initialClass: 'foo' }">
            <span data-bind:class="initialClass"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveClasses(['foo']))
)

test('aria-pressed/checked/expanded/selected attribute boolean values are cast to a true/false string',
    html`
        <div data-signal="{ open: true }">
            <span data-bind:aria-pressed="open"></span>
            <span data-bind:aria-checked="open"></span>
            <span data-bind:aria-expanded="open"></span>
            <span data-bind:aria-selected="open"></span>

            <span data-bind:aria-pressed="false"></span>
            <span data-bind:aria-checked="false"></span>
            <span data-bind:aria-expanded="false"></span>
            <span data-bind:aria-selected="false"></span>
        </div>
    `,
    ({ get }) => {
        get('span:nth-of-type(1)').should(haveAttribute('aria-pressed', 'true'))
        get('span:nth-of-type(2)').should(haveAttribute('aria-checked', 'true'))
        get('span:nth-of-type(3)').should(haveAttribute('aria-expanded', 'true'))
        get('span:nth-of-type(4)').should(haveAttribute('aria-selected', 'true'))
        get('span:nth-of-type(5)').should(haveAttribute('aria-pressed', 'false'))
        get('span:nth-of-type(6)').should(haveAttribute('aria-checked', 'false'))
        get('span:nth-of-type(7)').should(haveAttribute('aria-expanded', 'false'))
        get('span:nth-of-type(8)').should(haveAttribute('aria-selected', 'false'))
    }
)

test('non-boolean attributes set to null/undefined/false are removed from the element',
    html`
        <div data-signal="{}">
            <a href="#hello" data-bind:href="null">null</a>
            <a href="#hello" data-bind:href="false">false</a>
            <a href="#hello" data-bind:href="undefined">undefined</a>
            <!-- custom attribute see https://github.com/alpinejs/alpine/issues/280 -->
            <span visible="true" data-bind:visible="null">null</span>
            <span visible="true" data-bind:visible="false">false</span>
            <span visible="true" data-bind:visible="undefined">undefined</span>

            <span hidden="true" data-bind:hidden="null">null</span>
            <span hidden="true" data-bind:hidden="false">false</span>
            <span hidden="true" data-bind:hidden="undefined">undefined</span>
        </div>
    `,
    ({ get }) => {
        get('a:nth-of-type(1)').should(notHaveAttribute('href'))
        get('a:nth-of-type(2)').should(notHaveAttribute('href'))
        get('a:nth-of-type(3)').should(notHaveAttribute('href'))
        get('span:nth-of-type(1)').should(notHaveAttribute('visible'))
        get('span:nth-of-type(2)').should(notHaveAttribute('visible'))
        get('span:nth-of-type(3)').should(notHaveAttribute('visible'))
        get('span:nth-of-type(4)').should(notHaveAttribute('hidden'))
        get('span:nth-of-type(5)').should(notHaveAttribute('hidden'))
        get('span:nth-of-type(6)').should(notHaveAttribute('hidden'))
    }
)

test('non-boolean empty string attributes are not removed',
    html`
        <div data-signal>
            <a href="#hello" data-bind:href="''"></a>
        </div>
    `,
    ({ get }) => get('a').should(haveAttribute('href', ''))
)

test('boolean attribute values are set to their attribute name if true and removed if false',
    html`
        <div data-signal="{ isSet: true }">
            <span @click="isSet = false" id="setToFalse">Set To False</span>

            <input data-bind:disabled="isSet"></input>
            <input data-bind:checked="isSet"></input>
            <input data-bind:required="isSet"></input>
            <input data-bind:readonly="isSet"></input>
            <details data-bind:open="isSet"></details>
            <select data-bind:multiple="isSet"></select>
            <option data-bind:selected="isSet"></option>
            <textarea data-bind:autofocus="isSet"></textarea>
            <dl data-bind:itemscope="isSet"></dl>
            <form 
                data-bind:novalidate="isSet"
                data-bind:inert="isSet"
            ></form>
            <iframe
                data-bind:allowfullscreen="isSet"
            ></iframe>
            <button data-bind:formnovalidate="isSet"></button>
            <audio
                data-bind:autoplay="isSet"
                data-bind:controls="isSet"
                data-bind:loop="isSet"
                data-bind:muted="isSet"
            ></audio>
            <video data-bind:playsinline="isSet"></video>
            <track data-bind:default="isSet" />
            <img data-bind:ismap="isSet" />
            <ol data-bind:reversed="isSet"></ol>
            <template 
                data-bind:shadowrootclonable="isSet"
                data-bind:shadowrootdelegatesfocus="isSet"
                data-bind:shadowrootserializable="isSet"
            ></template>
        </div>
    `,
    ({ get }) => {
        get('input:nth-of-type(1)').should(haveAttribute('disabled', 'disabled'))
        get('input:nth-of-type(2)').should(haveAttribute('checked', 'checked'))
        get('input:nth-of-type(3)').should(haveAttribute('required', 'required'))
        get('input:nth-of-type(4)').should(haveAttribute('readonly', 'readonly'))
        get('details').should(haveAttribute('open', 'open'))
        get('select').should(haveAttribute('multiple', 'multiple'))
        get('option').should(haveAttribute('selected', 'selected'))
        get('textarea').should(haveAttribute('autofocus', 'autofocus'))
        get('dl').should(haveAttribute('itemscope', 'itemscope'))
        get('form').should(haveAttribute('novalidate', 'novalidate'))
        get('iframe').should(haveAttribute('allowfullscreen', 'allowfullscreen'))
        get('button').should(haveAttribute('formnovalidate', 'formnovalidate'))
        get('audio').should(haveAttribute('autoplay', 'autoplay'))
        get('audio').should(haveAttribute('controls', 'controls'))
        get('audio').should(haveAttribute('loop', 'loop'))
        get('audio').should(haveAttribute('muted', 'muted'))
        get('video').should(haveAttribute('playsinline', 'playsinline'))
        get('track').should(haveAttribute('default', 'default'))
        get('img').should(haveAttribute('ismap', 'ismap'))
        get('ol').should(haveAttribute('reversed', 'reversed'))
        get('template').should(haveAttribute('shadowrootclonable', 'shadowrootclonable'))
        get('template').should(haveAttribute('shadowrootdelegatesfocus', 'shadowrootdelegatesfocus'))
        get('template').should(haveAttribute('shadowrootserializable', 'shadowrootserializable'))

        get('#setToFalse').click()

        get('input:nth-of-type(1)').should(notHaveAttribute('disabled'))
        get('input:nth-of-type(2)').should(notHaveAttribute('checked'))
        get('input:nth-of-type(3)').should(notHaveAttribute('required'))
        get('input:nth-of-type(4)').should(notHaveAttribute('readonly'))
        get('details').should(notHaveAttribute('open'))
        get('select').should(notHaveAttribute('multiple'))
        get('option').should(notHaveAttribute('selected'))
        get('textarea').should(notHaveAttribute('autofocus'))
        get('dl').should(notHaveAttribute('itemscope'))
        get('form').should(notHaveAttribute('novalidate'))
        get('iframe').should(notHaveAttribute('allowfullscreen'))
        get('iframe').should(notHaveAttribute('allowpaymentrequest'))
        get('button').should(notHaveAttribute('formnovalidate'))
        get('audio').should(notHaveAttribute('autoplay'))
        get('audio').should(notHaveAttribute('controls'))
        get('audio').should(notHaveAttribute('loop'))
        get('audio').should(notHaveAttribute('muted'))
        get('video').should(notHaveAttribute('playsinline'))
        get('track').should(notHaveAttribute('default'))
        get('img').should(notHaveAttribute('ismap'))
        get('ol').should(notHaveAttribute('reversed'))
        get('script').should(notHaveAttribute('async'))
        get('script').should(notHaveAttribute('defer'))
        get('script').should(notHaveAttribute('nomodule'))
    }
)

test('boolean empty string attributes are not removed',
    html`
        <div data-signal="{}">
            <input data-bind:disabled="''">
        </div>
    `,
    ({ get }) => get('input').should(haveAttribute('disabled', 'disabled'))
)

test('binding supports short syntax',
    html`
        <div data-signal="{ foo: 'bar' }">
            <span :class="foo"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveClasses(['bar']))
)

test('checkbox is unchecked by default',
    html`
        <div data-signal="{foo: {bar: 'baz'}}">
            <input type="checkbox" data-bind:value="''"></input>
            <input type="checkbox" data-bind:value="'test'"></input>
            <input type="checkbox" data-bind:value="foo.bar"></input>
            <input type="checkbox" data-bind:value="0"></input>
            <input type="checkbox" data-bind:value="10"></input>
        </div>
    `,
    ({ get }) => {
        get('input:nth-of-type(1)').should(notBeChecked())
        get('input:nth-of-type(2)').should(notBeChecked())
        get('input:nth-of-type(3)').should(notBeChecked())
        get('input:nth-of-type(4)').should(notBeChecked())
        get('input:nth-of-type(5)').should(notBeChecked())
    }
)

test('radio is unchecked by default',
    html`
        <div data-signal="{foo: {bar: 'baz'}}">
            <input type="radio" data-bind:value="''"></input>
            <input type="radio" data-bind:value="'test'"></input>
            <input type="radio" data-bind:value="foo.bar"></input>
            <input type="radio" data-bind:value="0"></input>
            <input type="radio" data-bind:value="10"></input>
        </div>
    `,
    ({ get }) => {
        get('input:nth-of-type(1)').should(notBeChecked())
        get('input:nth-of-type(2)').should(notBeChecked())
        get('input:nth-of-type(3)').should(notBeChecked())
        get('input:nth-of-type(4)').should(notBeChecked())
        get('input:nth-of-type(5)').should(notBeChecked())
    }
)

test('checkbox values are set correctly',
    html`
        <div data-signal="{ stringValue: 'foo', trueValue: true, falseValue: false }">
            <input type="checkbox" name="stringCheckbox" :value="stringValue" />
            <input type="checkbox" name="trueCheckbox" :value="trueValue" />
            <input type="checkbox" name="falseCheckbox" :value="falseValue" />
        </div>
    `,
    ({ get }) => {
        get('input:nth-of-type(1)').should(haveValue('foo'))
        get('input:nth-of-type(2)').should(haveValue('on'))
        get('input:nth-of-type(3)').should(haveValue('on'))
    }
)

test('radio values are set correctly',
    html`
        <div data-signal="{lists: [{id: 1}, {id: 8}], selectedListID: '8'}">
            <template data-for="list in lists" :key="list.id">
                <input data-model="selectedListID" type="radio" :value="list.id.toString()" :id="'list-' + list.id">
            </template>
            <input type="radio" id="list-test" value="test" data-model="selectedListID">
        </div>
    `,
    ({ get }) => {
        get('#list-1').should(haveValue('1'))
        get('#list-1').should(notBeChecked())
        get('#list-8').should(haveValue('8'))
        get('#list-8').should(beChecked())
        get('#list-test').should(haveValue('test'))
        get('#list-test').should(notBeChecked())
    }
)

test('.camel modifier correctly sets name of attribute',
    html`
        <div data-signal>
            <svg data-bind:view-box.camel="'0 0 42 42'"></svg>
        </div>
    `,
    ({ get }) => get('svg').should(haveAttribute('viewBox', '0 0 42 42'))
)

test('attribute binding names can contain numbers',
    html`
        <svg data-signal>
            <line x1="1" y1="2" :x2="3" data-bind:y2="4" />
        </svg>
    `,
    ({ get }) => {
        get('line').should(haveAttribute('x2', '3'))
        get('line').should(haveAttribute('y2', '4'))
    }
)

test('non-string and non-boolean attributes are cast to string when bound to checkbox',
    html`
        <div data-signal="{ number: 100, zero: 0, bool: true, nullProp: null }">
            <input type="checkbox" id="number" :value="number">
            <input type="checkbox" id="zero" :value="zero">
            <input type="checkbox" id="boolean" :value="bool">
            <input type="checkbox" id="null" :value="nullProp">
        </div>
    `,
    ({ get }) => {
        get('input:nth-of-type(1)').should(haveValue('100'))
        get('input:nth-of-type(2)').should(haveValue('0'))
        get('input:nth-of-type(3)').should(haveValue('on'))
        get('input:nth-of-type(4)').should(haveValue('on'))
    }
)

test('can bind an object of directives',
    html`
        <script>
            window.modal = function () {
                return {
                    foo: 'bar',
                    trigger: {
                        ['data-on:click']() { this.foo = 'baz' },
                    },
                    dialogue: {
                        ['data-text']() { return this.foo },
                    },
                }
            }
        </script>

        <div data-signal="window.modal()">
            <button data-bind="trigger">Toggle</button>

            <span data-bind="dialogue">Modal Body</span>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('bar'))
        get('button').click()
        get('span').should(haveText('baz'))
    }
)

test('data-bind object syntax supports normal HTML attributes',
    html`
        <span data-signal data-bind="{ foo: 'bar' }"></span>
    `,
    ({ get }) => {
        get('span').should(haveAttribute('foo', 'bar'))
    }
)

test('data-bind object syntax supports normal HTML attributes mixed in with dynamic ones',
    html`
        <span data-signal data-bind="{ 'data-bind:bob'() { return 'lob'; }, foo: 'bar', 'data-bind:bab'() { return 'lab' } }"></span>
    `,
    ({ get }) => {
        get('span').should(haveAttribute('foo', 'bar'))
        get('span').should(haveAttribute('bob', 'lob'))
        get('span').should(haveAttribute('bab', 'lab'))
    }
)

test('data-bind object syntax supports data-for',
    html`
        <script>
            window.todos = () => { return {
                todos: ['foo', 'bar'],
                outputForExpression: {
                    ['data-for']: 'todo in todos',
                }
            }}
        </script>
        <div data-signal="window.todos()">
            <ul>
                <template data-bind="outputForExpression">
                    <li data-text="todo"></li>
                </template>
            </ul>
        </div>
    `,
    ({ get }) => {
        get('li:nth-of-type(1)').should(haveText('foo'))
        get('li:nth-of-type(2)').should(haveText('bar'))
    }
)

test('data-bind object syntax syntax supports data-transition',
    html`
        <style>
            .transition { transition-property: background-color, border-color, color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
            .duration-100 { transition-duration: 100ms; }
        </style>
        <script>
            window.transitions = () => { return {
                show: true,
                outputClickExpression: {
                    ['@click']() { this.show = false },
                    ['data-text']() { return 'Click Me' },
                },
                outputTransitionExpression: {
                    ['data-show']() { return this.show },
                    ['data-transition:enter']: 'transition duration-100',
                    ['data-transition:leave']: 'transition duration-100',
                },
            }}
        </script>
        <div data-signal="transitions()">
            <button data-bind="outputClickExpression"></button>

            <span data-bind="outputTransitionExpression">thing</span>
        </div>
    `,
    ({ get }) => {
        get('span').should(beVisible())
        get('button').click()
        get('span').should(beVisible())
        get('span').should(beHidden())
    }
)

test('data-bind object syntax event handlers defined as functions receive the event object as their first argument',
    html`
        <script>
            window.data = () => { return {
                button: {
                    ['@click'](event) {
                        this.$refs.span.innerText = event.currentTarget.id
                    }
                }
            }}
        </script>
        <div data-signal="window.data()">
            <button data-bind="button" id="bar">click me</button>

            <span data-ref="span">foo</span>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('foo'))
        get('button').click()
        get('span').should(haveText('bar'))
    }
)

test('data-bind object syntax event handlers defined as functions receive element bound sprites',
    html`
        <script>
            window.data = () => { return {
                button: {
                    ['@click']() {
                        this.$refs.span.innerText = this.$el.id
                    }
                }
            }}
        </script>
        <div data-signal="window.data()">
            <button data-bind="button" id="bar">click me</button>

            <span data-ref="span">foo</span>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('foo'))
        get('button').click()
        get('span').should(haveText('bar'))
    }
)

test('Can retrieve Alpine bound data with global bound method',
    html`
        <div id="1" data-signal foo="bar" data-text="Alpine.bound($el, 'foo')"></div>
        <div id="2" data-signal :foo="'bar'" data-text="Alpine.bound($el, 'foo')"></div>
        <div id="3" data-signal foo data-text="Alpine.bound($el, 'foo')"></div>
        <div id="4" data-signal disabled data-text="Alpine.bound($el, 'disabled')"></div>
        <div id="5" data-signal data-text="Alpine.bound($el, 'foo')"></div>
        <div id="6" data-signal data-text="Alpine.bound($el, 'foo', 'bar')"></div>
    `,
    ({ get }) => {
        get('#1').should(haveText('bar'))
        get('#2').should(haveText('bar'))
        get('#3').should(haveText('true'))
        get('#4').should(haveText('true'))
        get('#5').should(haveText(''))
        get('#6').should(haveText('bar'))
    }
)

test('Can extract Alpine bound data as a data prop',
    html`
        <div data-signal="{ foo: 'bar' }">
            <div id="1" data-signal="{ init() { this.$el.textContent = Alpine.extractProp(this.$el, 'foo') }}" :foo="foo"></div>
            <div id="2" data-signal="{ init() { this.$el.textContent = Alpine.extractProp(this.$el, 'foo', null, false) }}" :foo="foo"></div>
        </div>
    `,
    ({ get }) => {
        get('#1').should(haveText('bar'))
        get('#1').should(notHaveAttribute('foo'))
        get('#2').should(haveText('bar'))
        get('#2').should(haveAttribute('foo', 'bar'))
    }
)

test('data-bind updates checked attribute and property after user interaction',
    html`
        <div data-signal="{ checked: true }">
            <button @click="checked = !checked">toggle</button>
            <input type="checkbox" data-bind:checked="checked" @change="checked = $event.target.checked" />
        </div>
    `,
    ({ get }) => {
        get('input').should(haveAttribute('checked', 'checked'))
        get('input').should(haveProperty('checked', true))
        get('input').click()
        get('input').should(notHaveAttribute('checked'))
        get('input').should(haveProperty('checked', false))
        get('button').click()
        get('input').should(haveAttribute('checked', 'checked'))
        get('input').should(haveProperty('checked', true))
    }
)
