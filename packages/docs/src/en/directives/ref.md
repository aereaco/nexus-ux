---
order: 11
title: ref
---

# data-ref

`data-ref` in combination with `$refs` is a useful utility for easily accessing DOM elements directly. It's most useful as a replacement for APIs like `getElementById` and `querySelector`.

```alpine
<button @click="$refs.text.remove()">Remove Text</button>

<span data-ref="text">Hello 👋</span>
```

<!-- START_VERBATIM -->
<div class="demo">
    <div data-signal>
        <button @click="$refs.text.remove()">Remove Text</button>

        <div class="pt-4" data-ref="text">Hello 👋</div>
    </div>
</div>
<!-- END_VERBATIM -->

> Despite not being included in the above snippet, `data-ref` cannot be used if no parent element has `data-signal` defined. [→ Read more about `data-signal`](/directives/data)
