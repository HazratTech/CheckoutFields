import { reactExtension } from '@shopify/ui-extensions-react/checkout';
import { CheckoutFieldComponent } from './CheckoutFieldComponent.jsx';

console.log('[Fieldy DEBUG] Checkout.jsx module loaded and registering target purchase.checkout.block.render');

export default reactExtension(
  'purchase.checkout.block.render',
  (api) => {
    console.log('[Fieldy DEBUG] reactExtension render callback executing for purchase.checkout.block.render. API:', api);
    return <CheckoutFieldComponent />;
  }
);
