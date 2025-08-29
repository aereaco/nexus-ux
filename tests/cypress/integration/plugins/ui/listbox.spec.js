import { beVisible, beHidden, haveAttribute, haveClasses, notHaveClasses, haveText, html, notBeVisible, notHaveAttribute, notExist, haveFocus, test, ensureNoConsoleWarns} from '../../../utils'

test('it works with data-model',
    [html`
        <div
            data-data="{ active: null, people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb' },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
            data-model="active"
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="active ? active.name : 'Select Person'"></button>

            <ul data-listbox:options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person"
                        :disabled="person.disabled"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('ul').should(notBeVisible())
        get('button')
            .should(haveText('Select Person'))
            .click()
        get('ul').should(beVisible())
        get('button').click()
        get('ul').should(notBeVisible())
        get('button').click()
        get('[option="2"]').click()
        get('ul').should(notBeVisible())
        get('button').should(haveText('Arlene Mccoy'))
    },
)

test('it works with internal state',
    [html`
        <div
            data-data="{ people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb' },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="$listbox.selected ? $listbox.selected.name : 'Select Person'"></button>

            <ul data-listbox:options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person"
                        :disabled="person.disabled"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('ul').should(notBeVisible())
        get('button')
            .should(haveText('Select Person'))
            .click()
        get('ul').should(beVisible())
        get('button').click()
        get('ul').should(notBeVisible())
        get('button').click()
        get('[option="2"]').click()
        get('ul').should(notBeVisible())
        get('button').should(haveText('Arlene Mccoy'))
    },
)

test('$listbox/$listboxOption',
    [html`
        <div
            data-data="{ people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb' },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="$listbox.selected ? $listbox.selected.name : 'Select Person'"></button>

            <article data-text="$listbox.active?.name"></article>

            <ul data-listbox:options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                            'disabled': $listboxOption.isDisabled,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('article').should(haveText(''))
        get('[option="5"]').should(haveClasses(['disabled']))
        get('button')
            .should(haveText('Select Person'))
            .click()
        get('article').should(haveText('Wade Cooper'))
        get('[option="1"]').should(haveClasses(['active']))
        get('ul').type('{downarrow}')
        get('article').should(haveText('Arlene Mccoy'))
        get('[option="2"]').should(haveClasses(['active']))
        get('button').should(haveText('Select Person'))
        get('[option="2"]').click()
        get('button').should(haveText('Arlene Mccoy'))
        get('[option="2"]').should(haveClasses(['selected']))
    },
)

test('"name" prop',
    [html`
        <div
            data-data="{ people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb' },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
            name="person"
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="$listbox.selected ? $listbox.selected : 'Select Person'"></button>

            <ul data-listbox:options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person.id"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('input').should(haveAttribute('value', 'null'))
        get('button').click()
        get('input').should(haveAttribute('value', 'null'))
        get('[option="2"]').click()
        get('input').should(beHidden())
            .should(haveAttribute('name', 'person'))
            .should(haveAttribute('value', '2'))
            .should(haveAttribute('type', 'hidden'))
        get('button').click()
        get('[option="4"]').click()
        get('input').should(beHidden())
            .should(haveAttribute('name', 'person'))
            .should(haveAttribute('value', '4'))
            .should(haveAttribute('type', 'hidden'))
    },
);

test('"name" prop with object value',
    [html`
        <div
            data-data="{ people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb' },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
            name="person"
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="$listbox.selected ? $listbox.selected.name : 'Select Person'"></button>

            <ul data-listbox:options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('input[name="person"]').should(haveAttribute('value', 'null'))
        get('button').click()
        get('[name="person[id]"]').should(notExist())
        get('[option="2"]').click()
        get('input[name="person"]').should(notExist())
        get('[name="person[id]"]').should(beHidden())
            .should(haveAttribute('value', '2'))
            .should(haveAttribute('type', 'hidden'))
        get('[name="person[name]"]').should(beHidden())
            .should(haveAttribute('value', 'Arlene Mccoy'))
            .should(haveAttribute('type', 'hidden'))
        get('button').click()
        get('[option="4"]').click()
        get('[name="person[id]"]').should(beHidden())
            .should(haveAttribute('value', '4'))
            .should(haveAttribute('type', 'hidden'))
        get('[name="person[name]"]').should(beHidden())
            .should(haveAttribute('value', 'Tom Cook'))
            .should(haveAttribute('type', 'hidden'))
    },
);

test('"default-value" prop',
    [html`
        <div
            data-data="{ people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb' },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
            name="person"
            default-value="2"
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="$listbox.selected ? $listbox.selected : 'Select Person'"></button>

            <ul data-listbox:options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person.id"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('input').should(beHidden())
            .should(haveAttribute('name', 'person'))
            .should(haveAttribute('value', '2'))
            .should(haveAttribute('type', 'hidden'))
    },
);

