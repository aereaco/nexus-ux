---
order: 3
title: Templating
---

# Templating

Alpine offers a handful of useful directives for manipulating the DOM on a web page.

Let's cover a few of the basic templating directives here, but be sure to look through the available directives in the sidebar for an exhaustive list.

<a name="text-content"></a>
## Text content

Alpine makes it easy to control the text content of an element with the `data-text` directive.

```alpine
<div data-data="{ title: 'Start Here' }">
    <h1 data-text="title"></h1>
</div>
```

<!-- START_VERBATIM -->
<div data-data="{ title: 'Start Here' }" class="demo">
    <strong data-text="title"></strong>
</div>
<!-- END_VERBATIM -->

Now, Alpine will set the text content of the `<h1>` with the value of `title` ("Start Here"). When `title` changes, so will the contents of `<h1>`.

Like all directives in Alpine, you can use any JavaScript expression you like. For example:

```alpine
<span data-text="1 + 2"></span>
```

<!-- START_VERBATIM -->
<div class="demo" data-data>
    <span data-text="1 + 2"></span>
</div>
<!-- END_VERBATIM -->

The `<span>` will now contain the sum of "1" and "2".

[→ Read more about `data-text`](/directives/text)

<a name="toggling-elements"></a>
## Toggling elements

Toggling elements is a common need in web pages and applications. Dropdowns, modals, dialogues, "show-more"s, etc... are all good examples.

Alpine offers the `data-show` and `data-if` directives for toggling elements on a page.

<a name="data-show"></a>
### `data-show`

Here's a simple toggle component using `data-show`.

```alpine
<div data-data="{ open: false }">
    <button @click="open = ! open">Expand</button>

    <div data-show="open">
        Content...
    </div>
</div>
```

<!-- START_VERBATIM -->
<div data-data="{ open: false }" class="demo">
    <button @click="open = ! open" :aria-pressed="open">Expand</button>

    <div data-show="open">
        Content...
    </div>
</div>
<!-- END_VERBATIM -->

Now the entire `<div>` containing the contents will be shown and hidden based on the value of `open`.

Under the hood, Alpine adds the CSS property `display: none;` to the element when it should be hidden.

[→ Read more about `data-show`](/directives/show)

This works well for most cases, but sometimes you may want to completely add and remove the element from the DOM entirely. This is what `data-if` is for.

<a name="data-if"></a>
### `data-if`

Here is the same toggle from before, but this time using `data-if` instead of `data-show`.

```alpine
<div data-data="{ open: false }">
    <button @click="open = ! open">Expand</button>

    <template data-if="open">
        <div>
            Content...
        </div>
    </template>
</div>
```

<!-- START_VERBATIM -->
<div data-data="{ open: false }" class="demo">
    <button @click="open = ! open" :aria-pressed="open">Expand</button>

    <template data-if="open">
        <div>
            Content...
        </div>
    </template>
</div>
<!-- END_VERBATIM -->

Notice that `data-if` must be declared on a `<template>` tag. This is so that Alpine can leverage the existing browser behavior of the `<template>` element and use it as the source of the target `<div>` to be added and removed from the page.

When `open` is true, Alpine will append the `<div>` to the `<template>` tag, and remove it when `open` is false.

[→ Read more about `data-if`](/directives/if)

<a name="toggling-with-transitions"></a>
## Toggling with transitions

Alpine makes it simple to smoothly transition between "shown" and "hidden" states using the `data-transition` directive.

> `data-transition` only works with `data-show`, not with `data-if`.

Here is, again, the simple toggle example, but this time with transitions applied:

```alpine
<div data-data="{ open: false }">
    <button @click="open = ! open">Expands</button>

    <div data-show="open" data-transition>
        Content...
    </div>
</div>
```

<!-- START_VERBATIM -->
<div data-data="{ open: false }" class="demo">
    <button @click="open = ! open">Expands</button>

    <div class="flex">
        <div data-show="open" data-transition style="will-change: transform;">
            Content...
        </div>
    </div>
</div>
<!-- END_VERBATIM -->

Let's zoom in on the portion of the template dealing with transitions:

```alpine
<div data-show="open" data-transition>
```

`data-transition` by itself will apply sensible default transitions (fade and scale) to the toggle.

There are two ways to customize these transitions:

* Transition helpers
* Transition CSS classes.

Let's take a look at each of these approaches:

<a name="transition-helpers"></a>
### Transition helpers

Let's say you wanted to make the duration of the transition longer, you can manually specify that using the `.duration` modifier like so:

```alpine
<div data-show="open" data-transition.duration.500ms>
```

<!-- START_VERBATIM -->
<div data-data="{ open: false }" class="demo">
    <button @click="open = ! open">Expands</button>

    <div class="flex">
        <div data-show="open" data-transition.duration.500ms style="will-change: transform;">
            Content...
        </div>
    </div>
</div>
<!-- END_VERBATIM -->

Now the transition will last 500 milliseconds.

If you want to specify different values for in and out transitions, you can use `data-transition:enter` and `data-transition:leave`:

```alpine
<div
    data-show="open"
    data-transition:enter.duration.500ms
    data-transition:leave.duration.1000ms
>
```

