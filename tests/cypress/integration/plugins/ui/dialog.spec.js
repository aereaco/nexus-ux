import { beVisible, haveAttribute, haveText, html, notBeVisible, notExist, test } from '../../../utils'

test('has accessibility attributes',
    [html`
        <div data-data="{ open: false }">
            <button @click="open = ! open">Toggle</button>

            <article data-dialog data-model="open">
                Dialog Contents!
            </article>
        </div>
    `],
    ({ get }) => {
        get('article').should(haveAttribute('role', 'dialog'))
        get('article').should(haveAttribute('aria-modal', 'true'))
    },
)

test('works with data-model',
    [html`
        <div data-data="{ open: false }">
            <button @click="open = ! open">Toggle</button>

            <article data-dialog data-model="open">
                Dialog Contents!
            </article>
        </div>
    `],
    ({ get }) => {
        get('article').should(notBeVisible())
        get('button').click()
        get('article').should(beVisible())
        get('button').click()
        get('article').should(notBeVisible())
    },
)

test('works with open prop and close event',
    [html`
        <div data-data="{ open: false }">
            <button @click="open = ! open">Toggle</button>

            <article data-dialog :open="open" @close="open = false">
                Dialog Contents!
            </article>
        </div>
    `],
    ({ get }) => {
        get('article').should(notBeVisible())
        get('button').click()
        get('article').should(beVisible())
    },
)

test('works with static prop',
    [html`
        <div data-data="{ open: false }">
            <button @click="open = ! open">Toggle</button>

            <template data-if="open">
                <article data-dialog static>
                    Dialog Contents!
                </article>
            </template>
        </div>
    `],
    ({ get }) => {
        get('article').should(notExist())
        get('button').click()
        get('article').should(beVisible())
    },
)

test('pressing escape closes modal',
    [html`
        <div data-data="{ open: false }">
            <button @click="open = ! open">Toggle</button>

            <article data-dialog data-model="open">
                Dialog Contents!
                <input type="text">
            </article>
        </div>
    `],
    ({ get }) => {
        get('article').should(notBeVisible())
        get('button').click()
        get('article').should(beVisible())
        get('input').type('{esc}')
        get('article').should(notBeVisible())
    },
)

test('data-dialog:panel allows for click away',
    [html`
        <div data-data="{ open: true }">
            <h1>Click away on me</h1>

            <article data-dialog data-model="open">
                <div data-dialog:panel>
                    Dialog Contents!
                </div>
            </article>
        </div>
    `],
    ({ get }) => {
        get('article').should(beVisible())
        get('h1').click()
        get('article').should(notBeVisible())
    },
)

test('data-dialog:overlay closes dialog when clicked on',
    [html`
        <div data-data="{ open: true }">
            <h1>Click away on me</h1>

            <article data-dialog data-model="open">
                <main data-dialog:overlay>
                    Some Overlay
                </main>

                <div>
                    Dialog Contents!
                </div>
            </article>
        </div>
    `],
    ({ get }) => {
        get('article').should(beVisible())
        get('h1').click()
        get('article').should(beVisible())
        get('main').click()
        get('article').should(notBeVisible())
    },
)

test('data-dialog:title',
    [html`
        <article data-data data-dialog>
            <h1 data-dialog:title>Dialog Title</h1>
        </article>
    `],
    ({ get }) => {
        get('article').should(haveAttribute('aria-labelledby', 'alpine-dialog-title-1'))
        get('h1').should(haveAttribute('id', 'alpine-dialog-title-1'))
    },
)

test('data-dialog:description',
    [html`
        <article data-data data-dialog>
            <p data-dialog:description>Dialog Title</p>
        </article>
    `],
    ({ get }) => {
        get('article').should(haveAttribute('aria-describedby', 'alpine-dialog-description-1'))
        get('p').should(haveAttribute('id', 'alpine-dialog-description-1'))
    },
)

test('$modal.open exposes internal "open" state',
    [html`
        <div data-data="{ open: false }">
            <button @click="open = ! open">Toggle</button>

            <article data-dialog data-model="open">
                Dialog Contents!
                <h2 data-text="$dialog.open"></h2>
            </article>
        </div>
    `],
    ({ get }) => {
        get('h2').should(haveText('false'))
        get('button').click()
        get('h2').should(haveText('true'))
    },
)

test('works with data-teleport',
    [html`
        <div data-data="{ open: false }">
            <button @click="open = ! open">Toggle</button>

            <template data-teleport="body">
                <article data-dialog data-model="open">
                    Dialog Contents!
                </article>
            </template>
        </div>
    `],
    ({ get }) => {
        get('article').should(notBeVisible())
        get('button').click()
        get('article').should(beVisible())
        get('button').click()
        get('article').should(notBeVisible())
    },
)

// Skipping these two tests as anything focus related seems to be flaky
// with cypress, but fine in a real browser.
// test('data-dialog traps focus'...
// test('initial-focus prop'...
