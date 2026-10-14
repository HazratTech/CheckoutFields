console.log('[Fieldy DEBUG] Trust Badges loaded for purchase.thank-you.block.render');

function getSignalValue(signal) {
  if (!signal) return null;
  if (typeof signal === 'object') {
    if ('value' in signal) return signal.value;
    if ('current' in signal) return signal.current;
    if ('_private_4_value' in signal) return signal._private_4_value;
  }
  return signal;
}

function buildTrustBadges(rawSettings) {
  const layout = (rawSettings?.trust_layout && String(rawSettings.trust_layout).trim().toLowerCase()) || 'strip';

  const rawTitle = rawSettings?.trust_title;
  const title = (rawTitle && String(rawTitle).trim() !== 'null' && String(rawTitle).trim() !== 'undefined')
    ? String(rawTitle).trim()
    : '';

  const badge1Title = (rawSettings?.trust_badge_1 && String(rawSettings.trust_badge_1).trim() !== 'null') ? String(rawSettings.trust_badge_1).trim() : '256-Bit SSL Secure';
  const badge1Sub = (rawSettings?.trust_badge_1_sub && String(rawSettings.trust_badge_1_sub).trim() !== 'null') ? String(rawSettings.trust_badge_1_sub).trim() : 'Bank-Grade Encryption';

  const badge2Title = (rawSettings?.trust_badge_2 && String(rawSettings.trust_badge_2).trim() !== 'null') ? String(rawSettings.trust_badge_2).trim() : '30-Day Money-Back';
  const badge2Sub = (rawSettings?.trust_badge_2_sub && String(rawSettings.trust_badge_2_sub).trim() !== 'null') ? String(rawSettings.trust_badge_2_sub).trim() : 'Hassle-Free Returns';

  const badge3Title = (rawSettings?.trust_badge_3 && String(rawSettings.trust_badge_3).trim() !== 'null') ? String(rawSettings.trust_badge_3).trim() : 'Fast Delivery';
  const badge3Sub = (rawSettings?.trust_badge_3_sub && String(rawSettings.trust_badge_3_sub).trim() !== 'null') ? String(rawSettings.trust_badge_3_sub).trim() : 'Tracked & Insured';

  const items = [
    { iconType: 'lock', iconTone: 'subdued', title: badge1Title, sub: badge1Sub },
    { iconType: 'return', iconTone: 'subdued', title: badge2Title, sub: badge2Sub },
    { iconType: 'truck', iconTone: 'subdued', title: badge3Title, sub: badge3Sub }
  ].filter(item => Boolean(item.title));

  const container = document.createElement('s-stack');
  container.setAttribute('direction', 'block');
  container.setAttribute('gap', 'tight');
  container.setAttribute('alignItems', 'center');
  container.setAttribute('align-items', 'center');
  container.setAttribute('inlineAlignment', 'center');
  container.setAttribute('inline-alignment', 'center');

  if (title) {
    const heading = document.createElement('s-text');
    heading.setAttribute('size', 'extra-small');
    heading.setAttribute('emphasis', 'bold');
    heading.setAttribute('tone', 'subdued');
    heading.setAttribute('alignment', 'center');
    heading.textContent = title.toUpperCase();
    container.appendChild(heading);
  }

  if (layout === 'card' || layout === 'grid') {
    const grid = document.createElement('s-grid');
    const cols = Array(items.length).fill('1fr').join(' ');
    grid.setAttribute('gridTemplateColumns', cols);
    grid.setAttribute('grid-template-columns', cols);
    grid.setAttribute('gap', 'base');
    grid.setAttribute('alignItems', 'start');

    for (const item of items) {
      const colStack = document.createElement('s-stack');
      colStack.setAttribute('direction', 'block');
      colStack.setAttribute('gap', 'extra-tight');
      colStack.setAttribute('alignItems', 'center');
      colStack.setAttribute('align-items', 'center');
      colStack.setAttribute('inlineAlignment', 'center');
      colStack.setAttribute('inline-alignment', 'center');

      const icon = document.createElement('s-icon');
      icon.setAttribute('type', item.iconType);
      icon.setAttribute('tone', 'base');
      icon.setAttribute('size', 'base');
      colStack.appendChild(icon);

      const titleEl = document.createElement('s-text');
      titleEl.setAttribute('size', 'small');
      titleEl.setAttribute('emphasis', 'bold');
      titleEl.setAttribute('alignment', 'center');
      titleEl.textContent = item.title;
      colStack.appendChild(titleEl);

      if (item.sub) {
        const subEl = document.createElement('s-text');
        subEl.setAttribute('size', 'extra-small');
        subEl.setAttribute('tone', 'subdued');
        subEl.setAttribute('alignment', 'center');
        subEl.textContent = item.sub;
        colStack.appendChild(subEl);
      }

      grid.appendChild(colStack);
    }

    if (layout === 'card') {
      const cardBox = document.createElement('s-box');
      cardBox.setAttribute('border', 'base');
      cardBox.setAttribute('border-radius', 'base');
      cardBox.setAttribute('padding', 'base');
      cardBox.appendChild(grid);
      container.appendChild(cardBox);
    } else {
      container.appendChild(grid);
    }
  } else if (layout === 'list') {
    const listCard = document.createElement('s-box');
    listCard.setAttribute('border', 'base');
    listCard.setAttribute('border-radius', 'base');
    listCard.setAttribute('padding', 'base');

    const listStack = document.createElement('s-stack');
    listStack.setAttribute('direction', 'block');
    listStack.setAttribute('gap', 'tight');

    items.forEach((item, idx) => {
      if (idx > 0) {
        const div = document.createElement('s-divider');
        div.setAttribute('direction', 'inline');
        listStack.appendChild(div);
      }

      const row = document.createElement('s-grid');
      row.setAttribute('gridTemplateColumns', '24px 1fr');
      row.setAttribute('grid-template-columns', '24px 1fr');
      row.setAttribute('gap', 'tight');
      row.setAttribute('alignItems', 'center');

      const icon = document.createElement('s-icon');
      icon.setAttribute('type', item.iconType);
      icon.setAttribute('tone', 'base');
      icon.setAttribute('size', 'base');
      row.appendChild(icon);

      const textCol = document.createElement('s-stack');
      textCol.setAttribute('direction', 'block');
      textCol.setAttribute('gap', 'none');

      const t = document.createElement('s-text');
      t.setAttribute('size', 'small');
      t.setAttribute('emphasis', 'bold');
      t.textContent = item.title;
      textCol.appendChild(t);

      if (item.sub) {
        const s = document.createElement('s-text');
        s.setAttribute('size', 'extra-small');
        s.setAttribute('tone', 'subdued');
        s.textContent = item.sub;
        textCol.appendChild(s);
      }

      row.appendChild(textCol);
      listStack.appendChild(row);
    });

    listCard.appendChild(listStack);
    container.appendChild(listCard);
  } else {
    // Default: 'strip'
    const stripRow = document.createElement('s-stack');
    stripRow.setAttribute('direction', 'inline');
    stripRow.setAttribute('gap', 'base');
    stripRow.setAttribute('justifyContent', 'center');
    stripRow.setAttribute('justify-content', 'center');
    stripRow.setAttribute('alignItems', 'center');
    stripRow.setAttribute('align-items', 'center');

    items.forEach((item, idx) => {
      if (idx > 0) {
        const bullet = document.createElement('s-text');
        bullet.setAttribute('tone', 'subdued');
        bullet.textContent = '•';
        stripRow.appendChild(bullet);
      }

      const itemStack = document.createElement('s-stack');
      itemStack.setAttribute('direction', 'inline');
      itemStack.setAttribute('gap', 'extra-tight');
      itemStack.setAttribute('alignItems', 'center');
      itemStack.setAttribute('align-items', 'center');

      const icon = document.createElement('s-icon');
      icon.setAttribute('type', item.iconType);
      icon.setAttribute('tone', 'subdued');
      icon.setAttribute('size', 'small');
      itemStack.appendChild(icon);

      const titleEl = document.createElement('s-text');
      titleEl.setAttribute('size', 'extra-small');
      titleEl.setAttribute('emphasis', 'bold');
      titleEl.setAttribute('tone', 'subdued');
      titleEl.textContent = item.title;
      itemStack.appendChild(titleEl);

      stripRow.appendChild(itemStack);
    });

    container.appendChild(stripRow);
  }

  return container;
}

export default function extension() {
  if (typeof document === 'undefined' || !document.body) return;

  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }

  const rawSettings = typeof shopify !== 'undefined' ? getSignalValue(shopify.settings) : null;
  const card = buildTrustBadges(rawSettings);
  document.body.appendChild(card);
}
