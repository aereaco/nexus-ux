---
order: 11
title: ignore
---

# data-ignore

By default, Alpine will crawl and initialize the entire DOM tree of an element containing `data-init` or `data-data`.

If for some reason, you don't want Alpine to touch a specific section of your HTML, you can prevent it from doing so using `data-ignore`.

```alpine
<div data-data="{ label: 'From Alpine' }">
    <div data-ignore>
        <span data-text="label"></span>
    </div>
</div>
```

In the above example, the `<span>` tag will not contain "From Alpine" because we told Alpine to ignore the contents of the `div` completely.
