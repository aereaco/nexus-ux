---
order: 6
title: text
---

# data-text

`data-text` sets the text content of an element to the result of a given expression.

Here's a basic example of using `data-text` to display a user's username.

```alpine
<div data-data="{ username: 'calebporzio' }">
    Username: <strong data-text="username"></strong>
</div>
```

<!-- START_VERBATIM -->
<div class="demo">
    <div data-data="{ username: 'calebporzio' }">
        Username: <strong data-text="username"></strong>
    </div>
</div>
<!-- END_VERBATIM -->

Now the `<strong>` tag's inner text content will be set to "calebporzio".
