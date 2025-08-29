import { haveText, test, html, haveFocus, notHaveAttribute, haveAttribute, notHaveFocus, notHaveText } from '../../utils'

test('can trap focus',
    [html`
        <div data-data="{ open: false }">
            <input type="text" id="1">
            <button id="2" @click="open = true">open</button>
            <div>
                <div data-trap="open">
                    <input type="text" id="3">
                    <button @click="open = false" id="4">close</button>
                </div>
            </div>
        </div>
    `],
    ({ get }, reload) => {
        get('#1').click()
        get('#1').should(haveFocus())
        get('#2').click()
        get('#3').should(haveFocus())
        cy.focused().tab()
        get('#4').should(haveFocus())
        cy.focused().tab()
        get('#3').should(haveFocus())
        cy.focused().tab({shift: true})
        get('#4').should(haveFocus())
        cy.focused().click()
        get('#2').should(haveFocus())
    },
)

test('works with clone',
    [html`
        <div id="foo" data-data="{
            open: false,
            triggerClone() {
                var original = document.getElementById('foo');
                var copy = original.cloneNode(true);
                Alpine.clone(original, copy);
                var p = document.createElement('p');
                p.textContent = 'bar';
                copy.appendChild(p);
                original.parentNode.replaceChild(copy, original);
            }
        }">
            <button id="one" @click="open = true">Trap</button>

            <div data-trap="open">
                <input type="text">
                <button id="two" @click="triggerClone()">Test</button>
            </div>
        </div>
    `],
    ({ get, wait }, reload) => {
        get('#one').click()
        get('#two').click()
        get('p').should(haveText('bar'))
    }
)

test('releases focus when data-if is destroyed',
    [html`
        <div data-data="{ open: false }">
            <button id="1" @click="open = true">open</button>
            <template data-if="open">
                <div data-trap="open">
                    <button @click="open = false" id="2">close</button>
                </div>
            </template>
        </div>
    `],
    ({ get }, reload) => {
        get('#1').click()
        get('#2').should(haveFocus())
        get('#2').click()
        get('#1').should(haveFocus())
    },
)

test('can trap focus with inert',
    [html`
        <div data-data="{ open: false }">
            <h1>I should have aria-hidden when outside trap</h1>

            <button id="open" @click="open = true">open</button>

            <div data-trap.inert="open">
                <button @click="open = false" id="close">close</button>
            </div>
        </div>
    `],
    ({ get }, reload) => {
        get('#open').should(notHaveAttribute('aria-hidden', 'true'))
        get('#open').click()
        get('#open').should(haveAttribute('aria-hidden', 'true'))
        get('#close').click()
        get('#open').should(notHaveAttribute('aria-hidden', 'true'))
    },
)

test('inert only applies aria-hidden once',
    [html`
        <div>
            <div id="sibling">I should have aria-hidden applied once</div>
            <div data-data="{
                open: false,
                timesApplied: 0,
                init() {
                    let observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
                                this.timesApplied++
                            }
                        })
                    })

                    observer.observe(document.querySelector('#sibling'), {
                        attributes: true
                    })
                },
            }">
                <input type="text" id="timesApplied" data-model="timesApplied" />
                <button id="trigger" @click="open = true">open</button>
                <div data-trap.inert="open">
                    Hello, I'm a friendly modal!
                </div>
            </div>
        </div>
    `],
    ({ get }, reload) => {
        get('#trigger').click()
        get('#timesApplied').should('have.value', '1')
    },
)

test('can trap focus with noscroll',
    [html`
        <div data-data="{ open: false }">
            <button id="open" @click="open = true">open</button>

            <div data-trap.noscroll="open">
                <button @click="open = false" id="close">close</button>
            </div>

            <div style="height: 100vh">&nbsp;</div>
        </div>
    `],
    ({ get, window }, reload) => {
        window().then((win) => {
            let scrollbarWidth = win.innerWidth - win.document.documentElement.clientWidth
            get('#open').click()
            get('html').should(haveAttribute('style', `overflow: hidden; padding-right: ${scrollbarWidth}px;`))
            get('#close').click()
            get('html').should(notHaveAttribute('style', `overflow: hidden; padding-right: ${scrollbarWidth}px;`))
        })
    },
)

