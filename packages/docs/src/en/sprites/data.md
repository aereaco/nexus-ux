---
order: 8
prefix: $
title: data
---

# $data

`$data` is a sprite property that gives you access to the current Alpine data scope (generally provided by `data-signal`).

Most of the time, you can just access Alpine data within expressions directly. for example `data-signal="{ message: 'Hello Caleb!' }"` will allow you to do things like `data-text="message"`.

However, sometimes it is helpful to have an actual object that encapsulates all scope that you can pass around to other functions:

```alpine
<div data-signal="{ greeting: 'Hello' }">
    <div data-signal="{ name: 'Caleb' }">
        <button @click="sayHello($data)">Say Hello</button>
    </div>
</div>

<script>
    function sayHello({ greeting, name }) {
        alert(greeting + ' ' + name + '!')
    }
</script>
```

<!-- START_VERBATIM -->
<div data-signal="{ greeting: 'Hello' }" class="demo">
    <div data-signal="{ name: 'Caleb' }">
        <button @click="sayHello($data)">Say Hello</button>
    </div>
</div>

<script>
    function sayHello({ greeting, name }) {
        alert(greeting + ' ' + name + '!')
    }
</script>
<!-- END_VERBATIM -->

Now when the button is pressed, the browser will alert `Hello Caleb!` because it was passed a data object that contained all the Alpine scope of the expression that called it (`@click="..."`).

Most applications won't need this sprite property, but it can be very helpful for deeper, more complicated Alpine utilities.
