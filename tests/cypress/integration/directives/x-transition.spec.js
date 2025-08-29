import { beHidden, beVisible, haveClasses, haveComputedStyle, html, notBeVisible, notHaveClasses, notHaveComputedStyle, test } from '../../utils'

test('transition in',
    html`
        <style>
            .transition { transition-property: background-color, border-color, color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
            .duration-100 { transition-duration: 100ms; }
        </style>
        <div data-data="{ show: false }">
            <button data-on:click="show = ! show"></button>

            <span
                data-show="show"
                data-transition:enter="transition duration-100 enter"
                data-transition:enter-start="enter-start"
                data-transition:enter-end="enter-end"
            >thing</span>
        </div>
    `,
    ({ get }) => {
        get('span').should(beHidden())
        get('span').should(notHaveClasses(['enter', 'enter-start', 'enter-end']))
        get('button').click()
        get('span').should(beVisible())
        get('span').should(notHaveClasses(['enter-start']))
        get('span').should(haveClasses(['enter', 'enter-end']))
    }
)

test('transition out',
    html`
        <style>
            .transition { transition-property: background-color, border-color, color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
            .duration-100 { transition-duration: 100ms; }
        </style>
        <div data-data="{ show: true }">
            <button data-on:click="show = ! show"></button>

            <span
                data-show="show"
                data-transition:leave="transition duration-100 leave"
                data-transition:leave-start="leave-start"
                data-transition:leave-end="leave-end"
            >thing</span>
        </div>
    `,
    ({ get }) => {
        get('span').should(beVisible())
        get('span').should(notHaveClasses(['leave', 'leave-start', 'leave-end']))
        get('button').click()
        get('span').should(beVisible())
        get('span').should(notHaveClasses(['leave-start']))
        get('span').should(haveClasses(['leave', 'leave-end']))
        get('span').should(beHidden())
    }
)

test('transition:enter in nested data-show visually runs',
    html`
        <style>
            .transition { transition: opacity 1s ease; }
            .opacity-0 {opacity: 0}
            .opacity-1 {opacity: 1}
        </style>
        <div data-data="{ show: false }">
            <span data-show="show">
                <h1 data-show="show"
                    data-transition:enter="transition"
                    data-transition:enter-start="opacity-0"
                    data-transition:enter-end="opacity-1">thing</h1>
            </span>

            <button data-on:click="show = true"></button>
        </div>
    `,
    ({ get }) => {
        get('button').click()
        get('span').should(beVisible())
        get('h1').should(notHaveComputedStyle('opacity', '1')) // We expect a value between 0 and 1
        get('h1').should(haveComputedStyle('opacity', '1')) // Eventually opacity will be 1
    }
)

test('transition duration and delay with and without ms syntax',
    html`
        <div data-data="{ showMs: false, showBlank: false }">

            <span class="ms"
                  data-show="showMs"
                  data-transition.delay.80ms.duration.120ms>ms syntax</span>
            <span class="blank"
                  data-show="showBlank"
                  data-transition.delay.80.duration.120>blank syntax</span>

            <button class="ms"    data-on:click="showMs = true"></button>
            <button class="blank" data-on:click="showBlank = true"></button>
        </div>
    `,
    ({ get }) => {
        get('span.ms').should(notBeVisible())
        get('button.ms').click()
        get('span.ms').should(notBeVisible()) // Not visible due to delay
        get('span.ms').should(beVisible())
        get('span.ms').should(notHaveComputedStyle('opacity', '1')) // We expect a value between 0 and 1
        get('span.ms').should(haveComputedStyle('opacity', '1')) // Eventually opacity will be 1

        get('span.blank').should(notBeVisible())
        get('button.blank').click()
        get('span.blank').should(notBeVisible()) // Not visible due to delay
        get('span.blank').should(beVisible())
        get('span.blank').should(notHaveComputedStyle('opacity', '1')) // We expect a value between 0 and 1
        get('span.blank').should(haveComputedStyle('opacity', '1')) // Eventually opacity will be 1
    }
)

test(
    'bound data-transition can handle empty string and true values',
    html`
        <script>
            window.transitions = () => {
                return {
                    withEmptyString: {
                        ["data-transition.opacity"]: "",
                    },
                    withBoolean: {
                        ["data-transition.opacity"]: true,
                    },
                };
            };
        </script>
        <div data-data="transitions()">
            <button data-bind="withEmptyString"></button>
            <span data-bind="withBoolean">thing</span>
        </div>
    `,
    ({ get }) => 
        {
            get('span').should(beVisible())
            get('span').should(beVisible())
        }
    
);
