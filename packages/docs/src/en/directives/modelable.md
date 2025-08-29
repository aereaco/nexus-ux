---
order: 7
title: modelable
---

# data-modelable

`data-modelable` allows you to expose any Alpine property as the target of the `data-model` directive.

Here's a simple example of using `data-modelable` to expose a variable for binding with `data-model`.

```alpine
<div data-data="{ number: 5 }">
    <div data-data="{ count: 0 }" data-modelable="count" data-model="number">
        <button @click="count++">Increment</button>
    </div>

    Number: <span data-text="number"></span>
</div>
```

<!-- START_VERBATIM -->
<div class="demo">
    <div data-data="{ number: 5 }">
        <div data-data="{ count: 0 }" data-modelable="count" data-model="number">
            <button @click="count++">Increment</button>
        </div>

        Number: <span data-text="number"></span>
    </div>
</div>
<!-- END_VERBATIM -->

As you can see the outer scope property "number" is now bound to the inner scope property "count".

Typically this feature would be used in conjunction with a backend templating framework like Laravel Blade. It's useful for abstracting away Alpine components into backend templates and exposing state to the outside through `data-model` as if it were a native input.
