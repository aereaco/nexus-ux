import { exist, haveText, html, notExist, test } from '../../utils'

test('data-if',
    html`
        <div data-data="{ show: false }">
            <button @click="show = ! show">Toggle</button>

            <template data-if="show">
                <h1>Toggle Me</h1>
            </template>
        </div>
    `,
    ({ get }) => {
        get('h1').should(notExist())
        get('button').click()
        get('h1').should(exist())
        get('button').click()
        get('h1').should(notExist())
    }
)

test('data-if inside data-for allows nested directives',
    html`
        <div data-data="{items: [{id: 1, label: '1'}]}">

            <template data-for="item in items" :key="item.id">
                <div>
                    <template data-if="item.label">
                        <span data-text="item.label"></span>
                    </template>
                </div>
            </template>
        </div>
    `,
    ({ get }) => {
        get('span').should(haveText('1'))
    }
)

test('data-if initializes after being added to the DOM to allow data-ref to work',
    html`
        <div data-data="{}">
            <template data-if="true">
                <ul data-ref="listbox" data-foo="bar">
                    <li data-text="$refs.listbox.dataset.foo"></li>
                </ul>
            </template>
        </div>
    `,
    ({ get }) => {
        get('li').should(haveText('bar'))
    }
)

// If data-if evaluates to false, the expectation is that no sub-expressions will be evaluated.
test('data-if removed dom does not evaluate reactive expressions in dom tree',
    html`
    <div data-data="{user: {name: 'lebowski'}}">
        <button @click="user = null">Log out</button>
        <template data-if="user">
            <span data-text="user.name"></span>
        </template>

    </div>
    `,
    ({ get }) => {
        get('span').should(haveText('lebowski'))

        // Clicking button sets user=null and thus data-if="user" will evaluate to false.
        // If the sub-expression data-text="user.name" is evaluated, the button click
        // will produce an error because user is no longer defined and the test will fail
        get('button').click()
        get('span').should(notExist())
    }
)

// Attempting to skip an already-flushed reactive effect would cause inconsistencies when updating other effects.
// See https://github.com/alpinejs/alpine/issues/2803 for more details.
test('data-if removed dom does not attempt skipping already-processed reactive effects in dom tree',
    html`
    <div data-data="{
        isEditing: true,
        foo: 'random text',
        stopEditing() {
          this.foo = '';
          this.isEditing = false;
        },
    }">
        <button @click="stopEditing">Stop editing</button>
        <template data-if="isEditing">
            <div id="div-editing">
              <h2>Editing</h2>
              <input id="foo" name="foo" type="text" data-model="foo" />
            </div>
        </template>

        <template data-if="!isEditing">
            <div id="div-not-editing"><h2>Not editing</h2></div>
        </template>

        <template data-if="!isEditing">
            <div id="div-also-not-editing"><h2>Also not editing</h2></div>
        </template>
    </div>
    `,
    ({ get }) => {
        get('button').click()
        get('div#div-editing').should(notExist())
        get('div#div-not-editing').should(exist())
        get('div#div-also-not-editing').should(exist())
    }
)

// If data-if evaluates to false, all cleanups in the tree should be handled.
test('data-if eagerly cleans tree',
    html`
        <div data-data="{ show: false, count: 0 }">
            <button @click="show^=true" data-text="count">Toggle</button>
            <template data-if="show">
                <div>
                <template data-if="true">
                    <p data-effect="if (show) count++">
                    hello
                    </p>
                </template>
                </div>
            </template>
        </div>
    `,
    ({ get }) => {
        get('button').should(haveText('0'))
        get('button').click()
        get('button').should(haveText('1'))
        get('button').click()
        get('button').should(haveText('1'))
        get('button').click()
        get('button').should(haveText('2'))
        get('button').click()
        get('button').should(haveText('2'))
        get('button').click()
        get('button').should(haveText('3'))
        get('button').click()
        get('button').should(haveText('3'))
        get('button').click()
        get('button').should(haveText('4'))
        get('button').click()
        get('button').should(haveText('4'))
    }
)