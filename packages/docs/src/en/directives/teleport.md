---
order: 12
title: teleport
description: Send Alpine templates to other parts of the DOM
graph_image: https://alpinejs.dev/social_teleport.jpg
---

# data-teleport

The `data-teleport` directive allows you to transport part of your Alpine template to another part of the DOM on the page entirely.

This is useful for things like modals (especially nesting them), where it's helpful to break out of the z-index of the current Alpine component.

<a name="data-teleport"></a>
## data-teleport

By attaching `data-teleport` to a `<template>` element, you are telling Alpine to "append" that element to the provided selector.

> The `data-teleport` selector can be any string you would normally pass into something like `document.querySelector`. It will find the first element that matches, be it a tag name (`body`), class name (`.my-class`), ID (`#my-id`), or any other valid CSS selector.

[→ Read more about `document.querySelector`](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)

Here's a contrived modal example:

```alpine
<body>
    <div data-signal="{ open: false }">
        <button @click="open = ! open">Toggle Modal</button>

        <template data-teleport="body">
            <div data-show="open">
                Modal contents...
            </div>
        </template>
    </div>

    <div>Some other content placed AFTER the modal markup.</div>

    ...

</body>
```

<!-- START_VERBATIM -->
<div class="demo" data-ref="root" id="modal2">
    <div data-signal="{ open: false }">
        <button @click="open = ! open">Toggle Modal</button>

        <template data-teleport="#modal2">
            <div data-show="open">
                Modal contents...
            </div>
        </template>

    </div>

    <div class="py-4">Some other content placed AFTER the modal markup.</div>
</div>
<!-- END_VERBATIM -->

Notice how when toggling the modal, the actual modal contents show up AFTER the "Some other content..." element? This is because when Alpine is initializing, it sees `data-teleport="body"` and appends and initializes that element to the provided element selector.

<a name="forwarding-events"></a>
## Forwarding events

Alpine tries its best to make the experience of teleporting seamless. Anything you would normally do in a template, you should be able to do inside an `data-teleport` template. Teleported content can access the normal Alpine scope of the component as well as other features like `$refs`, `$root`, etc...

However, native DOM events have no concept of teleportation, so if, for example, you trigger a "click" event from inside a teleported element, that event will bubble up the DOM tree as it normally would.

To make this experience more seamless, you can "forward" events by simply registering event listeners on the `<template data-teleport...>` element itself like so:

```alpine
<div data-signal="{ open: false }">
    <button @click="open = ! open">Toggle Modal</button>

    <template data-teleport="body" @click="open = false">
        <div data-show="open">
            Modal contents...
            (click to close)
        </div>
    </template>
</div>
```

<!-- START_VERBATIM -->
<div class="demo" data-ref="root" id="modal3">
    <div data-signal="{ open: false }">
        <button @click="open = ! open">Toggle Modal</button>

        <template data-teleport="#modal3" @click="open = false">
            <div data-show="open">
                Modal contents...
                <div>(click to close)</div>
            </div>
        </template>
    </div>
</div>
<!-- END_VERBATIM -->

Notice how we are now able to listen for events dispatched from within the teleported element from outside the `<template>` element itself?

Alpine does this by looking for event listeners registered on `<template data-teleport...>` and stops those events from propagating past the live, teleported, DOM element. Then, it creates a copy of that event and re-dispatches it from `<template data-teleport...>`.

<a name="nesting"></a>
## Nesting

Teleporting is especially helpful if you are trying to nest one modal within another. Alpine makes it simple to do so:

```alpine
<div data-signal="{ open: false }">
    <button @click="open = ! open">Toggle Modal</button>

    <template data-teleport="body">
        <div data-show="open">
            Modal contents...

            <div data-signal="{ open: false }">
                <button @click="open = ! open">Toggle Nested Modal</button>

                <template data-teleport="body">
                    <div data-show="open">
                        Nested modal contents...
                    </div>
                </template>
            </div>
        </div>
    </template>
</div>
```

<!-- START_VERBATIM -->
<div class="demo" data-ref="root" id="modal4">
    <div data-signal="{ open: false }">
        <button @click="open = ! open">Toggle Modal</button>

        <template data-teleport="#modal4">
            <div data-show="open">
                <div class="py-4">Modal contents...</div>

                <div data-signal="{ open: false }">
                    <button @click="open = ! open">Toggle Nested Modal</button>

                    <template data-teleport="#modal4">
                        <div class="pt-4" data-show="open">
                            Nested modal contents...
                        </div>
                    </template>
                </div>
            </div>
        </template>
    </div>

    <template data-teleport-target="modals3"></template>
</div>
<!-- END_VERBATIM -->

After toggling "on" both modals, they are authored as children, but will be rendered as sibling elements on the page, not within one another.
