import { haveText, html, test } from '../utils'

export function setupConsoleInterceptor( ...targetIds ) {
    const mappedTargetIds = targetIds.map( tid => `'${tid}'` ).join( ',' )
    return `
        let errorContainer = document.createElement('div');
        errorContainer.id = 'errors'
        errorContainer.textContent = 'false'
        document.querySelector('#root').after(errorContainer)
        console.warnlog = console.warn.bind(console)
        console.warn = function () {
            document.getElementById( 'errors' ).textContent = [${mappedTargetIds}].some( target => arguments[1] === document.getElementById( target ) )
            console.warnlog.apply(console, arguments)
        }
    `
}

export function assertConsoleInterceptorHadErrorWithCorrectElement() {
    return ({get}) => {
        get('#errors').should(haveText('true'))
    };
}

test('data-for identifier issue',
    [html`
        <div data-data="{ items: ['foo'] }">
            <template id="xfor" data-for="item in itemzzzz">
                <span data-text="item"></span>
            </template>
        </div>
    `,
        setupConsoleInterceptor( "xfor" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('data-text identifier issue',
    [html`
        <div data-data="{ items: ['foo'] }">
            <template data-for="item in items">
                <span id="xtext" data-text="itemzzz"></span>
            </template>
        </div>
    `,
        setupConsoleInterceptor( "xtext" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('data-init identifier issue',
    [html`
        <div id="xinit" data-data data-init="doesNotExist()">
        </div>
    `,
        setupConsoleInterceptor( "xinit" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('data-show identifier issue',
    [html`
        <div id="xshow" data-data="{isOpen: true}" data-show="isVisible">
        </div>
    `,
        setupConsoleInterceptor( "xshow" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('data-bind class object syntax identifier issue',
    [html`
        <div data-data="{isOpen: true}">
            <div id="xbind" :class="{ 'block' : isVisible, 'hidden' : !isVisible }"></div>
        </div>
    `,
        setupConsoleInterceptor( "xbind" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('data-model identifier issue',
    [html`
        <div data-data="{value: ''}">
            <input id="xmodel" data-model="thething"/>
        </div>
    `,
        setupConsoleInterceptor( "xmodel" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('data-if identifier issue',
    [html`
        <div data-data="{value: ''}">
            <template id="xif" data-if="valuez === ''">
                <span>Words</span>
            </template>
        </div>
    `,
        setupConsoleInterceptor( "xif" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('data-if identifier issue ( function )',
    [html`
        <div data-data="{shouldOpen: function(){}}">
            <template id="xif" data-if="isOpen()">
                <span>Words</span>
            </template>
        </div>
    `,
        setupConsoleInterceptor( "xif" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('data-effect identifier issue',
    [html`
        <div id="xeffect" data-data="{ label: 'Hello' }" data-effect="System.out.println(label)">
        </div>
    `,
        setupConsoleInterceptor( "xeffect" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('data-on identifier issue',
    [html`
        <div data-data="{ label: 'Hello' }">
            <div data-text="label"></div>
            <button id="xon" data-on:click="labelz += ' World!'">Change Message</button>
        </div>
    `,
        setupConsoleInterceptor( "xon" )
    ],
    ({ get }) => {
        get( "#xon" ).click()
        get( "#errors" ).should(haveText('true'))
    },
    true
)

test('data-data syntax error',
    [html`
        <div id="xdata" data-data="{ label: 'Hello' }aaa">
        </div>
    `,
        setupConsoleInterceptor( "xdata" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('if statement syntax error',
    [html`
        <div data-data="{ label: 'Hello' }">
            <div id="xtext" data-text="if( false { label } else { 'bye' }"></div>
        </div>
    `,
        setupConsoleInterceptor( "xtext" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('data-data with reference error and multiple errors',
    [html`
        <div id="xdata" data-data="{ items : [ {v:'one'},{v:'two'}], replaceItems }">
            <template id="xtext" data-for="item in items">
                <span data-text="item.v"></span>
            </template>
        </div>
    `,
        setupConsoleInterceptor( "xdata", "xtext" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)

test('evaluation with syntax error',
    [html`
        <div data-data="{value: ''}">
            <template id="xif" data-if="value ==== ''">
                <span>Words</span>
            </template>
        </div>
    `,
        setupConsoleInterceptor( "xif" )
    ],
    assertConsoleInterceptorHadErrorWithCorrectElement(),
    true
)
