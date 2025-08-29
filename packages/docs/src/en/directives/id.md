---
order: 17
title: id
---

# data-id

`data-id` allows you to declare a new "scope" for any new IDs generated using `$id()`. It accepts an array of strings (ID names) and adds a suffix to each `$id('...')` generated within it that is unique to other IDs on the page.

`data-id` is meant to be used in conjunction with the `$id(...)` magic.

[Visit the $id documentation](/magics/id) for a better understanding of this feature.

Here's a brief example of this directive in use:

```alpine
<div data-id="['text-input']">
    <label :for="$id('text-input')">Username</label>
    <!-- for="text-input-1" -->

    <input type="text" :id="$id('text-input')">
    <!-- id="text-input-1" -->
</div>

<div data-id="['text-input']">
    <label :for="$id('text-input')">Username</label>
    <!-- for="text-input-2" -->

    <input type="text" :id="$id('text-input')">
    <!-- id="text-input-2" -->
</div>
```

> Despite not being included in the above snippet, `data-id` cannot be used if no parent element has `data-signal` defined. [→ Read more about `data-signal`](/directives/data)
