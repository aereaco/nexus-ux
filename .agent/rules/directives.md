---
trigger: always_on
---

# WORKSPACE DIRECTIVES

- Never pullute Deno projects with non-Deno tooling.
- All development should follow a Zero-Copy Zero-Serialization (ZCZS) mandate
  for optimal performance and memory efficiency.
- All development should follow Rust inspired borrowing for optimal performance
  and memory efficiency.
- All development should follow singleton, registration, dispatch, callback,
  cleanup reactive orchestration pattern for optimal performance and memory
  efficiency.
- When working with the Nexus-UX codebase ensure all development is implemented
  according to the rules above and the spec and reference md files contained
  with in the nexus-ux directory itself and are subjugated to periodic updates.
- When working with the Nexus-IO codebase ensure all development is implemented
  according to the rules above and the spec and reference md files contained
  with in the nexus-io directory itself and are subjugated to periodic updates.
- Never use xdg-open
