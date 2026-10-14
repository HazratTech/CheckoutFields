console.log('[Fieldy DEBUG] ThankYou.jsx module loaded for target purchase.thank-you.block.render');

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
  const title = (rawSettings && rawSettings.field_title && String(rawSettings.field_title).trim()) || 'Custom Note';
  const attributeKey = (rawSettings && rawSettings.attribute_key && String(rawSettings.attribute_key).trim()) ||
    title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'custom_note';

  const rawAttributes = typeof shopify !== 'undefined' ? getSignalValue(shopify.attributes) : [];
  let savedVal = '';
  if (Array.isArray(rawAttributes)) {
    const found = rawAttributes.find(a => a && a.key === attributeKey);
    if (found && found.value) savedVal = String(found.value);
  }

  const banner = document.createElement('s-banner');
  banner.setAttribute('tone', 'info');
  banner.setAttribute('heading', `Fieldy: ${title}`);

  const text = document.createElement('s-text');
  text.textContent = savedVal ? `${title}: ${savedVal}` : `In live orders, customer entries for "${attributeKey}" will appear here.`;

  banner.appendChild(text);
  document.body.appendChild(banner);
}
