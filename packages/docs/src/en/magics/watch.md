---
order: 4
title: watch
---

# $watch

You can "watch" a component property using the `$watch` magic method. For example:

```alpine
<div data-signal="{ open: false }" data-init="$watch('open', value => console.log(value))">
    <button @click="open = ! open">Toggle Open</button>
</div>
```

In the above example, when the button is pressed and `open` is changed, the provided callback will fire and `console.log` the new value:

You can watch deeply nested properties using "dot" notation

```alpine
<div data-signal="{ foo: { bar: 'baz' }}" data-init="$watch('foo.bar', value => console.log(value))">
    <button @click="foo.bar = 'bob'">Toggle Open</button>
</div>
```

When the `<button>` is pressed, `foo.bar` will be set to "bob", and "bob" will be logged to the console.

<a name="getting-the-old-value"></a>
### Getting the "old" value

`$watch` keeps track of the previous value of the property being watched, You can access it using the optional second argument to the callback like so:

```alpine
<div data-signal="{ open: false }" data-init="$watch('open', (value, oldValue) => console.log(value, oldValue))">
    <button @click="open = ! open">Toggle Open</button>
</div>
```

<a name="deep-watching"></a>
### Deep watching

`$watch` automatically watches from changes at any level but you should keep in mind that, when a change is detected, the watcher will return the value of the observed property, not the value of the subproperty that has changed.

```alpine
<div data-signal="{ foo: { bar: 'baz' }}" data-init="$watch('foo', (value, oldValue) => console.log(value, oldValue))">
    <button @click="foo.bar = 'bob'">Update</button>
</div>
```

When the `<button>` is pressed, `foo.bar` will be set to "bob", and "{bar: 'bob'} {bar: 'baz'}" will be logged to the console (new and old value).

> ⚠️ Changing a property of a "watched" object as a side effect of the `$watch` callback will generate an infinite loop and eventually error. 

```alpine
<!-- 🚫 Infinite loop -->
<div data-signal="{ foo: { bar: 'baz', bob: 'lob' }}" data-init="$watch('foo', value => foo.bob = foo.bar)">
    <button @click="foo.bar = 'bob'">Update</button>
</div>
```
