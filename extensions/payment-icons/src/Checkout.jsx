console.log('[Fieldy DEBUG] Payment & Courier Badges loaded for purchase.checkout.block.render');

function getSignalValue(signal) {
  if (!signal) return null;
  if (typeof signal === 'object') {
    if ('value' in signal) return signal.value;
    if ('current' in signal) return signal.current;
    if ('_private_4_value' in signal) return signal._private_4_value;
  }
  return signal;
}

let isSettingsSubscribed = false;

const PAYMENT_TYPE_MAP = {
  visa: { type: 'visa', label: 'Visa' },
  mastercard: { type: 'mastercard', label: 'Mastercard' },
  amex: { type: 'amex', label: 'American Express' },
  paypal: { type: 'paypal', label: 'PayPal' },
  apple_pay: { type: 'apple-pay', label: 'Apple Pay' },
  applepay: { type: 'apple-pay', label: 'Apple Pay' },
  google_pay: { type: 'google-pay', label: 'Google Pay' },
  googlepay: { type: 'google-pay', label: 'Google Pay' },
  shop_pay: { type: 'shop-pay', label: 'Shop Pay' },
  shoppay: { type: 'shop-pay', label: 'Shop Pay' },
  klarna: { type: 'klarna', label: 'Klarna' },
  afterpay: { type: 'afterpay', label: 'Afterpay' },
  venmo: { type: 'venmo', label: 'Venmo' },
  discover: { type: 'discover', label: 'Discover' },
  diners_club: { type: 'diners-club', label: 'Diners Club' },
  jcb: { type: 'jcb', label: 'JCB' },
  unionpay: { type: 'unionpay', label: 'UnionPay' },
  bancontact: { type: 'bancontact', label: 'Bancontact' },
  ideal: { type: 'ideal', label: 'iDEAL' },
  sofort: { type: 'sofort', label: 'Sofort' },
  cod: { type: 'cash', label: 'Cash on Delivery' },
};

const COURIER_LABELS = {
  dhl: 'DHL',
  fedex: 'FedEx',
  ups: 'UPS',
  usps: 'USPS',
  royal_mail: 'Royal Mail',
  dpd: 'DPD',
};

function createBadgeElement(key) {
  const normKey = String(key).trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (COURIER_LABELS[normKey]) {
    const labelText = COURIER_LABELS[normKey];
    const box = document.createElement('s-box');
    box.setAttribute('border', 'base');
    box.setAttribute('border-radius', 'base');
    box.setAttribute('padding', 'extra-tight');

    const stack = document.createElement('s-stack');
    stack.setAttribute('direction', 'inline');
    stack.setAttribute('gap', 'extra-tight');
    stack.setAttribute('alignItems', 'center');
    stack.setAttribute('align-items', 'center');

    const icon = document.createElement('s-icon');
    icon.setAttribute('type', 'truck');
    icon.setAttribute('size', 'small');
    stack.appendChild(icon);

    const text = document.createElement('s-text');
    text.setAttribute('size', 'extra-small');
    text.setAttribute('emphasis', 'bold');
    text.textContent = labelText;
    stack.appendChild(text);

    box.appendChild(stack);
    return box;
  }

  const info = PAYMENT_TYPE_MAP[normKey] || {
    type: normKey.replace(/_/g, '-'),
    label: normKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  };

  const paymentIcon = document.createElement('s-payment-icon');
  paymentIcon.setAttribute('type', info.type);
  paymentIcon.setAttribute('name', info.type);
  paymentIcon.setAttribute('accessibilityLabel', info.label);
  paymentIcon.setAttribute('accessibility-label', info.label);
  return paymentIcon;
}

function buildPaymentIcons(rawSettings) {
  const rawTitle = rawSettings?.icons_title;
  const title = (rawTitle && String(rawTitle).trim() !== 'null' && String(rawTitle).trim() !== 'undefined')
    ? String(rawTitle).trim()
    : '';

  const alignment = (rawSettings?.icons_alignment && String(rawSettings.icons_alignment).trim().toLowerCase()) || 'center';
  const maxInRow = Math.max(1, parseInt(String(rawSettings?.max_in_row || 6), 10) || 6);

  // Read selected icons from dropdowns icon_1 through icon_10
  const chosenList = [];
  for (let i = 1; i <= 10; i++) {
    const val = rawSettings?.[`icon_${i}`];
    if (val && String(val).trim().toLowerCase() !== 'none' && String(val).trim().toLowerCase() !== 'null') {
      chosenList.push(String(val).trim().toLowerCase().replace(/[\s-]+/g, '_'));
    }
  }

  // Fallback defaults if merchant hasn't configured dropdowns yet
  const defaultList = ['visa', 'mastercard', 'amex', 'paypal', 'apple_pay', 'google_pay'];
  const activeKeys = chosenList.length > 0 ? chosenList : defaultList;

  // Chunk into rows of maxInRow
  const rows = [];
  for (let i = 0; i < activeKeys.length; i += maxInRow) {
    rows.push(activeKeys.slice(i, i + maxInRow));
  }

  const container = document.createElement('s-stack');
  container.setAttribute('direction', 'block');
  container.setAttribute('gap', 'tight');
  container.setAttribute('alignItems', alignment);
  container.setAttribute('align-items', alignment);
  container.setAttribute('inlineAlignment', alignment);
  container.setAttribute('inline-alignment', alignment);

  if (title) {
    const headingStack = document.createElement('s-stack');
    headingStack.setAttribute('direction', 'inline');
    headingStack.setAttribute('gap', 'extra-tight');
    headingStack.setAttribute('justifyContent', alignment);
    headingStack.setAttribute('justify-content', alignment);
    headingStack.setAttribute('alignItems', 'center');
    headingStack.setAttribute('align-items', 'center');

    const lockIcon = document.createElement('s-icon');
    lockIcon.setAttribute('type', 'lock');
    lockIcon.setAttribute('tone', 'subdued');
    lockIcon.setAttribute('size', 'small');
    headingStack.appendChild(lockIcon);

    const heading = document.createElement('s-text');
    heading.setAttribute('size', 'extra-small');
    heading.setAttribute('tone', 'subdued');
    heading.setAttribute('emphasis', 'bold');
    heading.textContent = title.toUpperCase();
    headingStack.appendChild(heading);

    container.appendChild(headingStack);
  }

  for (const rowKeys of rows) {
    const rowStack = document.createElement('s-stack');
    rowStack.setAttribute('direction', 'inline');
    rowStack.setAttribute('gap', 'base');
    rowStack.setAttribute('justifyContent', alignment);
    rowStack.setAttribute('justify-content', alignment);
    rowStack.setAttribute('alignItems', 'center');
    rowStack.setAttribute('align-items', 'center');

    for (const key of rowKeys) {
      rowStack.appendChild(createBadgeElement(key));
    }
    container.appendChild(rowStack);
  }

  return container;
}

export default function extension(...args) {
  if (typeof document === 'undefined' || !document.body) return;

  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }

  if (!isSettingsSubscribed && typeof shopify !== 'undefined' && shopify.settings?.subscribe) {
    isSettingsSubscribed = true;
    shopify.settings.subscribe(() => extension(...args));
  }

  const rawSettings = typeof shopify !== 'undefined' ? getSignalValue(shopify.settings) : null;
  const container = buildPaymentIcons(rawSettings);
  document.body.appendChild(container);
}
