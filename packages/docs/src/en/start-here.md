---
order: 1
title: Start Here
---

# Start Here

Create a blank HTML file somewhere on your computer with a name like: `i-love-alpine.html`

Using a text editor, fill the file with these contents:

```alpine
<html>
<head>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body>
    <h1 data-data="{ message: 'I ❤️ Alpine' }" data-text="message"></h1>
</body>
</html>
```

Open your file in a web browser, if you see `I ❤️ Alpine`, you're ready to rumble!

Now that you're all set up to play around, let's look at three practical examples as a foundation for teaching you the basics of Alpine. By the end of this exercise, you should be more than equipped to start building stuff on your own. Let's goooooo.

<!-- START_VERBATIM -->
<ul class="flex flex-col space-y-2 list-inside !list-decimal">
    <li><a href="#building-a-counter">Building a counter</a></li>
    <li><a href="#building-a-dropdown">Building a dropdown</a></li>
    <li><a href="#building-a-search-input">Building a search Input</a></li>
</ul>
<!-- END_VERBATIM -->

<a name="building-a-counter"></a>
## Building a counter

Let's start with a simple "counter" component to demonstrate the basics of state and event listening in Alpine, two core features.

Insert the following into the `<body>` tag:

```alpine
<div data-data="{ count: 0 }">
    <button data-on:click="count++">Increment</button>

    <span data-text="count"></span>
</div>
```

<!-- START_VERBATIM -->
<div class="demo">
    <div data-data="{ count: 0 }">
        <button data-on:click="count++">Increment</button>
        <span data-text="count"></span>
    </div>
</div>
<!-- END_VERBATIM -->

Now, you can see with 3 bits of Alpine sprinkled into this HTML, we've created an interactive "counter" component.

Let's walk through what's happening briefly:

<a name="declaring-data"></a>
### Declaring data

```alpine
<div data-data="{ count: 0 }">
```

Everything in Alpine starts with an `data-data` directive. Inside of `data-data`, in plain JavaScript, you declare an object of data that Alpine will track.

Every property inside this object will be made available to other directives inside this HTML element. In addition, when one of these properties changes, everything that relies on it will change as well.

> `data-data` is required on a parent element for most Alpine directives to work.

[→ Read more about `data-data`](/directives/data)

Let's look at `data-on` and see how it can access and modify the `count` property from above:

<a name="listening-for-events"></a>
### Listening for events

```alpine
<button data-on:click="count++">Increment</button>
```

`data-on` is a directive you can use to listen for any event on an element. We're listening for a `click` event in this case, so ours looks like `data-on:click`.

You can listen for other events as you'd imagine. For example, listening for a `mouseenter` event would look like this: `data-on:mouseenter`.

When a `click` event happens, Alpine will call the associated JavaScript expression, `count++` in our case. As you can see, we have direct access to data declared in the `data-data` expression.

> You will often see `@` instead of `data-on:`. This is a shorter, friendlier syntax that many prefer. From now on, this documentation will likely use `@` instead of `data-on:`.

[→ Read more about `data-on`](/directives/on)

<a name="reacting-to-changes"></a>
### Reacting to changes

```alpine
<span data-text="count"></span>
```

`data-text` is an Alpine directive you can use to set the text content of an element to the result of a JavaScript expression.

In this case, we're telling Alpine to always make sure that the contents of this `span` tag reflect the value of the `count` property.

In case it's not clear, `data-text`, like most directives accepts a plain JavaScript expression as an argument. So for example, you could instead set its contents to: `data-text="count * 2"` and the text content of the `span` will now always be 2 times the value of `count`.

[→ Read more about `data-text`](/directives/text)

<a name="building-a-dropdown"></a>
## Building a dropdown

Now that we've seen some basic functionality, let's keep going and look at an important directive in Alpine: `data-show`, by building a contrived "dropdown" component.

Insert the following code into the `<body>` tag:

```alpine
<div data-data="{ open: false }">
    <button @click="open = ! open">Toggle</button>

    <div data-show="open" @click.outside="open = false">Contents...</div>
</div>
```

<!-- START_VERBATIM -->
<div class="demo">
    <div data-data="{ open: false }">
        <button @click="open = ! open">Toggle</button>
        <div data-show="open" @click.outside="open = false">Contents...</div>
    </div>
</div>
<!-- END_VERBATIM -->

If you load this component, you should see that the "Contents..." are hidden by default. You can toggle showing them on the page by clicking the "Toggle" button.

The `data-data` and `data-on` directives should be familiar to you from the previous example, so we'll skip those explanations.

<a name="toggling-elements"></a>
### Toggling elements

```alpine
<div data-show="open" ...>Contents...</div>
```

`data-show` is an extremely powerful directive in Alpine that can be used to show and hide a block of HTML on a page based on the result of a JavaScript expression, in our case: `open`.

[→ Read more about `data-show`](/directives/show)

<a name="listening-for-a-click-outside"></a>
### Listening for a click outside

```alpine
<div ... @click.outside="open = false">Contents...</div>
```

You'll notice something new in this example: `.outside`. Many directives in Alpine accept "modifiers" that are chained onto the end of the directive and are separated by periods.

In this case, `.outside` tells Alpine to instead of listening for a click INSIDE the `<div>`, to listen for the click only if it happens OUTSIDE the `<div>`.