test('"multiple" prop',
    [html`
        <div
            data-data="{
                people: [
                    { id: 1, name: 'Wade Cooper' },
                    { id: 2, name: 'Arlene Mccoy' },
                    { id: 3, name: 'Devon Webb' },
                    { id: 4, name: 'Tom Cook' },
                    { id: 5, name: 'Tanya Fox', disabled: true },
                    { id: 6, name: 'Hellen Schmidt' },
                    { id: 7, name: 'Caroline Schultz' },
                    { id: 8, name: 'Mason Heaney' },
                    { id: 9, name: 'Claudie Smitham' },
                    { id: 10, name: 'Emil Schaefer' },
                ]
            }"
            data-listbox
            multiple
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="$listbox.selected ? $listbox.selected.join(',') : 'Select People'"></button>

            <ul data-listbox:options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person.id"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('button').click()
        get('[option="2"]').click()
        get('ul').should(beVisible())
        get('button').should(haveText('2'))
        get('[option="4"]').click()
        get('button').should(haveText('2,4'))
        get('ul').should(beVisible())
        get('[option="4"]').click()
        get('button').should(haveText('2'))
        get('ul').should(beVisible())
    },
);

test('"multiple" and "name" props together',
    [html`
        <div
            data-data="{
                people: [
                    { id: 1, name: 'Wade Cooper' },
                    { id: 2, name: 'Arlene Mccoy' },
                    { id: 3, name: 'Devon Webb' },
                    { id: 4, name: 'Tom Cook' },
                    { id: 5, name: 'Tanya Fox', disabled: true },
                    { id: 6, name: 'Hellen Schmidt' },
                    { id: 7, name: 'Caroline Schultz' },
                    { id: 8, name: 'Mason Heaney' },
                    { id: 9, name: 'Claudie Smitham' },
                    { id: 10, name: 'Emil Schaefer' },
                ]
            }"
            data-listbox
            multiple
            name="people"
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="$listbox.selected ? $listbox.selected.map(p => p.id).join(',') : 'Select People'"></button>

            <ul data-listbox:options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('input[name="people"]').should(notExist())
        get('button').click()
        get('[name="people[0][id]"]').should(notExist())
        get('[option="2"]').click()
        get('ul').should(beVisible())
        get('button').should(haveText('2'))
        get('input[name="people"]').should(notExist())
        get('[name="people[0][id]"]').should(beHidden())
            .should(haveAttribute('value', '2'))
            .should(haveAttribute('type', 'hidden'))
        get('[name="people[0][name]"]').should(beHidden())
            .should(haveAttribute('value', 'Arlene Mccoy'))
            .should(haveAttribute('type', 'hidden'))
        get('[option="4"]').click()
        get('[name="people[0][id]"]').should(beHidden())
            .should(haveAttribute('value', '2'))
            .should(haveAttribute('type', 'hidden'))
        get('[name="people[0][name]"]').should(beHidden())
            .should(haveAttribute('value', 'Arlene Mccoy'))
            .should(haveAttribute('type', 'hidden'))
        get('[name="people[1][id]"]').should(beHidden())
            .should(haveAttribute('value', '4'))
            .should(haveAttribute('type', 'hidden'))
        get('[name="people[1][name]"]').should(beHidden())
            .should(haveAttribute('value', 'Tom Cook'))
            .should(haveAttribute('type', 'hidden'))
        get('button').should(haveText('2,4'))
        get('ul').should(beVisible())
        get('[option="4"]').click()
        get('[name="people[0][id]"]').should(beHidden())
            .should(haveAttribute('value', '2'))
            .should(haveAttribute('type', 'hidden'))
        get('[name="people[0][name]"]').should(beHidden())
            .should(haveAttribute('value', 'Arlene Mccoy'))
            .should(haveAttribute('type', 'hidden'))
        get('[name="people[1][id]"]').should(notExist())
        get('[name="people[1][name]"]').should(notExist())
        get('button').should(haveText('2'))
        get('ul').should(beVisible())
    },
);

