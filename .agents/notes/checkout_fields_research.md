# CheckoutFields: Research, Feasibility & Strategy Notes

## 1. Technical Feasibility Confirmation: Is It Possible?
**Verdict: YES, 100% Feasible & Officially Supported by Shopify.**

### Key Technical Findings:
1. **No External Database Required (Zero Cloud/Server Costs):**
   - Checkout UI extensions provide the `useApplyAttributeChange()` hook from `@shopify/ui-extensions-react/checkout`.
   - When a customer fills in a field (e.g. Gift Message, VAT number), the hook updates order/cart attributes:
     ```js
     applyAttributeChange({
       type: 'updateAttribute',
       key: 'gift_message',
       value: textValue,
     });
     ```
   - When the order is placed, Shopify automatically persists these attributes into the Order object (`order.customAttributes`).
   - Merchants can view these directly in the native Shopify Admin under **Orders > [Order #] > Additional details** (Note Attributes).
   - Alternatively, `useApplyMetafieldsChange()` can be used if order metafields are preferred.

2. **No Custom CSS Allowed (Zero Layout Breakdown & Native Styling):**
   - Shopify Checkout Extensibility strictly forbids custom CSS or external styling frameworks.
   - All UI must use native UI components (`<BlockStack>`, `<TextField>`, `<Select>`, `<Checkbox>`, `<InlineLayout>`, `<Banner>`, `<Text>`, etc.).
   - Benefit: The extension automatically inherits the merchant's theme fonts, colors, border radii, and adapts to desktop/mobile screen widths without styling bugs.

3. **Extension Targets (Plus vs Non-Plus Stores):**
   - **Shopify Plus stores**: Can place the block in active checkout steps (`purchase.checkout.block.render` - Information, Shipping, Payment).
   - **Non-Plus stores (Basic, Shopify, Advanced)**: Can place the block in the post-purchase flow:
     - `purchase.thank-you.block.render` (Thank You page)
     - `customer-account.order-status.block.render` (Order Status page)
   - A single extension can support all these targets using dynamic target registration in `shopify.extension.toml`.

4. **Merchant Customization via Checkout Editor (No custom dashboard needed to edit fields):**
   - Extension settings defined in `shopify.extension.toml` allow merchants to configure:
     - Field Label (e.g., "Gift Message", "Delivery Instructions")
     - Field Type (Text, Multiline Text, Select Dropdown, Checkbox)
     - Placeholder text
     - Required field toggle
     - Order attribute key name
     - Dropdown options list
   - The merchant configures all of this directly inside the native Shopify Checkout Editor sidebar.

---

## 2. Market Context & August 2026 Opportunity
- **The Trigger:** Deprecation of legacy `checkout.liquid` and the sunset of "Additional Scripts" on the Thank You / Order Status pages for non-Plus stores.
- **The Problem:** Thousands of merchants used Additional Scripts to insert simple text boxes (VAT numbers, gift notes, surveys). Those scripts no longer function.
- **The Gap:** Incumbent apps (Checkout Blocks, Qikify) charge $29 - $99+/month targeting enterprise Plus stores.
- **Our Advantage:**
  - Lightweight, fast, $9.99 - $14.99/month pricing.
  - Zero database maintenance or storage costs.
  - Easy 1-click install and drag-and-drop checkout block.

---

## 3. ASO & Distribution Strategy
- **App Name:** `CheckoutFields: Custom Fields` (29 chars)
- **Subtitle:** `Add custom fields, gift notes & surveys to checkout` (50 chars)
- **Primary Category:** Cart and checkout customization > Checkout customization
- **Keywords:**
  - High-Volume Utility: `custom checkout fields`, `delivery instructions`, `gift note checkout`, `checkout survey`, `VAT number collection`
  - Platform/Migration: `checkout extensibility`, `thank you page customization`, `order status page blocks`, `checkout editor block`
  - High-AOV: `gift wrap checkbox`, `checkout custom form`

---

## 4. Architecture Plan
1. **Shopify App Core (Node / Remix / Vite):**
   - Authentication (Shopify OAuth)
   - Shopify App Subscription / Billing API ($9.99/mo non-plus, $14.99/mo plus tier or flat $12.99/mo)
   - Simple embedded admin onboarding guide with "Open Checkout Editor" deep link.
2. **Checkout UI Extension (`extensions/checkout-fields`):**
   - Targets: `purchase.checkout.block.render`, `purchase.thank-you.block.render`, `customer-account.order-status.block.render`
   - Configurable settings via Shopify Checkout Editor
   - Native UI components
   - `useApplyAttributeChange` integration
