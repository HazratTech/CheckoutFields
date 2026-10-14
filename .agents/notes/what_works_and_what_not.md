# Fieldy Checkout Extensibility: What Works & What Does Not Work

**Last Updated:** Version 31 Release (Shopify API Version `2025-10`)  
**Target Environment:** Shopify Checkout UI Extensions (Polaris Web Components & Remote-DOM)

---

## 1. What Works (Verified & Operational in Production v31)

### A. Multi-Extension Architecture (4 Distinct Dedicated Blocks)
In Release v31, rather than cramming multiple features under one extension with a dropdown selector, Fieldy provides **4 dedicated extensions** under `extensions/*`. In the Shopify Checkout Editor, clicking **"Add block"** displays 4 distinct options under Fieldy:

1. **`Fieldy: Custom Field & Note` (`extensions/checkout-fields`):**
   - Text inputs, multiline notes, dropdowns, consent checkboxes, character limits, required validation, and country targeting.
2. **`Fieldy: Free Shipping Bar` (`extensions/free-shipping-bar`, Release v37):**
   - Uses Shopify's native `<s-banner>` component for 100% theme-native look and feel.
   - When unlocked: Native green celebration banner (`<s-banner tone="success">`) with official checkmark icon and congratulatory copy (no awkward cut-off blue progress bar!).
   - When progressing: Native informational banner (`<s-banner tone="info">`) with progress bar and dual-column stats (`$29.00 of $100.00` / `Add $71.00 to qualify`).
3. **`Fieldy: Payment & Courier Badges` (`extensions/payment-icons`, Release v37):**
   - 10 dedicated dropdown choice fields (`icon_1` to `icon_10`) using `validations.name = "choices"`.
   - `max_in_row` setting (default: 6): Automatically chunks active badges into rows of at most 6 (or merchant setting).
   - **Native `<s-payment-icon>`:** Uses Shopify's official `<s-payment-icon>` component with `gap="base"` breathing room.
   - **Security Lock Header:** Sleek security header with `<s-icon type="lock" tone="subdued">` + uppercase title (`🔒 HELLO` or `🔒 GUARANTEED SAFE CHECKOUT`). Blank/cleared titles never render `"null"`.
   - **Courier Badges:** Couriers (DHL, FedEx, UPS, USPS, Royal Mail, DPD) rendered as native `<s-box>` badges with `<s-icon type="truck">` and bold label.
4. **`Fieldy: Trust Badges & Guarantees` (`extensions/trust-badges`, Release v37):**
   - **Default `strip` layout:** Sleek, borderless horizontal security strip with bullet separators (`🔒 256-Bit SSL Secure  •  🔄 30-Day Money-Back  •  🚚 Fast Delivery`) taking zero unnecessary space and matching Apple/Nike/Shopify Plus styling.
   - Supports `card` (3-column feature card in a clean rounded box), `grid` (3 borderless columns), and `list` (vertical with dividers).
   - Fixed the `"null"` heading bug.

### B. Core Runtime Rules & Advantages
- **Independent Settings:** Each extension has its own dedicated settings panel without having to share or compromise on the 20-field settings ceiling.
- **Independent Placement:** Merchants can place the Free Shipping Bar at the top of checkout, the Custom Note in contact info, and the Trust Badges above the payment button.
- **Multi-Target Coverage:** All 4 extensions support `purchase.checkout.block.render`, `purchase.thank-you.block.render`, and `customer-account.order-status.block.render`.
- **Ultra-Fast Bundling:** Shopify CLI bundles all 4 extensions simultaneously in ~55ms each (~1.2 KB to ~3.1 KB compressed).
- **DOM Clearing:** `while (document.body.firstChild) document.body.removeChild(document.body.firstChild);` cleanly clears previous renders before mounting.

### C. State & Persistence
- **Order Note Attributes (`order.customAttributes`):**
  - Saving values via `shopify.applyAttributeChange({ type: 'updateAttribute', key, value })` works asynchronously and persists directly into the order without database costs.
  - Reading initial saved values from `shopify.attributes` signal works.
- **Merchant Settings & Live Checkout Editor Previews:**
  - Reading configured titles, placeholders, and keys from `shopify.settings` using the `getSignalValue()` helper:
    ```javascript
    function getSignalValue(signal) {
      if (!signal) return null;
      if (typeof signal === 'object') {
        if ('value' in signal) return signal.value;
        if ('current' in signal) return signal.current;
        if ('_private_4_value' in signal) return signal._private_4_value;
      }
      return signal;
    }
    ```
  - Subscribing to live sidebar changes via `shopify.settings.subscribe(...)` instantly re-renders the preview when the merchant types in the Checkout Editor.
- **Plan Gating (Pro vs Free):**
  - Checking `shopify.appMetafields` for `checkout_fields.plan === 'pro'` accurately gates advanced field types (select, checkbox, number, date) and required field blocking.
  - Renders informational banner in Checkout Editor preview when Free merchants test Pro features.
