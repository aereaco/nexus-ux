---
order: 1
title: data()
---

# Alpine.data

`Alpine.data(...)` provides a way to re-use `data-signal` contexts within your application.

Here's a contrived `dropdown` component for example:

```alpine
<div data-signal="dropdown">
    <button @click="toggle">...</button>

    <div data-show="open">...</div>
</div>

<script>
    document.addEventListener('alpine:init', () => {
        Alpine.data('dropdown', () => ({
            open: false,

            toggle() {
                this.open = ! this.open
            }
        }))
    })
</script>
```

As you can see we've extracted the properties and methods we would usually define directly inside `data-signal` into a separate Alpine component object.

<a name="registering-from-a-bundle"></a>
## Registering from a bundle

If you've chosen to use a build step for your Alpine code, you should register your components in the following way:

```js
import Alpine from 'alpinejs'
import dropdown from './dropdown.js'

Alpine.data('dropdown', dropdown)

Alpine.start()
```

This assumes you have a file called `dropdown.js` with the following contents:

```js
export default () => ({
    open: false,

    toggle() {
        this.open = ! this.open
    }
})
```

<a name="initial-parameters"></a>
## Initial parameters

In addition to referencing `Alpine.data` providers by their name plainly (like `data-signal="dropdown"`), you can also reference them as functions (`data-signal="dropdown()"`). By calling them as functions directly, you can pass in additional parameters to be used when creating the initial data object like so:

```alpine
<div data-signal="dropdown(true)">
```
```js
Alpine.data('dropdown', (initialOpenState = false) => ({
    open: initialOpenState
}))
```

Now, you can re-use the `dropdown` object, but provide it with different parameters as you need to.

<a name="init-functions"></a>
## Init functions

If your component contains an `init()` method, Alpine will automatically execute it before it renders the component. For example:

```js
Alpine.data('dropdown', () => ({
    init() {
        // This code will be executed before Alpine
        // initializes the rest of the component.
    }
}))
```

<a name="destroy-functions"></a>
## Destroy functions

If your component contains a `destroy()` method, Alpine will automatically execute it before cleaning up the component.

A primary example for this is when registering an event handler with another library or a browser API that isn't available through Alpine.
See the following example code on how to use the `destroy()` method to clean up such a handler.

```js
Alpine.data('timer', () => ({
    timer: null,
    counter: 0,
    init() {
      // Register an event handler that references the component instance
      this.timer = setInterval(() => {
        console.log('Increased counter to', ++this.counter);
      }, 1000);
    },
    destroy() {
        // Detach the handler, avoiding memory and side-effect leakage
        clearInterval(this.timer);
    },
}))
```

An example where a component is destroyed is when using one inside an `data-if`:

```html
<span data-signal="{ enabled: false }">
    <button @click.prevent="enabled = !enabled">Toggle</button>

    <template data-if="enabled">
        <span data-signal="timer" data-text="counter"></span>
    </template>
</span>
```

<a name="using-sprite-properties"></a>
## Using sprite properties

If you want to access sprite methods or properties from a component object, you can do so using the `this` context:

```js
Alpine.data('dropdown', () => ({
    open: false,

    init() {
        this.$watch('open', () => {...})
    }
}))
```

<a name="encapsulating-directives-with-data-bind"></a>
## Encapsulating directives with `data-bind`

If you wish to re-use more than just the data object of a component, you can encapsulate entire Alpine template directives using `data-bind`.

The following is an example of extracting the templating details of our previous dropdown component using `data-bind`:

```alpine
<div data-signal="dropdown">
    <button data-bind="trigger"></button>

    <div data-bind="dialogue"></div>
</div>
```

```js
Alpine.data('dropdown', () => ({
    open: false,

    trigger: {
        ['@click']() {
            this.open = ! this.open
        },
    },

    dialogue: {
        ['data-show']() {
            return this.open
        },
    },
}))
```
