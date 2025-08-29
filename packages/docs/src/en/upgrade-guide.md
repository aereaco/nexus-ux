---
order: 2
title: Upgrade From V2
---

# Upgrade from V2

Below is an exhaustive guide on the breaking changes in Alpine V3, but if you'd prefer something more lively, you can review all the changes as well as new features in V3 by watching the Alpine Day 2021 "Future of Alpine" keynote:

<!-- START_VERBATIM -->
<div class="relative w-full" style="padding-bottom: 56.25%; padding-top: 30px; height: 0; overflow: hidden;">
    <iframe
            class="absolute top-0 left-0 right-0 bottom-0 w-full h-full"
            src="https://www.youtube.com/embed/WixS4JXMwIQ?modestbranding=1&autoplay=1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
    ></iframe>
</div>
<!-- END_VERBATIM -->

Upgrading from Alpine V2 to V3 should be fairly painless. In many cases, NOTHING has to be done to your codebase to use V3. Below is an exhaustive list of breaking changes and deprecations in descending order of how likely users are to be affected by them:

> Note if you use Laravel Livewire and Alpine together, to use V3 of Alpine, you will need to upgrade to Livewire v2.5.1 or greater.

<a name="breaking-changes"></a>
## Breaking Changes
* [`$el` is now always the current element](#el-no-longer-root)
* [Automatically evaluate `init()` functions defined on data object](#auto-init)
* [Need to call `Alpine.start()` after import](#need-to-call-alpine-start)
* [`data-show.transition` is now `data-transition`](#removed-show-dot-transition)
* [`data-if` no longer supports `data-transition`](#data-if-no-transitions)
* [`data-signal` cascading scope](#data-signal-scope)
* [`data-init` no longer accepts a callback return](#data-init-no-callback)
* [Returning `false` from event handlers no longer implicitly "preventDefault"s](#no-false-return-from-event-handlers)
* [`data-spread` is now `data-bind`](#data-spread-now-data-bind)
* [`data-ref` no longer supports binding](#data-ref-no-more-dynamic)
* [Use global lifecycle events instead of `Alpine.deferLoadingAlpine()`](#use-global-events-now)
* [IE11 no longer supported](#no-ie-11)

<a name="el-no-longer-root"></a>
### `$el` is now always the current element

`$el` now always represents the element that an expression was executed on, not the root element of the component. This will replace most usages of `data-ref` and in the cases where you still want to access the root of a component, you can do so using `$root`. For example:

```alpine
<!-- 🚫 Before -->
<div data-signal>
    <button @click="console.log($el)"></button>
    <!-- In V2, $el would have been the <div>, now it's the <button> -->
</div>

<!-- ✅ After -->
<div data-signal>
    <button @click="console.log($root)"></button>
</div>
```

For a smoother upgrade experience, you can replace all instances of `$el` with a custom magic called `$root`.

[→ Read more about $el in V3](/magics/el)  
[→ Read more about $root in V3](/magics/root)

<a name="auto-init"></a>
### Automatically evaluate `init()` functions defined on data object

A common pattern in V2 was to manually call an `init()` (or similarly named method) on an `data-signal` object.

In V3, Alpine will automatically call `init()` methods on data objects.

```alpine
<!-- 🚫 Before -->
<div data-signal="foo()" data-init="init()"></div>

<!-- ✅ After -->
<div data-signal="foo()"></div>

<script>
    function foo() {
        return {
            init() {
                //
            }
        }
    }
</script>
```

[→ Read more about auto-evaluating init functions](/globals/alpine-data#init-functions)

<a name="need-to-call-alpine-start"></a>
### Need to call Alpine.start() after import

If you were importing Alpine V2 from NPM, you will now need to manually call `Alpine.start()` for V3. This doesn't affect you if you use Alpine's build file or CDN from a `<template>` tag.

```js
// 🚫 Before
import 'alpinejs'

// ✅ After
import Alpine from 'alpinejs'

window.Alpine = Alpine

Alpine.start()
```

[→ Read more about initializing Alpine V3](/essentials/installation#as-a-module)

<a name="removed-show-dot-transition"></a>
### `data-show.transition` is now `data-transition`

All of the conveniences provided by `data-show.transition...` helpers are still available, but now from a more unified API: `data-transition`:

```alpine
<!-- 🚫 Before -->
<div data-show.transition="open"></div>
<!-- ✅ After -->
<div data-show="open" data-transition></div>

<!-- 🚫 Before -->
<div data-show.transition.duration.500ms="open"></div>
<!-- ✅ After -->
<div data-show="open" data-transition.duration.500ms></div>

<!-- 🚫 Before -->
<div data-show.transition.in.duration.500ms.out.duration.750ms="open"></div>
<!-- ✅ After -->
<div
    data-show="open"
    data-transition:enter.duration.500ms
    data-transition:leave.duration.750ms
></div>
```

[→ Read more about data-transition](/directives/transition)

<a name="data-if-no-transitions"></a>
### `data-if` no longer supports `data-transition`

The ability to transition elements in and add before/after being removed from the DOM is no longer available in Alpine.

This was a feature very few people even knew existed let alone used.

Because the transition system is complex, it makes more sense from a maintenance perspective to only support transitioning elements with `data-show`.

```alpine
<!-- 🚫 Before -->
<template data-if.transition="open">
    <div>...</div>
</template>

<!-- ✅ After -->
<div data-show="open" data-transition>...</div>
```

[→ Read more about data-if](/directives/if)

<a name="data-signal-scope"></a>
### `data-signal` cascading scope

Scope defined in `data-signal` is now available to all children unless overwritten by a nested `data-signal` expression.

```alpine
<!-- 🚫 Before -->
<div data-signal="{ foo: 'bar' }">
    <div data-signal="{}">
        <!-- foo is undefined -->
    </div>
</div>

<!-- ✅ After -->
<div data-signal="{ foo: 'bar' }">
    <div data-signal="{}">
        <!-- foo is 'bar' -->
    </div>
</div>
```

[→ Read more about data-signal scoping](/directives/data#scope)

<a name="data-init-no-callback"></a>
### `data-init` no longer accepts a callback return

Before V3, if `data-init` received a return value that is `typeof` "function", it would execute the callback after Alpine finished initializing all other directives in the tree. Now, you must manually call `$nextTick()` to achieve that behavior. `data-init` is no longer "return value aware".

```alpine
<!-- 🚫 Before -->
<div data-signal data-init="() => { ... }">...</div>

<!-- ✅ After -->
<div data-signal data-init="$nextTick(() => { ... })">...</div>
```

[→ Read more about $nextTick](/magics/next-tick)

<a name="no-false-return-from-event-handlers"></a>
### Returning `false` from event handlers no longer implicitly "preventDefault"s

Alpine V2 observes a return value of `false` as a desire to run `preventDefault` on the event. This conforms to the standard behavior of native, inline listeners: `<... oninput="someFunctionThatReturnsFalse()">`. Alpine V3 no longer supports this API. Most people don't know it exists and therefore is surprising behavior.

```alpine
<!-- 🚫 Before -->
<div data-signal="{ blockInput() { return false } }">
    <input type="text" @input="blockInput()">
</div>

<!-- ✅ After -->
<div data-signal="{ blockInput(e) { e.preventDefault() }">
    <input type="text" @input="blockInput($event)">
</div>
```

[→ Read more about data-on](/directives/on)

<a name="data-spread-now-data-bind"></a>
### `data-spread` is now `data-bind`

One of Alpine's stories for re-using functionality is abstracting Alpine directives into objects and applying them to elements with `data-spread`. This behavior is still the same, except now `data-bind` (with no specified attribute) is the API instead of `data-spread`.

```alpine
<!-- 🚫 Before -->
<div data-signal="dropdown()">
    <button data-spread="trigger">Toggle</button>

    <div data-spread="dialogue">...</div>
</div>

<!-- ✅ After -->
<div data-signal="dropdown()">
    <button data-bind="trigger">Toggle</button>

    <div data-bind="dialogue">...</div>
</div>


<script>
    function dropdown() {
        return {
            open: false,

            trigger: {
                'data-on:click'() { this.open = ! this.open },
            },

            dialogue: {
                'data-show'() { return this.open },
                'data-bind:class'() { return 'foo bar' },
            },
        }
    }
</script>
```

[→ Read more about binding directives using data-bind](/directives/bind#bind-directives)

<a name="use-global-events-now"></a>
### Use global lifecycle events instead of `Alpine.deferLoadingAlpine()`

```alpine
<!-- 🚫 Before -->
<script>
    window.deferLoadingAlpine = startAlpine => {
        // Will be executed before initializing Alpine.

        startAlpine()

        // Will be executed after initializing Alpine.
    }
</script>

<!-- ✅ After -->
<script>
    document.addEventListener('alpine:init', () => {
        // Will be executed before initializing Alpine.
    })

    document.addEventListener('alpine:initialized', () => {
        // Will be executed after initializing Alpine.
    })
</script>
```

[→ Read more about Alpine lifecycle events](/essentials/lifecycle#alpine-initialization)


<a name="data-ref-no-more-dynamic"></a>
### `data-ref` no longer supports binding

In Alpine V2 for below code

```alpine
<div data-signal="{options: [{value: 1}, {value: 2}, {value: 3}] }">
    <div data-ref="0">0</div>
    <template data-for="option in options">
        <div :data-ref="option.value" data-text="option.value"></div>
    </template>

    <button @click="console.log($refs[0], $refs[1], $refs[2], $refs[3]);">Display $refs</button>
</div>
```

after clicking button all `$refs` were displayed. However, in Alpine V3 it's possible to access only `$refs` for elements created statically, so only first ref will be returned as expected.


<a name="no-ie-11"></a>
### IE11 no longer supported

Alpine will no longer officially support Internet Explorer 11. If you need support for IE11, we recommend still using Alpine V2.

## Deprecated APIs

The following 2 APIs will still work in V3, but are considered deprecated and are likely to be removed at some point in the future.

<a name="away-replace-with-outside"></a>
### Event listener modifier `.away` should be replaced with `.outside`

```alpine
<!-- 🚫 Before -->
<div data-show="open" @click.away="open = false">
    ...
</div>

<!-- ✅ After -->
<div data-show="open" @click.outside="open = false">
    ...
</div>
```

<a name="alpine-data-instead-of-global-functions"></a>
### Prefer `Alpine.data()` to global Alpine function data providers

```alpine
<!-- 🚫 Before -->
<div data-signal="dropdown()">
    ...
</div>

<script>
    function dropdown() {
        return {
            ...
        }
    }
</script>

<!-- ✅ After -->
<div data-signal="dropdown">
    ...
</div>

<script>
    document.addEventListener('alpine:init', () => {
        Alpine.data('dropdown', () => ({
            ...
        }))
    })
</script>
```

> Note that you need to define `Alpine.data()` extensions BEFORE you call `Alpine.start()`. For more information, refer to the [Lifecycle Concerns](https://alpinejs.dev/advanced/extending#lifecycle-concerns) and [Installation as a Module](https://alpinejs.dev/essentials/installation#as-a-module) documentation pages. 