- **Country Geo-Targeting:**
  - Inspecting `shopify.localization.country.current.isoCode` filters out display for ineligible buyer locations in live checkout while displaying a preview banner in the Checkout Editor.
- **Multi-Target Rendering:**
  - `purchase.checkout.block.render`: Active checkout steps.
  - `purchase.thank-you.block.render`: Thank You confirmation page displays saved note attributes.

---

## 2. What Does NOT Work (Dead Ends & Critical Gotchas)

### ❌ 1. Deploying `api_version < "2025-10"`
- **Failure Mode:** Shopify release validator blocks deploy with:
  `Validation errors: api_version: "2025-07" is not a valid API version: Checkout ui requires one of ["2025-10", "2026-01", ...]`
- **Rule:** Never downgrade `api_version` below `2025-10` in `shopify.extension.toml`.

### ❌ 2. Legacy `reactExtension` / `@shopify/ui-extensions-react` Wrapper in 2025-10
- **Failure Mode:** Throws fatal unhandled error:
  `TypeError: Cannot read properties of undefined (reading 'channel')`
- **Why it happens:** Shopify CLI generates `shopify.extend(target, (...args) => Target_0(...args))`. In 2025-10, Shopify checkout invokes this with `args = []`. The legacy React wrapper expects `args = [{ channel, components }, api]`. Because `args[0]` is undefined, destructuring `channel` throws immediately.
- **Rule:** Do not use `reactExtension()` for 2025-10 checkout targets.

### ❌ 3. Returning Early on `args.length === 0`
- **Failure Mode:** Extension becomes completely **invisible** (0 ms flicker then blank).
- **Why it happens:** In 2025-10, `args.length === 0` is the normal, expected execution path. Returning early suppresses the channel crash, but prevents the component from mounting to the DOM.
- **Rule:** Always execute the mounting logic inside the zero-argument entry function.

### ❌ 4. Direct `.style` or `.style.cssText` Access on Elements
- **Failure Mode:** Throws unhandled error:
  `ExtensionUsageError: TypeError: Cannot set properties of undefined (setting 'cssText')`
- **Why it happens:** In Shopify's 2025-10 runtime, `document` is `remote-dom`. `document.createElement()` creates a `RemoteElement` which does **not** have an inline `.style` object.
- **Rule:** Never touch `.style` or `.style.cssText`. Use native Polaris Web Component tags (`<s-stack>`, `<s-text-field>`, `<s-banner>`, `<s-text>`) and component attributes.

### ❌ 5. Direct Property Access on Signals (`shopify.settings.field_title`)
- **Failure Mode:** Returns `undefined` or misses updates.
- **Why it happens:** `shopify.settings`, `shopify.attributes`, and `shopify.appMetafields` are Signal objects (wrappers with `_private_4_value`, `.current`, or `.value` and `.subscribe()`).
- **Rule:** Always unwrap signals using `getSignalValue(signal)`.

### ❌ 6. Exceeding 20 Fields in `[extensions.settings]`
- **Failure Mode:** Shopify deploy validator throws fatal error:
  `Validation errors: settings: Error at root: Objects can't contain more than 20 fields.`
- **Why it happens:** Shopify enforces a hard ceiling of 20 configuration fields per extension block.
- **Rule:** Keep settings count `<= 20`. Use comma-separated strings (e.g. `icons_list`) instead of discrete fields (`icon_1`, `icon_2`, etc.).

### ❌ 7. Inline SVG Data URIs (`data:image/svg+xml`) in `<s-image src="...">`
- **Failure Mode:** Images are completely invisible (empty 0px elements under title).
- **Why it happens:** Shopify's Checkout Remote DOM sandbox blocks all inline `data:` URIs and raw `<svg>` tags for security (XSS prevention) and performance reasons.
- **Rule:** Never use `data:image/svg+xml` in checkout extensions. Always use Shopify's native web components:
  - For payment methods: `<s-payment-icon type="visa" />`, `<s-payment-icon type="apple-pay" />`, `<s-payment-icon type="google-pay" />`.
  - For general badges/symbols: `<s-icon type="lock" />`, `<s-icon type="return" />`, `<s-icon type="truck" />`.

---

## 3. Fast Checklist for Future Changes
1. Edit [Checkout.jsx](file:///Volumes/SSD/Coding/website/Shopify%20App/CheckoutFields/extensions/checkout-fields/src/Checkout.jsx) or [ThankYou.jsx](file:///Volumes/SSD/Coding/website/Shopify%20App/CheckoutFields/extensions/checkout-fields/src/ThankYou.jsx).
2. Validate syntax & bundle: `npx shopify app build`.
3. Release to partners: `npx shopify app deploy --allow-updates --message "Description"`.
4. Hard-refresh Checkout Editor (`Cmd + Shift + R`) to preview changes.
