---
order: 3
title: bind()
---

# Alpine.bind

`Alpine.bind(...)` provides a way to re-use [`data-bind`](/directives/bind#bind-directives) objects within your application.

Here's a simple example. Rather than binding attributes manually with Alpine:

```alpine
<button type="button" @click="doSomething()" :disabled="shouldDisable"></button>
```

You can bundle these attributes up into a reusable object and use `data-bind` to bind to that:

```alpine
<button data-bind="SomeButton"></button>

<script>
    document.addEventListener('alpine:init', () => {
        Alpine.bind('SomeButton', () => ({
            type: 'button',

            '@click'() {
                this.doSomething()
            },

            ':disabled'() {
                return this.shouldDisable
            },
        }))
    })
</script>
```