This is a convenience helper built into Alpine because this is a common need and implementing it by hand is annoying and complex.

[→ Read more about `data-on` modifiers](/directives/on#modifiers)

<a name="building-a-search-input"></a>
## Building a search input

Let's now build a more complex component and introduce a handful of other directives and patterns.

Insert the following code into the `<body>` tag:

```alpine
<div
    data-data="{
        search: '',

        items: ['foo', 'bar', 'baz'],

        get filteredItems() {
            return this.items.filter(
                i => i.startsWith(this.search)
            )
        }
    }"
>
    <input data-model="search" placeholder="Search...">

    <ul>
        <template data-for="item in filteredItems" :key="item">
            <li data-text="item"></li>
        </template>
    </ul>
</div>
```

<!-- START_VERBATIM -->
<div class="demo">
    <div
        data-data="{
            search: '',

            items: ['foo', 'bar', 'baz'],

            get filteredItems() {
                return this.items.filter(
                    i => i.startsWith(this.search)
                )
            }
        }"
    >
        <input data-model="search" placeholder="Search...">

        <ul class="pl-6 pt-2">
            <template data-for="item in filteredItems" :key="item">
                <li data-text="item"></li>
            </template>
        </ul>
    </div>
</div>
<!-- END_VERBATIM -->

By default, all of the "items" (foo, bar, and baz) will be shown on the page, but you can filter them by typing into the text input. As you type, the list of items will change to reflect what you're searching for.

Now there's quite a bit happening here, so let's go through this snippet piece by piece.

<a name="multi-line-formatting"></a>
### Multi line formatting

The first thing I'd like to point out is that `data-data` now has a lot more going on in it than before. To make it easier to write and read, we've split it up into multiple lines in our HTML. This is completely optional and we'll talk more in a bit about how to avoid this problem altogether, but for now, we'll keep all of this JavaScript directly in the HTML.

<a name="binding-to-inputs"></a>
### Binding to inputs

```alpine
<input data-model="search" placeholder="Search...">
```

You'll notice a new directive we haven't seen yet: `data-model`.

`data-model` is used to "bind" the value of an input element with a data property: "search" from `data-data="{ search: '', ... }"` in our case.

This means that anytime the value of the input changes, the value of "search" will change to reflect that.

`data-model` is capable of much more than this simple example.

[→ Read more about `data-model`](/directives/model)

<a name="computed-properties-using-getters"></a>
### Computed properties using getters

The next bit I'd like to draw your attention to is the `items` and `filteredItems` properties from the `data-data` directive.

```js
{
    ...
    items: ['foo', 'bar', 'baz'],

    get filteredItems() {
        return this.items.filter(
            i => i.startsWith(this.search)
        )
    }
}
```

The `items` property should be self-explanatory. Here we are setting the value of `items` to a JavaScript array of 3 different items (foo, bar, and baz).

The interesting part of this snippet is the `filteredItems` property.

Denoted by the `get` prefix for this property, `filteredItems` is a "getter" property in this object. This means we can access `filteredItems` as if it was a normal property in our data object, but when we do, JavaScript will evaluate the provided function under the hood and return the result.

It's completely acceptable to forgo the `get` and just make this a method that you can call from the template, but some prefer the nicer syntax of the getter.

[→ Read more about JavaScript getters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get)

Now let's look inside the `filteredItems` getter and make sure we understand what's going on there:

```js
return this.items.filter(
    i => i.startsWith(this.search)
)
```

This is all plain JavaScript. We are first getting the array of items (foo, bar, and baz) and filtering them using the provided callback: `i => i.startsWith(this.search)`.

By passing in this callback to `filter`, we are telling JavaScript to only return the items that start with the string: `this.search`, which like we saw with `data-model` will always reflect the value of the input.

You may notice that up until now, we haven't had to use `this.` to reference properties. However, because we are working directly inside the `data-data` object, we must reference any properties using `this.[property]` instead of simply `[property]`.

Because Alpine is a "reactive" framework. Any time the value of `this.search` changes, parts of the template that use `filteredItems` will automatically be updated.

<a name="looping-elements"></a>
### Looping elements

Now that we understand the data part of our component, let's understand what's happening in the template that allows us to loop through `filteredItems` on the page.

```alpine
<ul>
    <template data-for="item in filteredItems">
        <li data-text="item"></li>
    </template>
</ul>
```

The first thing to notice here is the `data-for` directive. `data-for` expressions take the following form: `[item] in [items]` where [items] is any array of data, and [item] is the name of the variable that will be assigned to an iteration inside the loop.

Also notice that `data-for` is declared on a `<template>` element and not directly on the `<li>`. This is a requirement of using `data-for`. It allows Alpine to leverage the existing behavior of `<template>` tags in the browser to its advantage.

Now any element inside the `<template>` tag will be repeated for every item inside `filteredItems` and all expressions evaluated inside the loop will have direct access to the iteration variable (`item` in this case).

[→ Read more about `data-for`](/directives/for)

<a name="recap"></a>
## Recap

If you've made it this far, you've been exposed to the following directives in Alpine:

* data-data
* data-on
* data-text
* data-show
* data-model
* data-for

That's a great start, however, there are many more directives to sink your teeth into. The best way to absorb Alpine is to read through this documentation. No need to comb over every word, but if you at least glance through every page you will be MUCH more effective when using Alpine.

Happy Coding!
