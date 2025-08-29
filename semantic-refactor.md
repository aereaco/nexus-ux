# Semantic refactor: migrate from `x-*` attributes to `data-*` and `HTMLElement.dataset`

Summary

This document recommends a comprehensive, incremental strategy to migrate the framework from `x-*` custom attributes (e.g. `x-data`, `x-on:click`) to standard `data-*` attributes (e.g. `data-signal`, `data-on-click`) and—where appropriate—leverage the browser's native `HTMLElement.prototype.dataset` for reading/writing static values.

Goals

- Use `data-*` attributes to be HTML standard compliant and take advantage of `element.dataset` where safe.
- Preserve current runtime expressiveness (directives, modifiers, short-hand like `@` and `:`) via a compatibility/shim layer and a well-defined migration path.
- Improve performance and simplify code where native dataset access removes parsing work.
- Provide a clear, reversible migration path with tests, lints, and tooling to help repository and third-party users transition.

High-level recommendation

- Make a minimal, **non-breaking** switch first: expose a runtime configuration `prefix` (current `prefixAsString`) and default it to `data-` (or allow `x-` for backward compatibility for a period).
- Introduce a pluggable attribute-source abstraction that centralizes attribute reads/writes. Implement two concrete providers:
  - DOM-attributes provider (current behavior reading element attributes; supports `x-*` and current parsing logic).
  - dataset provider (reads/writes `element.dataset` with a stable naming/mapping convention).
- Initially use the dataset provider only for simple, well-structured directives (like data attributes that map cleanly to dataset names and primitive values). Keep the DOM-attributes provider for directives that rely on complex names, modifiers, or shorthand.
- Gradually expand dataset usage, copying/parsing existing attribute forms into dataset on initialization (optional) and surfacing migration warnings.
- Provide a feature-flagged full-mode to operate purely on dataset and remove legacy parsing once the ecosystem migrates.

Compatibility matrix (short)

| Feature / Syntax | x-* equivalent | data-* mapping | Can map to dataset? | Notes |
|---|---:|---|---:|---|
| Directive base name | `x-data` | `data-signal` | Yes | dataset key `data` (element.dataset.data). Mind camelCase conversion. |
| Value expression | `x-bind:value="foo"` | `data-bind-value="foo"` | No (value strings only) | dataset stores string; still OK but modifiers and `:` parts need parsing. |
| Modifiers | `x-on:click.prevent` | `data-on-click.prevent` | Partially | dataset keys cannot include `.` or `:`; store full attribute string on dataset key or split into `data-on-click` and keep modifiers in string. |
| Short-hand `@` | `@click` | `data-on-click` / `data-on` mapping | Yes via pre-processing | Support syntax mapping during parsing phase or with developer tooling. |

Key technical decisions and trade-offs

1) Use dataset for static, semantic key/value directives. Keep attribute parsing for complex directive grammar.

- Pros: `element.dataset` is fast and native, simpler typed access, avoids repeated attribute parsing for reads.
- Cons: `dataset` converts hyphen-case to camelCase (e.g. `data-some-prop` -> `dataset.someProp`) which changes key names; it only stores strings; complex grammar (modifiers, colons, dotted names) can't be represented directly in dataset property names.
 Pros: `element.dataset` is fast and native, simpler typed access, avoids repeated attribute parsing for reads.
 
 Cons: `dataset` converts hyphen-case to camelCase (e.g. `data-some-prop` -> `dataset.someProp`) which changes key names; it only stores strings; complex grammar (modifiers, colons, dotted names) can't be represented directly in dataset property names.
 
 Important dataset behavior and access patterns
 
 - Allowed characters in `data-*` attribute names: letters, numbers, dashes (-), periods (.), colons (:), and underscores (_). Uppercase ASCII letters are converted to lowercase by the browser.
 - Hyphenated (kebab-case) data attributes are converted to camelCase dataset properties for dot-notation access. Example:
 
 ```html
 <div id="product" data-product-id="12345" data-stock-status="in-stock"></div>
 ```
 
 ```js
 const product = document.getElementById('product')
 console.log(product.dataset.productId)    // "12345"
 console.log(product.dataset.stockStatus)  // "in-stock"
 ```
 
 - For attribute names that include periods (.) or underscores (_), you must use bracket notation on `dataset` because dot notation will not work for those literal characters. Example:
 
 ```html
 <div id="settings" data-user.id="user-1" data-user_role="admin"></div>
 ```
 
 ```js
 const settings = document.getElementById('settings')
 console.log(settings.dataset['user.id'])    // "user-1"
 console.log(settings.dataset['user_role'])  // "admin"
 ```
 
 - Bracket notation also works for hyphenated names if you prefer a consistent access style:
 
 ```js
 console.log(product.dataset['product-id']) // "12345"
 ```
 
 - Fallback: `getAttribute('data-...')` returns the verbatim string for any valid `data-*` attribute name, irrespective of dataset normalization. Use `getAttribute` when you need the original attribute name or when the name contains characters that complicate `dataset` access (colons, dots, underscores), or when you want to avoid the camelCase mapping.
 
 These patterns affect how we design `DatasetAttributeSource` and our canonical mapping rules. Prefer dataset dot-notation for simple, hyphenated names. Use bracket notation or `getAttribute` in the dataset provider when dealing with periods/underscores or when preserving verbatim keys is necessary.