test('keyboard controls',
    [html`
        <div
            data-data="{ active: null, people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb', disabled: true },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
            data-model="active"
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="active ? active.name : 'Select Person'"></button>

            <ul data-listbox:options options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('.active').should(notExist())
        get('button').focus().type(' ')
        get('[options]')
            .should(beVisible())
            .should(haveFocus())
        get('[option="1"]')
            .should(haveClasses(['active']))
        get('[options]')
            .type('{downarrow}')
        get('[option="2"]')
            .should(haveClasses(['active']))
        get('[options]')
            .type('{downarrow}')
        get('[option="4"]')
            .should(haveClasses(['active']))
        get('[options]')
            .type('{uparrow}')
        get('[option="2"]')
            .should(haveClasses(['active']))
        get('[options]')
            .type('{home}')
        get('[option="1"]')
            .should(haveClasses(['active']))
        get('[options]')
            .type('{end}')
        get('[option="10"]')
            .should(haveClasses(['active']))
        get('[options]')
            .type('{pageUp}')
        get('[option="1"]')
            .should(haveClasses(['active']))
        get('[options]')
            .type('{pageDown}')
        get('[option="10"]')
            .should(haveClasses(['active']))
        get('[options]')
            .tab()
            .should(haveFocus())
            .should(beVisible())
            .tab({ shift: true })
            .should(haveFocus())
            .should(beVisible())
            .type('{esc}')
            .should(notBeVisible())
    },
)

test('"horizontal" keyboard controls',
    [html`
        <div
            data-data="{ active: null, people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb', disabled: true },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
            data-model="active"
            horizontal
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="active ? active.name : 'Select Person'"></button>

            <ul data-listbox:options options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('.active').should(notExist())
        get('button').focus().type(' ')
        get('[options]')
            .should(haveAttribute('aria-orientation', 'horizontal'))
            .should(beVisible())
            .should(haveFocus())
        get('[option="1"]')
            .should(haveClasses(['active']))
        get('[options]')
            .type('{rightarrow}')
        get('[option="2"]')
            .should(haveClasses(['active']))
        get('[options]')
            .type('{rightarrow}')
        get('[option="4"]')
            .should(haveClasses(['active']))
        get('[options]')
            .type('{leftarrow}')
        get('[option="2"]')
            .should(haveClasses(['active']))
    },
)

test('"by" prop with string value',
    [html`
        <div
            data-data="{ active: null, people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb', disabled: true },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
            data-model="active"
            by="id"
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="active ? active.name : 'Select Person'"></button>

            <ul data-listbox:options options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('ul').should(notBeVisible())
        get('button')
            .should(haveText('Select Person'))
            .click()
        get('ul').should(beVisible())
        get('button').click()
        get('ul').should(notBeVisible())
        get('button').click()
        get('[option="2"]').click()
        get('ul').should(notBeVisible())
        get('button').should(haveText('Arlene Mccoy'))
    },
)

test('search',
    [html`
        <div
            data-data="{ active: null, people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb', disabled: true },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
            data-model="active"
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="active ? active.name : 'Select Person'"></button>

            <ul data-listbox:options options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get, wait }) => {
        get('.active').should(notExist())
        get('button').click()
        get('[options]')
            .type('ar')
        get('[option="2"]')
            .should(haveClasses(['active']))
        wait(500)
        get('[options]')
            .type('ma')
        get('[option="8"]')
            .should(haveClasses(['active']))
    },
)

