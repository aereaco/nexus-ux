---
order: 7
prefix: $
title: root
---

# $root

`$root` is a sprite property that can be used to retrieve the root element of any Alpine component. In other words the closest element up the DOM tree that contains `data-signal`.

```alpine
<div data-signal data-message="Hello World!">
    <button @click="alert($root.dataset.message)">Say Hi</button>
</div>
```

<!-- START_VERBATIM -->
<div data-signal data-message="Hello World!" class="demo">
    <button @click="alert($root.dataset.message)">Say Hi</button>
</div>
<!-- END_VERBATIM -->
