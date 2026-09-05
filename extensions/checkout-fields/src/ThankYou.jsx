import React from 'react';
import { reactExtension } from '@shopify/ui-extensions-react/checkout';
import { CheckoutFieldComponent } from './CheckoutFieldComponent.jsx';

export default reactExtension(
  'purchase.thank-you.block.render',
  () => <CheckoutFieldComponent surface="thank-you" />
);