test('changing value manually changes internal state',
    [html`
        <div
            data-data="{ active: null, people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb', disabled: true },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
            data-model="active"
        >
            <label data-listbox:label>Assigned to</label>

            <button toggle data-listbox:button data-text="$listbox.selected ? $listbox.selected : 'Select Person'"></button>

            <button select-tim @click="active = 4">Select Tim</button>

            <ul data-listbox:options options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person.id"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('[select-tim]').click()
        get('[option="4"]').should(haveClasses(['selected']))
        get('[option="1"]').should(notHaveClasses(['selected']))
        get('[toggle]').should(haveText('4'))
    },
)

test('has accessibility attributes',
    [html`
        <div
            data-data="{ active: null, people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb', disabled: true },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
            data-model="active"
        >
            <label data-listbox:label>Assigned to</label>

            <button data-listbox:button data-text="active ? active.name : 'Select Person'"></button>

            <ul data-listbox:options options>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person"
                        :disabled="person.disabled"
                        :class="{
                            'selected': $listboxOption.isSelected,
                            'active': $listboxOption.isActive,
                        }"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('button')
            .should(haveAttribute('aria-haspopup', 'true'))
            .should(haveAttribute('aria-labelledby', 'alpine-listbox-label-1'))
            .should(haveAttribute('aria-expanded', 'false'))
            .should(notHaveAttribute('aria-controls'))
            .should(haveAttribute('id', 'alpine-listbox-button-1'))
            .click()
            .should(haveAttribute('aria-expanded', 'true'))
            .should(haveAttribute('aria-controls', 'alpine-listbox-options-1'))

        get('[options]')
            .should(haveAttribute('aria-orientation', 'vertical'))
            .should(haveAttribute('role', 'listbox'))
            .should(haveAttribute('id', 'alpine-listbox-options-1'))
            .should(haveAttribute('aria-labelledby', 'alpine-listbox-button-1'))
            .should(notHaveAttribute('aria-activedescendant'))
            .should(haveAttribute('tabindex', '0'))
            .should(haveAttribute('aria-activedescendant', 'alpine-listbox-option-1'))

        get('[option="1"]')
            .should(haveAttribute('role', 'option'))
            .should(haveAttribute('id', 'alpine-listbox-option-1'))
            .should(haveAttribute('tabindex', '-1'))
            .should(haveAttribute('aria-selected', 'false'))

        get('[option="2"]')
            .should(haveAttribute('role', 'option'))
            .should(haveAttribute('id', 'alpine-listbox-option-2'))
            .should(haveAttribute('tabindex', '-1'))
            .should(haveAttribute('aria-selected', 'false'))

        get('[options]')
            .type('{downarrow}')
            .should(haveAttribute('aria-activedescendant', 'alpine-listbox-option-2'))

        get('[option="2"]')
            .click()
            .should(haveAttribute('aria-selected', 'true'))
    },
)

test('"static" prop',
    [html`
        <div
            data-data="{ active: null, show: false, people: [
                { id: 1, name: 'Wade Cooper' },
                { id: 2, name: 'Arlene Mccoy' },
                { id: 3, name: 'Devon Webb' },
                { id: 4, name: 'Tom Cook' },
                { id: 5, name: 'Tanya Fox', disabled: true },
                { id: 6, name: 'Hellen Schmidt' },
                { id: 7, name: 'Caroline Schultz' },
                { id: 8, name: 'Mason Heaney' },
                { id: 9, name: 'Claudie Smitham' },
                { id: 10, name: 'Emil Schaefer' },
            ]}"
            data-listbox
            data-model="active"
        >
            <label data-listbox:label>Assigned to</label>

            <button normal-toggle data-listbox:button data-text="active ? active.name : 'Select Person'"></button>

            <button real-toggle @click="show = ! show">Toggle</button>

            <ul data-listbox:options data-show="show" static>
                <template data-for="person in people" :key="person.id">
                    <li
                        :option="person.id"
                        data-listbox:option
                        :value="person"
                        :disabled="person.disabled"
                    >
                        <span data-text="person.name"></span>
                    </li>
                </template>
            </ul>
        </div>
    `],
    ({ get }) => {
        get('ul').should(notBeVisible())
        get('[normal-toggle]')
            .should(haveText('Select Person'))
            .click()
        get('ul').should(notBeVisible())
        get('[real-toggle]').click()
        get('ul').should(beVisible())
        get('[option="2"]').click()
        get('ul').should(beVisible())
        get('[normal-toggle]').should(haveText('Arlene Mccoy'))
    },
)

test('works with morph',
    [html`
    <div data-data="{ value: null }">
        <div data-listbox data-model="value">
            <button data-listbox:button>Select Framework</button>

            <ul data-listbox:options>
                <li data-listbox:option value="laravel">Laravel</li>
            </ul>
        </div>

        Selected: <span data-text="value"></span>
    </div>
    `],
    ({ get }, reload, window, document) => {
        let toHtml = html`
        <div data-data="{ value: null }">
            <div data-listbox data-model="value">
                <button data-listbox:button>Select Framework (updated)</button>

                <ul data-listbox:options>
                    <li data-listbox:option value="laravel">Laravel</li>
                </ul>
            </div>

            Selected: <span data-text="value"></span>
        </div>
        `
        ensureNoConsoleWarns()

        get('div').then(([el]) => window.Alpine.morph(el, toHtml))

        get('button').should(haveText('Select Framework (updated)'))
    },
)


