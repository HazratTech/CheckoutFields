console.log('[Fieldy DEBUG] Free Shipping Bar loaded for customer-account.order-status.block.render');

function getSignalValue(signal) {
  if (!signal) return null;
  if (typeof signal === 'object') {
    if ('value' in signal) return signal.value;
    if ('current' in signal) return signal.current;
    if ('_private_4_value' in signal) return signal._private_4_value;
  }
  return signal;
}

export default function extension() {
  if (typeof document === 'undefined' || !document.body) return;

  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }

  const rawSettings = typeof shopify !== 'undefined' ? getSignalValue(shopify.settings) : null;
  const unlockedMsg = (rawSettings?.shipping_unlocked_message && String(rawSettings.shipping_unlocked_message).trim()) ||
    "🎉 Congratulations! You unlocked FREE Shipping!";

  const stack = document.createElement('s-stack');
  stack.setAttribute('direction', 'block');
  stack.setAttribute('gap', 'tight');

  const banner = document.createElement('s-banner');
  banner.setAttribute('tone', 'success');
  banner.setAttribute('heading', unlockedMsg);
  stack.appendChild(banner);

  document.body.appendChild(stack);
}
