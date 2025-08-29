import { beHidden, beVisible, haveText, beChecked, haveAttribute, haveClasses, haveValue, notBeChecked, notHaveAttribute, notHaveClasses, test, html } from '../../utils'

test('class attribute bindings are merged by string syntax',
    html`
        <div data-signal="{ isOn: false }">
            <span class="foo" data-bind:class="isOn ? 'bar': ''"></span>

            <button @click="isOn = ! isOn">button</button>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveClasses(['foo']))
        get('span').should(notHaveClasses(['bar']))
        get('button').click()
        get('span').should(haveClasses(['foo']))
        get('span').should(haveClasses(['bar']))
    }
)

test('class attribute bindings are added by string syntax',
    html`
        <div data-signal="{ initialClass: 'foo' }">
            <span data-bind:class="initialClass"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveClasses(['foo']))
)

test('class attribute bindings are added by array syntax',
    html`
        <div data-signal="{ initialClass: 'foo' }">
            <span data-bind:class="[initialClass, 'bar']"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveClasses(['foo', 'bar']))
)

test('class attribute bindings are added by object syntax',
    html`
        <div data-signal="{ mode: 0 }">
            <span class="foo baz"
                  data-bind:class="{
                      'foo bar border-blue-900' : mode === 0,
                      'foo bar border-red-900' : mode === 1,
                      'bar border-red-900' : mode === 2,
                  }"
            ></span>

            <button @click="mode = (mode + 1) % 3">button</button>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveClasses(['foo', 'baz']))
        get('span').should(haveClasses(['bar', 'border-blue-900']))
        get('span').should(notHaveClasses(['border-red-900']))
        get('button').click()
        get('span').should(haveClasses(['foo', 'baz']))
        get('span').should(haveClasses(['bar', 'border-red-900']))
        get('span').should(notHaveClasses(['border-blue-900']))
        get('button').click()
        get('span').should(haveClasses(['baz']))
        get('span').should(haveClasses(['bar', 'border-red-900']))
        get('span').should(notHaveClasses(['foo']))
        get('span').should(notHaveClasses(['border-blue-900']))
    }
)

test('classes are removed before being added',
    html`
        <div data-signal="{ isOpen: true }">
            <span class="text-red" :class="isOpen ? 'block' : 'hidden'">
                Span
            </span>
            <button @click="isOpen = !isOpen">click me</button>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveClasses(['block', 'text-red']))
        get('button').click()
        get('span').should(haveClasses(['hidden', 'text-red']))
        get('span').should(notHaveClasses(['block']))
    }
)

test('extra whitespace in class binding string syntax is ignored',
    html`
        <div data-signal>
            <span data-bind:class="'  foo  bar  '"></span>
        </div>
    `,
    ({ get }) => get('span').should(haveClasses(['foo', 'bar']))
)

test('undefined class binding resolves to empty string',
    html`
        <div data-signal="{ errorClass: (hasError) => { if (hasError) { return 'red' } } }">
            <span id="error" data-bind:class="errorClass(true)">should be red</span>
            <span id="empty" data-bind:class="errorClass(false)">should be empty</span>
        </div>
    `,
    ({ get }) => {
        get('span:nth-of-type(1)').should(haveClasses(['red']))
        get('span:nth-of-type(2)').should(notHaveClasses(['red']))
    }
)
