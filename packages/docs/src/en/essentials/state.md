---
order: 2
title: State
---

# State

State (JavaScript data that Alpine watches for changes) is at the core of everything you do in Alpine. You can provide local data to a chunk of HTML, or make it globally available for use anywhere on a page using `data-signal` or `Alpine.store()` respectively.

<a name="local-state-data-signal"></a>
## Local state

Alpine allows you to declare an HTML block's state in a single `data-signal` attribute without ever leaving your markup.

Here's a basic example:

```alpine
<div data-signal="{ open: false }">
    ...
</div>
```

Now any other Alpine syntax on or within this element will be able to access `open`. And like you'd guess, when `open` changes for any reason, everything that depends on it will react automatically.

[→ Read more about `data-signal`](/directives/data)

<a name="nesting-data"></a>
### Nesting data

Data is nestable in Alpine. For example, if you have two elements with Alpine data attached (one inside the other), you can access the parent's data from inside the child element.

```alpine
<div data-signal="{ open: false }">
    <div data-signal="{ label: 'Content:' }">
        <span data-text="label"></span>
        <span data-show="open"></span>
    </div>
</div>
```

This is similar to scoping in JavaScript itself (code within a function can access variables declared outside that function.)

Like you may have guessed, if the child has a data property matching the name of a parent's property, the child property will take precedence.

<a name="single-element-data"></a>
### Single-element data

Although this may seem obvious to some, it's worth mentioning that Alpine data can be used within the same element. For example:

```alpine
<button data-signal="{ label: 'Click Here' }" data-text="label"></button>
```

<a name="data-less-alpine"></a>
### Data-less Alpine

Sometimes you may want to use Alpine functionality, but don't need any reactive data. In these cases, you can opt out of passing an expression to `data-signal` entirely. For example:

```alpine
<button data-signal @click="alert('I\'ve been clicked!')">Click Me</button>
```

<a name="re-usable-data"></a>
### Re-usable data

When using Alpine, you may find the need to re-use a chunk of data and/or its corresponding template.

If you are using a backend framework like Rails or Laravel, Alpine first recommends that you extract the entire block of HTML into a template partial or include.

If for some reason that isn't ideal for you or you're not in a back-end templating environment, Alpine allows you to globally register and re-use the data portion of a component using `Alpine.data(...)`.

```js
Alpine.data('dropdown', () => ({
    open: false,

    toggle() {
        this.open = ! this.open
    }
}))
```

Now that you've registered the "dropdown" data, you can use it inside your markup in as many places as you like:

```alpine
<div data-signal="dropdown">
    <button @click="toggle">Expand</button>

    <span data-show="open">Content...</span>
</div>

<div data-signal="dropdown">
    <button @click="toggle">Expand</button>

    <span data-show="open">Some Other Content...</span>
</div>
```

[→ Read more about using `Alpine.data()`](/globals/alpine-data)

<a name="global-state"></a>
## Global state

If you wish to make some data available to every component on the page, you can do so using Alpine's "global store" feature.

You can register a store using `Alpine.store(...)`, and reference one with the magic `$store()` method.

Let's look at a simple example. First we'll register the store globally:

```js
Alpine.store('tabs', {
    current: 'first',

    items: ['first', 'second', 'third'],
})
```

Now we can access or modify its data from anywhere on our page:

```alpine
<div data-signal>
    <template data-for="tab in $store.tabs.items">
        ...
    </template>
</div>

<div data-signal>
    <button @click="$store.tabs.current = 'first'">First Tab</button>
    <button @click="$store.tabs.current = 'second'">Second Tab</button>
    <button @click="$store.tabs.current = 'third'">Third Tab</button>
</div>
```

[→ Read more about `Alpine.store()`](/globals/alpine-store)
