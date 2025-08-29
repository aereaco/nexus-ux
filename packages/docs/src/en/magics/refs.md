---
order: 2
prefix: $
title: refs
---

# $refs

`$refs` is a magic property that can be used to retrieve DOM elements marked with `data-ref` inside the component. This is useful when you need to manually manipulate DOM elements. It's often used as a more succinct, scoped, alternative to `document.querySelector`.

```alpine
<button @click="$refs.text.remove()">Remove Text</button>

<span data-ref="text">Hello 👋</span>
```

<!-- START_VERBATIM -->
<div class="demo">
    <div data-data>
        <button @click="$refs.text.remove()">Remove Text</button>

        <div class="pt-4" data-ref="text">Hello 👋</div>
    </div>
</div>
<!-- END_VERBATIM -->

Now, when the `<button>` is pressed, the `<span>` will be removed.

<a name="limitations"></a>
### Limitations

In V2 it was possible to bind `$refs` to elements dynamically, like seen below:

```alpine
<template data-for="item in items" :key="item.id" >
    <div :data-ref="item.name">
    some content ...
    </div>
</template>
```

However, in V3, `$refs` can only be accessed for elements that are created statically. So for the example above: if you were expecting the value of `item.name` inside of `$refs` to be something like *Batteries*, you should be aware that `$refs` will actually contain the literal string `'item.name'` and not *Batteries*.
