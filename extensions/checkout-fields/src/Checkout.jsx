import { reactExtension } from '@shopify/ui-extensions-react/checkout';
import { CheckoutFieldComponent } from './CheckoutFieldComponent.jsx';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <CheckoutFieldComponent surface="checkout" />
);
