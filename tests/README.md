# Nexus-UX Tests

## Browser Simulation Test

**File**: `src/tests/browser_simulation.test.ts`

This test uses `jsdom` to simulate a browser environment directly within Deno.
It is designed to verify the Todo App's functionality (rendering, data binding,
event handling) in environments where a full headless browser (e.g.,
Puppeteer/Playwright) might not be available or reliable, such as WSL or certain
CI containers.

### Running the Test

```bash
deno test --allow-read --allow-env --allow-net src/tests/browser_simulation.test.ts
```

_Note: `--no-check` might be required if type checking is too strict for the
mocked environment._

### What it Verifies

1. **Initial State**: Checks that the default todos are rendered.
2. **Interaction**: Simulates typing "Buy Milk" into the input (`data-bind`).
3. **Logic**: Simulates clicking "Add" (`data-on-click`) and verifies the new
   item appears.
4. **Filtering**: Simulates clicking "Active" and verifies items are hidden.

## Unit Tests

Run all unit tests with:

```bash
deno test -A src/
```