test('can trap focus with noreturn',
    [html`
        <div data-data="{ open: false }" data-trap.noreturn="open">
            <input id="input" @focus="open = true">
            <div data-show="open">
                <button @click="open = false" id="close">close</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('#input').focus()
        get('#close')
        get('#close').click()
        get('#input').should(notHaveFocus())
    },
)

test('$focus.focus',
    [html`
        <div data-data>
            <button id="press-me" @click="$focus.focus(document.querySelector('#focus-me'))">Focus Other</button>

            <button id="focus-me">Other</button>
        </div>
    `],
    ({ get }) => {
        get('#focus-me').should(notHaveFocus())
        get('#press-me').click()
        get('#focus-me').should(haveFocus())
    },
)

test('$focus.focusable',
    [html`
        <div data-data>
            <div id="1" data-text="$focus.focusable($el)"></div>
            <button id="2" data-text="$focus.focusable($el)"></button>
        </div>
    `],
    ({ get }) => {
        get('#1').should(haveText('false'))
        get('#2').should(haveText('true'))
    },
)

test('$focus.focusables',
    [html`
        <div data-data>
            <h1 data-text="$focus.within($refs.container).focusables().length"></h1>
            <div data-ref="container">
                <button>1</button>
                <div>2</div>
                <button>3</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('h1').should(haveText('2'))
    },
)

test('$focus.focused',
    [html`
        <div data-data>
            <button @click="$el.textContent = $el.isSameNode($focus.focused())">im-focused</button>
        </div>
    `],
    ({ get }) => {
        get('button').click()
        get('button').should(haveText('true'))
    },
)

test('$focus.lastFocused',
    [html`
        <div data-data>
            <button id="1" data-ref="first">first-focused</button>
            <button id="2" @click="$el.textContent = $refs.first.isSameNode($focus.lastFocused())">second-focused</button>
        </div>
    `],
    ({ get }) => {
        get('#1').click()
        get('#2').click()
        get('#2').should(haveText('true'))
    },
)

test('$focus.within',
    [html`
        <div data-data>
            <button id="1" data-text="$focus.within($refs.first).focusables().length"></button>

            <div data-ref="first">
                <button>1</button>
                <button>2</button>
            </div>

            <div>
                <button>1</button>
                <button>2</button>
                <button>3</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('#1').should(haveText('2'))
    },
)

test('$focus.next',
    [html`
        <div data-data>
            <div data-ref="first">
                <button id="1" @click="$focus.within($refs.first).next(); $nextTick(() => $el.textContent = $focus.focused().textContent)">1</button>
                <button>2</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('#1').click()
        get('#1').should(haveText('2'))
    },
)

test('$focus.prev',
    [html`
        <div data-data>
            <div data-ref="first">
                <button>2</button>
                <button id="1" @click="$focus.within($refs.first).prev(); $nextTick(() => $el.textContent = $focus.focused().textContent)">1</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('#1').click()
        get('#1').should(haveText('2'))
    },
)

test('$focus.wrap',
    [html`
        <div data-data>
            <div data-ref="first">
                <button>2</button>
                <button id="1" @click="$focus.within($refs.first).wrap().next(); $nextTick(() => $el.textContent = $focus.focused().textContent)">1</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('#1').click()
        get('#1').should(haveText('2'))
    },
)

test('$focus.first',
    [html`
        <div data-data>
            <button id="1" @click="$focus.within($refs.first).first(); $nextTick(() => $el.textContent = $focus.focused().textContent)">1</button>

            <div data-ref="first">
                <button>2</button>
                <button>3</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('#1').click()
        get('#1').should(haveText('2'))
    },
)

test('$focus.last',
    [html`
        <div data-data>
            <button id="1" @click="$focus.within($refs.first).last(); $nextTick(() => $el.textContent = $focus.focused().textContent)">1</button>

            <div data-ref="first">
                <button>2</button>
                <button>3</button>
            </div>
        </div>
    `],
    ({ get }) => {
        get('#1').click()
        get('#1').should(haveText('3'))
    },
)

test('focuses element with autofocus',
    [html`
        <div data-data="{ open: false }">
            <input type="text" id="1">
            <button id="2" @click="open = true">open</button>
            <div>
                <div data-trap="open">
                    <input type="text" id="3">
                    <input autofocus type="text" id="4">
                    <button @click="open = false" id="5">close</button>
                </div>
            </div>
        </div>
    `],
    ({ get }) => {
        get('#1').click()
        get('#1').should(haveFocus())
        get('#2').click()
        get('#4').should(haveFocus())
        cy.focused().tab()
        get('#5').should(haveFocus())
        cy.focused().tab()
        get('#3').should(haveFocus())
    }
)

test('can disable data-trap autofocus with .noautofocus modifier',
    [html`
        <div data-data="{ open: false }">
            <input type="text" id="1">
            <button id="2" @click="open = true">open</button>
            <div>
                <div data-trap.noautofocus="open">
                    <input type="text" id="3">
                    <input autofocus type="text" id="4">
                    <button @click="open = false" id="5">close</button>
                </div>
            </div>
        </div>
    `],
    ({ get }) => {
        get('#1').click()
        get('#1').should(haveFocus())
        get('#2').click()
        get('#4').should(notHaveFocus())
        cy.focused().tab()
        get('#3').should(haveFocus())
        cy.focused().tab({shift: true})
        get('#5').should(haveFocus())
        cy.focused().click()
        get('#2').should(haveFocus())
    }
)