<!-- START_VERBATIM -->
<div data-data="{ open: false }" class="demo">
    <button @click="open = ! open">Expands</button>

    <div class="flex">
        <div data-show="open" data-transition:enter.duration.500ms data-transition:leave.duration.1000ms style="will-change: transform;">
            Content...
        </div>
    </div>
</div>
<!-- END_VERBATIM -->

Additionally, you can add either `.opacity` or `.scale` to only transition that property. For example:

```alpine
<div data-show="open" data-transition.opacity>
```

<!-- START_VERBATIM -->
<div data-data="{ open: false }" class="demo">
    <button @click="open = ! open">Expands</button>

    <div class="flex">
        <div data-show="open" data-transition:enter.opacity.duration.500 data-transition:leave.opacity.duration.250>
            Content...
        </div>
    </div>
</div>
<!-- END_VERBATIM -->

[→ Read more about transition helpers](/directives/transition#the-transition-helper)

<a name="transition-classes"></a>
### Transition classes

If you need more fine-grained control over the transitions in your application, you can apply specific CSS classes at specific phases of the transition using the following syntax (this example uses [Tailwind CSS](https://tailwindcss.com/)):

```alpine
<div
    data-show="open"
    data-transition:enter="transition ease-out duration-300"
    data-transition:enter-start="opacity-0 transform scale-90"
    data-transition:enter-end="opacity-100 transform scale-100"
    data-transition:leave="transition ease-in duration-300"
    data-transition:leave-start="opacity-100 transform scale-100"
    data-transition:leave-end="opacity-0 transform scale-90"
>...</div>
```

<!-- START_VERBATIM -->
<div data-data="{ open: false }" class="demo">
    <button @click="open = ! open">Expands</button>

    <div class="flex">
        <div
            data-show="open"
            data-transition:enter="transition ease-out duration-300"
            data-transition:enter-start="opacity-0 transform scale-90"
            data-transition:enter-end="opacity-100 transform scale-100"
            data-transition:leave="transition ease-in duration-300"
            data-transition:leave-start="opacity-100 transform scale-100"
            data-transition:leave-end="opacity-0 transform scale-90"
            style="will-change: transform"
        >
            Content...
        </div>
    </div>
</div>
<!-- END_VERBATIM -->

[→ Read more about transition classes](/directives/transition#applying-css-classes)

<a name="binding-attributes"></a>
## Binding attributes

You can add HTML attributes like `class`, `style`, `disabled`, etc... to elements in Alpine using the `data-bind` directive.

Here is an example of a dynamically bound `class` attribute:

```alpine
<button
    data-data="{ red: false }"
    data-bind:class="red ? 'bg-red' : ''"
    @click="red = ! red"
>
    Toggle Red
</button>
```

<!-- START_VERBATIM -->
<div class="demo">
    <button
        data-data="{ red: false }"
        data-bind:style="red && 'background: red'"
        @click="red = ! red"
    >
        Toggle Red
    </button>
</div>
<!-- END_VERBATIM -->


As a shortcut, you can leave out the `data-bind` and use the shorthand `:` syntax directly:

```alpine
<button ... :class="red ? 'bg-red' : ''">
```

Toggling classes on and off based on data inside Alpine is a common need. Here's an example of toggling a class using Alpine's `class` binding object syntax: (Note: this syntax is only available for `class` attributes)

```alpine
<div data-data="{ open: true }">
    <span :class="{ 'hidden': ! open }">...</span>
</div>
```

Now the `hidden` class will be added to the element if `open` is false, and removed if `open` is true.

<a name="looping-elements"></a>
## Looping elements

Alpine allows for iterating parts of your template based on JavaScript data using the `data-for` directive. Here is a simple example:

```alpine
<div data-data="{ statuses: ['open', 'closed', 'archived'] }">
    <template data-for="status in statuses">
        <div data-text="status"></div>
    </template>
</div>
```

<!-- START_VERBATIM -->
<div data-data="{ statuses: ['open', 'closed', 'archived'] }" class="demo">
    <template data-for="status in statuses">
        <div data-text="status"></div>
    </template>
</div>
<!-- END_VERBATIM -->

Similar to `data-if`, `data-for` must be applied to a `<template>` tag. Internally, Alpine will append the contents of `<template>` tag for every iteration in the loop.

As you can see the new `status` variable is available in the scope of the iterated templates.

[→ Read more about `data-for`](/directives/for)

<a name="inner-html"></a>
## Inner HTML

Alpine makes it easy to control the HTML content of an element with the `data-html` directive.

```alpine
<div data-data="{ title: '<h1>Start Here</h1>' }">
    <div data-html="title"></div>
</div>
```

<!-- START_VERBATIM -->
<div data-data="{ title: '<h1>Start Here</h1>' }" class="demo">
    <div data-html="title"></div>
</div>
<!-- END_VERBATIM -->

Now, Alpine will set the text content of the `<div>` with the element `<h1>Start Here</h1>`. When `title` changes, so will the contents of `<h1>`.

> ⚠️ Only use on trusted content and never on user-provided content. ⚠️
> Dynamically rendering HTML from third parties can easily lead to XSS vulnerabilities.

[→ Read more about `data-html`](/directives/html)
