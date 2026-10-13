---
name: checkout-fields-extensibility
description: "Comprehensive guide and engineering best practices for building, extending, and testing Shopify Checkout UI Extensions in the Fieldy: Custom Checkout Fields app. Use when working on checkout extension components, extension targets, settings schemas (shopify.extension.toml), buyer journey intercepts, attribute changes, order note attributes, or testing checkout flows."
compatibility: Requires Node.js and Shopify CLI
metadata:
  author: Fieldy Team
  version: "1.0.0"
---

# Checkout Fields Extensibility Skill Guide

This skill provides specialized rules, design patterns, and implementation practices for extending **Fieldy: Custom Checkout Fields**.

---

## 1. Core Architecture & Mental Model

Fieldy uses Shopify's official **Checkout UI Extensibility** framework (`@shopify/ui-extensions-react/checkout`):

1. **Zero External Storage for Buyer Inputs:**
   - Buyer responses are saved directly into native Shopify Order Note Attributes (`order.customAttributes`) via `useApplyAttributeChange()`.
   - This ensures 100% compatibility with fulfillment platforms (ShipStation, Klaviyo, ERPs) and zero database overhead.

2. **Native Polaris UI Components Only:**
   - Custom CSS is strictly disallowed by Shopify Checkout.
   - Use only native components: `<BlockStack>`, `<InlineStack>`, `<TextField>`, `<Select>`, `<Checkbox>`, `<Banner>`, `<Text>`, `<Divider>`.
   - These automatically adapt to the merchant's theme fonts, colors, border radii, and dark/light modes.

3. **Multi-Target Rendering:**
   - `purchase.checkout.block.render`: Active checkout steps (Information, Shipping, Payment) on Shopify Plus.
   - `purchase.thank-you.block.render`: Thank You confirmation page (all Shopify plans, including Basic, Shopify, Advanced).
   - `customer-account.order-status.block.render`: Order Status / Tracking page (all Shopify plans).

---

## 2. Key Hooks & APIs

### A. Saving Order Note Attributes
```tsx
import { useApplyAttributeChange, useAttributeValues } from '@shopify/ui-extensions-react/checkout';

const applyAttributeChange = useApplyAttributeChange();
const [savedValue] = useAttributeValues([attributeKey]);

// To persist buyer input:
await applyAttributeChange({
  type: 'updateAttribute',
  key: attributeKey,
  value: String(newValue),
});
```

### B. Blocking Progress (Mandatory Validation)
```tsx
import { useBuyerJourneyIntercept } from '@shopify/ui-extensions-react/checkout';

useBuyerJourneyIntercept(({ canBlockProgress }) => {
  if (!canBlockProgress || !isRequired) {
    return { behavior: 'allow' };
  }

  const isInvalid = !value || value.trim().length === 0;
  if (isInvalid) {
    return {
      behavior: 'block',
      reason: `${fieldTitle} is required`,
      errors: [{ message: `${fieldTitle} is required` }],
      perform: (result) => {
        if (result.behavior === 'block') {
          setValidationError(`${fieldTitle} is required`);
        }
      },
    };
  }

  return { behavior: 'allow' };
});
```

### C. Reading Merchant Settings
```tsx
import { useSettings } from '@shopify/ui-extensions-react/checkout';

const settings = useSettings();
const title = settings?.field_title || 'Custom Note';
const placeholder = settings?.field_placeholder || '';
const isRequired = Boolean(settings?.field_required);
```

### D. Reading Plan Status (Metafield Sync)
```tsx
import { useAppMetafields } from '@shopify/ui-extensions-react/checkout';

const appMetafields = useAppMetafields() || [];
const planEntry = appMetafields.find(
  (m) =>
    (m.metafield?.namespace === 'checkout_fields' && m.metafield?.key === 'plan') ||
    (m.namespace === 'checkout_fields' && m.key === 'plan')
);
const isProStore = String(planEntry?.metafield?.value || '').toLowerCase().trim() === 'pro';
```

---

## 3. High-Value Feature Implementation Patterns

### Pattern 1: Conditional Display Rules
Show fields only when certain criteria are met:
- **Shipping Destination**: Use `useShippingAddress()` to show VAT/Tax ID only for specific countries (e.g., EU, UK, Brazil).
- **Cart Total / Currency**: Use `useSubtotalAmount()` to show gift wrap options only on qualifying order values.
- **Cart Items**: Use `useCartLines()` to show personalization fields only when certain product tags are present.

### Pattern 2: Character Limits & Live Counters
For engraving, gift notes, or delivery notes:
```tsx
const maxLength = Number(settings?.max_length) || 150;
const currentLength = (value || '').length;

<TextField
  label={title}
  value={value}
  maxLength={maxLength}
  onChange={handleChange}
/>
<Text size="small" appearance="subdued">
  {currentLength} / {maxLength} characters
</Text>
```

### Pattern 3: Multi-Target Thank You / Order Status Support
In `shopify.extension.toml`:
```toml
[[extensions.targeting]]
module = "./src/Checkout.jsx"
target = "purchase.checkout.block.render"

[[extensions.targeting]]
module = "./src/Checkout.jsx"
target = "purchase.thank-you.block.render"

[[extensions.targeting]]
module = "./src/Checkout.jsx"
target = "customer-account.order-status.block.render"
```

---

## 4. Testing & Deployment Commands

```bash
# Test extension locally with mock checkout
npm run dev

# Deploy extension updates to Shopify
npm run deploy

# Build web application bundle
npm run build
```
