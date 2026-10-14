console.log('[Fieldy DEBUG] Free Shipping Bar loaded for purchase.checkout.block.render');

function getSignalValue(signal) {
  if (!signal) return null;
  if (typeof signal === 'object') {
    if ('value' in signal) return signal.value;
    if ('current' in signal) return signal.current;
    if ('_private_4_value' in signal) return signal._private_4_value;
  }
  return signal;
}

function formatCurrency(amount, currencyCode = 'USD') {
  try {
    if (typeof shopify !== 'undefined' && shopify.i18n?.formatCurrency) {
      return shopify.i18n.formatCurrency(amount);
    }
  } catch (e) {
    console.warn('[Fieldy] shopify.i18n.formatCurrency fallback:', e);
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2
    }).format(amount);
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
}

let isSettingsSubscribed = false;
let isCostSubscribed = false;

export default function extension(...args) {
  if (typeof document === 'undefined' || !document.body) return;

  // Clear previous DOM render
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }

  // Subscribe to live cart & settings changes
  if (!isSettingsSubscribed && typeof shopify !== 'undefined' && shopify.settings?.subscribe) {
    isSettingsSubscribed = true;
    shopify.settings.subscribe(() => extension(...args));
  }
  if (!isCostSubscribed && typeof shopify !== 'undefined' && shopify.cost?.subscribe) {
    isCostSubscribed = true;
    shopify.cost.subscribe(() => extension(...args));
  }

  const rawSettings = typeof shopify !== 'undefined' ? getSignalValue(shopify.settings) : null;
  const cost = typeof shopify !== 'undefined' ? getSignalValue(shopify.cost) : null;
  const subtotalRaw = Number(cost?.subtotalAmount?.amount ?? 29);
  const currencyCode = cost?.subtotalAmount?.currencyCode || 'USD';

  const goal = Number(rawSettings?.shipping_goal) || 100;
  const awayTpl = (rawSettings?.shipping_away_message && String(rawSettings.shipping_away_message).trim()) ||
    "You're only {amount} away from FREE Shipping!";
  const unlockedMsg = (rawSettings?.shipping_unlocked_message && String(rawSettings.shipping_unlocked_message).trim()) ||
    "🎉 Congratulations! You've unlocked FREE Shipping!";

  const isUnlocked = subtotalRaw >= goal;
  const remaining = Math.max(0, goal - subtotalRaw);
  const formattedRemaining = formatCurrency(remaining, currencyCode);
  const percent = Math.min(100, Math.max(0, Math.round((subtotalRaw / goal) * 100)));

  if (isUnlocked) {
    // Native Shopify Success Banner - Clean, celebratory, no awkward progress bar strike-through
    const banner = document.createElement('s-banner');
    banner.setAttribute('tone', 'success');
    banner.setAttribute('heading', unlockedMsg);

    const helper = document.createElement('s-text');
    helper.setAttribute('size', 'small');
    helper.textContent = 'Free shipping has been automatically applied to your checkout!';
    banner.appendChild(helper);

    document.body.appendChild(banner);
  } else {
    // Clean away message (strip redundant duplicate truck emojis)
    let cleanAwayText = awayTpl.replace('{amount}', formattedRemaining);
    cleanAwayText = cleanAwayText.replace(/^🚚\s*/, '').replace(/\s*🚚$/, '').trim();

    // Native Shopify Informational Banner with integrated progress bar & dual stats
    const banner = document.createElement('s-banner');
    banner.setAttribute('tone', 'info');
    banner.setAttribute('heading', cleanAwayText);

    const contentStack = document.createElement('s-stack');
    contentStack.setAttribute('direction', 'block');
    contentStack.setAttribute('gap', 'tight');

    const progress = document.createElement('s-progress');
    progress.setAttribute('value', String(percent));
    progress.setAttribute('max', '100');
    progress.setAttribute('tone', 'info');
    progress.setAttribute('accessibilityLabel', `${percent}% towards free shipping goal`);
    contentStack.appendChild(progress);

    const footerRow = document.createElement('s-stack');
    footerRow.setAttribute('direction', 'inline');
    footerRow.setAttribute('justifyContent', 'space-between');
    footerRow.setAttribute('justify-content', 'space-between');
    footerRow.setAttribute('alignItems', 'center');
    footerRow.setAttribute('align-items', 'center');

    const leftText = document.createElement('s-text');
    leftText.setAttribute('size', 'extra-small');
    leftText.setAttribute('tone', 'subdued');
    leftText.textContent = `${formatCurrency(subtotalRaw, currencyCode)} of ${formatCurrency(goal, currencyCode)} (${percent}%)`;
    footerRow.appendChild(leftText);

    const rightText = document.createElement('s-text');
    rightText.setAttribute('size', 'extra-small');
    rightText.setAttribute('tone', 'subdued');
    rightText.textContent = `Add ${formattedRemaining} to qualify`;
    footerRow.appendChild(rightText);

    contentStack.appendChild(footerRow);
    banner.appendChild(contentStack);

    document.body.appendChild(banner);
  }
}