2) Centralize the attribute-reading logic behind an `AttributeSource` interface.

- Interface example:
  - getRawAttribute(el, fullName) -> string | null
  - hasAttribute(el, fullName) -> boolean
  - setAttribute(el, fullName, value)
  - removeAttribute(el, fullName)
  - listAttributes(el) -> Iterable<{name, value}>

- Two implementations:
  - `DomAttributeSource` uses `el.getAttribute` / `el.removeAttribute` / `el.attributes` (preserve exact behavior).
  - `DatasetAttributeSource` maps directive names to dataset keys and uses `el.dataset` (with deterministic mapping rules).

3) Migration mapping rules.

- Naming rule: `x-foo:bar.baz` -> `data-foo-bar` (value string keeps `:bar.baz` semantics) OR `data-foo:bar.baz` if you prefer preserving the colon. To remain fully standard, avoid using `:` and `.` in attribute names: use hyphen separators and encode modifiers as part of the value.
- Canonical mapping: `x-on:click.prevent` => `data-on-click="click.prevent"` or `data-on-click="handlerExpression" data-on-click-modifiers="prevent,stop"`.
- Prefer storing structured metadata in dataset keys suffixed with `-meta` or using JSON inside the dataset value: `data-list-meta='{ "modifiers": ["prevent"] }'` (simple and explicit, but JSON values are strings and require parsing).

4) Reintroducing syntactic sugar (`@`, `:`) without non-standard attributes.

- Option 1 — Preprocessor transform (recommended for developer ergonomics):
  - Add an optional lightweight preprocessor that canonicalizes shorthand into `data-*` attribute forms during build or runtime (e.g., `@click` -> `data-on-click`). For runtime-only support, the parser accepts shorthand and resolves to canonical dataset keys.
- Option 2 — Maintain a tiny legacy parser that accepts `@` in DOM attributes and maps to data-* equivalents at parse time.

5) Maintain a configurable `prefix` variable (like `prefixAsString`) and a runtime flag `useDataset` so projects can opt-in gradually.

Implementation plan (phased)

Phase 0 — Prep (safe):
- Add a runtime config `Alpine.config.attrPrefix` and default to `'data-'` for the fork, but keep the ability to set `'x-'` to preserve compatibility.
- Add the `AttributeSource` abstraction.
- Add tests for the existing parsing and behavior (baseline).

Phase 1 — Dual-read, non-breaking (low-risk):
- Implement `DatasetAttributeSource` that maps canonical names to dataset keys using a documented rule (see mapping rules). Implement it to *fallback to DOM attributes* for anything not found in dataset.
- Change directive registration and scanning to read via `AttributeProvider.get` which first consults the dataset provider then DOM provider (configurable order).
- Add runtime warnings (console.info) for attributes found only on `x-*` to encourage migration.
- Add small optimizer: when a directive is read from DOM attributes and a dataset equivalent is missing, copy/normalize the value into dataset on initialization (respect `data-*` naming rules). This is optional and gated behind `config.migrateAttributes=true`.

Phase 2 — Tooling & ergonomics (developer convenience):
- Add a small Babel/ESBuild transform or optional HTML preprocessor plugin that translates `@` and `:` shorthand into `data-*` HTML during build (helpful for statically authored templates). Provide a CLI script for static pages too.
- Add a linter rule (eslint-plugin or another checker) to flag `x-*` usage and suggest `data-*` equivalents.

Phase 3 — Strict dataset mode (breaking, opt-in):
- Offer an opt-in `strictDatasetMode` that rejects non-data attributes and treats dataset as the canonical source.
- When strict mode is enabled, use dataset-only AttributeSource and fail fast with developer-friendly messages for unrepresentable directives.

Phase 4 — Clean-up & remove legacy code (breaking):
- Remove DOM-attributes provider and legacy parsing code after adoption period.
- Tighten runtime types and remove duplicative parsing code paths.

Migration steps (developer-facing)

1) Immediate toggle: Change `prefixAsString` default to `'data-'` (simple, non-breaking if you keep the DOM-attribute provider enabled). This lets new templates use `data-*` while still supporting `x-*` attributes.

2) Add the `AttributeSource` abstraction and implement the dual provider (dataset + dom) as above.

3) Ship the migration branch with both behaviors and an opt-in `strictDatasetMode`.

