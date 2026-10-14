---
name: checkout-fields-extensibility
description: "Comprehensive guide and engineering best practices for building, extending, and testing Shopify Checkout UI Extensions in the Fieldy: Custom Checkout Fields app under the 2025-10 Polaris Web Components architecture."
compatibility: Requires Node.js and Shopify CLI (API Version 2025-10+)
metadata:
  author: Fieldy Team
  version: "2.0.0"
---

# Checkout Fields Extensibility Skill Guide (2025-10 Architecture)

This skill provides specialized rules, design patterns, and implementation practices for extending **Fieldy: Custom Checkout Fields** under Shopify's mandatory `2025-10` checkout runtime.

---

## 1. Core Architecture & Runtime Rules

Fieldy runs on Shopify's official **Checkout Extensibility 2025-10+** framework:

1. **Zero-Argument Entry Function:**
   - Shopify CLI generates: `shopify.extend(target, (...args) => Target_0(...args))`.
   - Shopify's checkout worker invokes the entry function with `args.length === 0`.
   - Entry point exports a default function that mounts directly into `document.body`:
     ```javascript
     export default function extension(...args) {
       // Clear previous mount
       while (document.body.firstChild) {
         document.body.removeChild(document.body.firstChild);
       }
       // Mount Polaris Web Components (<s-*>)
     }
     ```

2. **Native Polaris Web Components Only (`<s-*>`):**
   - Custom CSS is strictly disallowed by Shopify Checkout.
   - Elements are `RemoteElement` instances in `remote-dom` — **never access `.style` or `.style.cssText`** (throws `TypeError: Cannot set properties of undefined (setting 'cssText')`).
   - Use native components: `<s-stack>`, `<s-text-field>`, `<s-select>`, `<s-option>`, `<s-checkbox>`, `<s-banner>`, `<s-text>`.

3. **Zero External Storage for Buyer Inputs:**
   - Buyer responses are saved directly into native Shopify Order Note Attributes (`order.customAttributes`) via `shopify.applyAttributeChange()`.
   - 100% compatibility with fulfillment platforms (ShipStation, Klaviyo, ERPs) and zero database overhead.

4. **Multi-Target Rendering:**
   - `purchase.checkout.block.render`: Active checkout steps (Information, Shipping, Payment).
   - `purchase.thank-you.block.render`: Thank You confirmation page.
   - `customer-account.order-status.block.render`: Order Status / Tracking page.

---

## 2. Key APIs & State Helpers

### A. Reading Signals Safely
In 2025-10, `shopify.settings`, `shopify.attributes`, and `shopify.appMetafields` are Signal objects:
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

### B. Saving Order Note Attributes
```javascript
await shopify.applyAttributeChange({
  type: 'updateAttribute',
  key: attributeKey,
  value: String(newValue),
});
```

### C. Live Checkout Editor Subscription
To reflect merchant setting changes live in the Checkout Editor preview:
```javascript
if (shopify.settings && typeof shopify.settings.subscribe === 'function') {
  shopify.settings.subscribe((newSettings) => {
    extension(...args); // Re-renders preview
  });
}
```

### D. Reading Plan Status (Metafield Sync)
```javascript
const rawMetafields = getSignalValue(shopify.appMetafields) || [];
const planMetafield = rawMetafields.find(m => {
  const ns = m?.metafield?.namespace || m?.namespace;
  const k = m?.metafield?.key || m?.key;
  return ns === 'checkout_fields' && k === 'plan';
});
const isPro = String(planMetafield?.metafield?.value || planMetafield?.value || '').toLowerCase().trim() === 'pro';
```

---

## 3. Web Component Implementation Patterns

### Pattern 1: Text Field (Free & Pro Text Types)
```javascript
const input = document.createElement('s-text-field');
input.setAttribute('label', title);
if (placeholder) input.setAttribute('placeholder', placeholder);
if (helpText) input.setAttribute('help-text', helpText);
if (savedValue) input.setAttribute('value', savedValue);
if (maxChars > 0) input.setAttribute('maxlength', String(maxChars));
if (isRequired && isPro) input.setAttribute('required', 'true');

input.addEventListener('change', (e) => {
  const val = e?.target?.value ?? input.getAttribute('value') ?? '';
  saveAttribute(val);
});
stack.appendChild(input);
```

### Pattern 2: Dropdown Select
```javascript
const select = document.createElement('s-select');
select.setAttribute('label', title);
if (savedValue) select.setAttribute('value', savedValue);

const defaultOpt = document.createElement('s-option');
defaultOpt.setAttribute('value', '');
defaultOpt.textContent = '-- Select an option --';
select.appendChild(defaultOpt);

for (const opt of optionsList) {
  const optEl = document.createElement('s-option');
  optEl.setAttribute('value', opt);
  optEl.textContent = opt;
  if (savedValue === opt) optEl.setAttribute('selected', 'true');
  select.appendChild(optEl);
}

select.addEventListener('change', (e) => {
  const val = e?.target?.value ?? '';
  saveAttribute(val);
});
stack.appendChild(select);
```

### Pattern 3: Checkbox Toggle
```javascript
const checkbox = document.createElement('s-checkbox');
checkbox.textContent = title;
if (savedValue === 'true') checkbox.setAttribute('checked', 'true');
checkbox.addEventListener('change', (e) => {
  const isChecked = Boolean(e?.target?.checked);
  saveAttribute(isChecked ? 'true' : 'false');
});
stack.appendChild(checkbox);
```

---

## 4. Testing & Deployment Commands

```bash
# Verify extension bundle (instant ~60ms build)
npx shopify app build

# Release extension updates to users / partner stores
npx shopify app deploy --allow-updates --message "Release description"
```
