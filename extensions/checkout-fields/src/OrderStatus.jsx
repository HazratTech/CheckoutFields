import React from 'react';
import { reactExtension } from '@shopify/ui-extensions-react/checkout';
import { CheckoutFieldComponent } from './CheckoutFieldComponent.jsx';

export default reactExtension(
  'customer-account.order-status.block.render',
  () => <CheckoutFieldComponent surface="order-status" />
);