test('boolean option values',
    [html`
    <div data-data="{ value: null }" data-listbox data-model="value">
        <label data-listbox:label>Value</label>

        <button data-listbox:button data-text="value !== null ? value.toString() : 'Select boolean'"></button>

        <ul data-listbox:options options>
            <li
                option="boolean-true"
                data-listbox:option
                :value="true"
                :class="{
                    'selected': $listboxOption.isSelected,
                    'active': $listboxOption.isActive,
                }">
                <span>Yes</span>
            </li>
            <li
                option="boolean-false"
                data-listbox:option
                :value="false"
                :class="{
                    'selected': $listboxOption.isSelected,
                    'active': $listboxOption.isActive,
                }">
                <span>No</span>
            </li>
        </ul>
    </div>
    `],
    ({ get }) => {
        get('ul').should(notBeVisible())
        get('button')
            .should(haveText('Select boolean'))
            .click()
        get('ul').should(beVisible())
        get('[option="boolean-true"]').should(notHaveClasses(['selected']))
        get('[option="boolean-false"]').should(notHaveClasses(['selected']))
        get('[option="boolean-true"]').click()
        get('ul').should(notBeVisible())
        get('button').should(haveText('true'))
        get('button').click()
        get('ul').should(beVisible())
        get('[option="boolean-true"]').should(haveClasses(['selected']))
        get('[option="boolean-false"]').should(notHaveClasses(['selected']))
        get('[option="boolean-false"]').click()
        get('ul').should(notBeVisible())
        get('button').should(haveText('false'))
        get('button').click()
        get('ul').should(beVisible())
        get('[option="boolean-true"]').should(notHaveClasses(['selected']))
        get('[option="boolean-false"]').should(haveClasses(['selected']))
    },
)

test('integer option values',
    [html`
    <div data-data="{ value: null }" data-listbox data-model="value">
        <label data-listbox:label>Value</label>

        <button data-listbox:button data-text="value !== null ? value.toString() : 'Select number'"></button>

        <ul data-listbox:options options>
            <li
                option="0"
                data-listbox:option
                :value="0"
                :class="{
                    'selected': $listboxOption.isSelected,
                    'active': $listboxOption.isActive,
                }">
                <span>0</span>
            </li>
            <li
                option="1"
                data-listbox:option
                :value="1"
                :class="{
                    'selected': $listboxOption.isSelected,
                    'active': $listboxOption.isActive,
                }">
                <span>1</span>
            </li>
            <li
                option="2"
                data-listbox:option
                :value="2"
                :class="{
                    'selected': $listboxOption.isSelected,
                    'active': $listboxOption.isActive,
                }">
                <span>2</span>
            </li>
        </ul>
    </div>
    `],
    ({ get }) => {
        get('ul').should(notBeVisible())
        get('button')
            .should(haveText('Select number'))
            .click()
        get('ul').should(beVisible())
        get('[option="0"]').should(notHaveClasses(['selected']))
        get('[option="1"]').should(notHaveClasses(['selected']))
        get('[option="2"]').should(notHaveClasses(['selected']))
        get('[option="1"]').click()
        get('ul').should(notBeVisible())
        get('button').should(haveText('1'))
        get('button').click()
        get('ul').should(beVisible())
        get('[option="0"]').should(notHaveClasses(['selected']))
        get('[option="1"]').should(haveClasses(['selected']))
        get('[option="2"]').should(notHaveClasses(['selected']))
        get('[option="0"]').click()
        get('ul').should(notBeVisible())
        get('button').should(haveText('0'))
        get('button').click()
        get('ul').should(beVisible())
        get('[option="0"]').should(haveClasses(['selected']))
        get('[option="1"]').should(notHaveClasses(['selected']))
        get('[option="2"]').should(notHaveClasses(['selected']))
        get('[option="2"]').click()
        get('ul').should(notBeVisible())
        get('button').should(haveText('2'))
        get('button').click()
        get('ul').should(beVisible())
        get('[option="0"]').should(notHaveClasses(['selected']))
        get('[option="1"]').should(notHaveClasses(['selected']))
        get('[option="2"]').should(haveClasses(['selected']))
    },
)

// test "by" attribute
