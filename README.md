# CheckoutFields

**All-in-One Custom Fields for Shopify Checkout & Post-Purchase**

CheckoutFields is a Shopify Checkout UI Extension and embedded app that allows merchants to easily collect custom inputs—such as gift messages, delivery instructions, VAT/Tax IDs, and marketing attribution surveys—directly inside checkout steps or on the Thank You / Order Status pages.

## Key Features

- **Zero Database Overhead ($0 Cloud Cost):** Customer responses are stored natively into Shopify Order attributes via `useApplyAttributeChange`. Data is viewable directly in Shopify Admin under **Orders > [Order #] > Additional details**.
- **100% Native Styling:** Built strictly with `@shopify/ui-extensions-react/checkout` components (`<BlockStack>`, `<TextField>`, `<Select>`, `<Checkbox>`), ensuring flawless responsiveness and theme font/color matching without CSS bugs.
- **Universal Plan Support:**
  - **Shopify Plus:** Place custom fields directly into Information, Shipping, and Payment checkout steps (`purchase.checkout.block.render`).
  - **Non-Plus (Basic, Shopify, Advanced):** Place fields on the Thank You page (`purchase.thank-you.block.render`) and Order Status page (`customer-account.order-status.block.render`).
- **Drag & Drop Customization:** Merchants configure field labels, placeholders, input types, and required toggles directly in the native Shopify Checkout Editor sidebar.
- **Shopify App Billing:** Built-in monthly subscription tier ($12.99/mo with a 7-day trial).

---

## Getting Started

### Prerequisites
- Node.js >= 20.19
- Shopify Partner Account
- Shopify CLI: `@shopify/cli`

### Installation

```bash
npm install
```

### Local Development

To link with your Shopify Partner account and launch local preview tunnels:

```bash
npm run dev
```

1. Select your Shopify Partner organization and development store.
2. Open **Settings > Checkout > Customize** in your Shopify Admin.
3. Click **+ Add App block** in the sidebar and select **CheckoutFields**.
4. Test entering values and verify data in your store's Order Details.

### Production Build

```bash
npm run build
npx @shopify/cli app build
```
