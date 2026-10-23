# Account Storefront Implementation Plan

> Execute sequentially in this checkout, preserving the user-selected D:/selfProject/myself/thinkpasser location. No remote publishing is requested.

**Goal:** Replace the model-advice prototype with an interactive self-operated AI account shop.

**Architecture:** Static multi-view application with hash routing. Separate deterministic commerce rules from DOM rendering; keep price calculations in integer cents and keep unpaid demo orders local to the browser.

**Tech Stack:** HTML, CSS, browser JavaScript, Node built-in test runner; no install or build step.

---

### Task 1: Commerce rules

Files: tests/store.test.cjs, assets/store.js, package.json.

1. Write tests for combined search/filtering, stable sorting, valid product terms, integer totals, stock aggregation and unpaid order validation.
2. Run `node --test tests/store.test.cjs`; confirm absent commerce functions fail.
3. Implement catalog, filtering, quotes, cart normalization and order creation.
4. Rerun the tests and check JavaScript syntax.

### Task 2: Storefront

Files: index.html, assets/styles.css, assets/app.js.

1. Build store navigation, product art and cards, home and catalog views.
2. Add brand, price, ownership and delivery filtering, sorting and empty states.
3. Implement product detail, cart, checkout, order history and help pages.
4. Add responsive layouts, focus handling, local persistence error handling and old-route redirects.

### Task 3: Verification and documentation

Files: README.md, .agents/product-marketing-context.md, .gitignore.

1. Replace erroneous business description with user-confirmed account sales positioning.
2. Document running locally, routes, sample catalog configuration and backend integration boundaries.
3. Run all business tests, syntax checks and HTTP resource checks.
4. Inspect desktop/mobile UI and exercise a complete unpaid-order path when the browser connection is available.
5. Review the diff for obsolete advice/booking language and misleading payment claims. Deliver the local source without pushing or changing an existing deployment.
