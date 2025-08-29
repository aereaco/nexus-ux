---
order: 16
title: if
---

# data-if

`data-if` is used for toggling elements on the page, similarly to `data-show`, however it completely adds and removes the element it's applied to rather than just changing its CSS display property to "none".

Because of this difference in behavior, `data-if` should not be applied directly to the element, but instead to a `<template>` tag that encloses the element. This way, Alpine can keep a record of the element once it's removed from the page.

```alpine
<template data-if="open">
    <div>Contents...</div>
</template>
```

> Despite not being included in the above snippet, `data-if` cannot be used if no parent element has `data-data` defined. [→ Read more about `data-data`](/directives/data)

## Caveats

Unlike `data-show`, `data-if`, does NOT support transitioning toggles with `data-transition`.

`<template>` tags can only contain one root element.