4) Provide a migration helper script that walks the codebase and suggests or optionally rewrites attributes:
- Convert `@click` -> `data-on-click` (or `data-on="click"`), with an optional modifiers metadata field.
- Convert `x-bind:foo` -> `data-bind-foo`.

5) Communicate with consumers and publish migration docs and an automated codemod (jscodeshift or equivalent) to rewrite static HTML/JSX files.

API changes and examples

- Current: `<button x-on:click.prevent="doIt()">` and shorthand `@click`.
- Suggested canonical data-* equivalent (preserve runtime expressiveness):
  - `<button data-on-click="doIt()" data-on-click-modifiers="prevent">` (explicit modifiers key)
  - Or compact: `<button data-on-click="doIt()|prevent,stop">` (pipe + comma encoding) — tradeoffs: compact vs parsing complexity.

- Example parsing helper (runtime, supports both forms):

```ts
function parseDirectiveFromDataset(el: HTMLElement, type: string, name: string) {
  // canonical key is `data-${type}-${name}` => dataset[camelCase(type + '-' + name)]
  const datasetKey = toDatasetKey(`${type}-${name}`) // implement hyphen->camelCase
  const raw = (el as any).dataset[datasetKey]
  const modifiers = (el as any).dataset[`${datasetKey}Modifiers`] // optional
  return { expression: raw, modifiers: modifiers ? modifiers.split(',') : [] }
}
```

Quality, testing, and linting

- Add unit tests for `AttributeSource` implementations. Ensure the same directive behavior under both providers.
- Add an integration test harness that runs a small DOM fixture and ensures directives register and behave identically.
- Add a linter/codemod for bulk rewrite of templates.

Performance considerations

- Reading dataset is faster than querying attributes repeatedly, and is optimized by the browser.
- Avoid copying very large JSON into dataset entries: dataset is string-only and large strings will be expensive to parse; prefer small values or minimal metadata keys.
- Avoid over-encoding complex syntax into dataset key names — rely on canonical keys + small encoded metadata values.

Edge cases and limitations

- dataset normalizes names (dash -> camelCase). Document this behavior and map names deterministically in the attribute provider.
- Some directive grammars (e.g. `x-on:foo.bar.baz`) include `.` and `:` which cannot be in dataset property identifiers. Use a canonical mapping and store the modifier list in a companion dataset field (e.g. `data-on-foo-modifiers`).
- Dynamic attributes created through `setAttribute` will not automatically populate dataset — implement a small observer or document that `element.dataset` remains the source of truth once strict mode is enabled.

Developer ergonomics and UX

- Provide developer tools:
  - CLI codemod to rewrite templates.
  - Editor snippets and lint rules to suggest `data-*` equivalents.
  - Migration warnings at runtime to help site owners discover remaining `x-*` usage.

Rollout plan and timeline (illustrative)

- Week 0–1: Design and implement `AttributeSource` abstraction + dataset provider. Add config flag and default `prefixAsString` change. Add unit tests.
- Week 2: Dual-read integration, automatic normalization for missing dataset keys, add runtime warnings, publish alpha.
- Week 3–4: Create codemod and ESLint rules, document migration path.
- Week 5–8: Encourage adoption, gather feedback, plan strict dataset mode removal in a major release.

Risk mitigation

- Keep the DOM provider (legacy mode) available until migration completes.
- Make strict dataset mode opt-in, release migration tooling before making breaking changes.
- Run broad integration tests (existing app demos and benchmarks) to ensure behavior parity.

Checklist for implementation (concrete deliverables)

- [ ] Add `Alpine.config.attrPrefix` and `Alpine.config.useDataset`.
- [ ] Implement `AttributeSource` abstraction with `DomAttributeSource` and `DatasetAttributeSource`.
- [ ] Replace all direct attribute reads with `AttributeSource` calls.
- [ ] Add migration CLI codemod and ESLint rule.
- [ ] Add unit and integration tests for both providers.
- [ ] Documentation and migration guide with examples and codemod usage.
- [ ] Announce and publish migration utilities to help downstream users.

Appendix: small decision guidance

- If your priority is minimal immediate change and maximum compatibility: change `prefixAsString = 'data-'` and implement dataset as a **fallback/source of truth where available**, but keep DOM attributes for full expressive grammar.

- If you prefer a clean and modern API and are willing to schedule a migration window: implement the strict dataset mode and codemods, deprecate x-* in a planned major release.

Concluding recommendation

Start with the hybrid approach: change `prefixAsString` to `'data-'`, add the `AttributeSource` abstraction, and implement a dataset-first provider that falls back to the DOM provider. Ship migration tooling and linters. After adoption, deprecate legacy parsing and switch to strict dataset-only mode in a major release. This approach maximizes developer ergonomics, preserves backwards compatibility, and leverages the native performance and semantic benefits of `data-*` attributes.


