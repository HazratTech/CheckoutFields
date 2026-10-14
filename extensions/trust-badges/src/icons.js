// Self-contained SVG data URIs for Trust Badges & Guarantees

function svgDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const TRUST_ICONS = {
  secure: {
    name: 'Secure Checkout',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <rect width="24" height="24" rx="12" fill="#EBF9F1"/>
        <path d="M12 4.5l5.5 2.5v4c0 3.5-2.5 6.5-5.5 8-3-1.5-5.5-4.5-5.5-8v-4l5.5-2.5z" fill="#008060"/>
        <path d="M10.5 11.5l1.5 1.5 3-3" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `)
  },
  guarantee: {
    name: 'Money-Back Guarantee',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <rect width="24" height="24" rx="12" fill="#F0F5FF"/>
        <circle cx="12" cy="11.5" r="5" fill="#2C6ECB"/>
        <path d="M12 8.5v3l2 1.2" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" fill="none"/>
        <path d="M9 16l3-1.5 3 1.5v2.5l-3-1-3 1v-2.5z" fill="#2C6ECB"/>
      </svg>
    `)
  },
  shipping: {
    name: 'Fast Tracked Delivery',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <rect width="24" height="24" rx="12" fill="#FFF4E5"/>
        <path d="M5 8h8v6H5v-6zm8 2h3l2 2.5v1.5h-5V10z" fill="#E26D00"/>
        <circle cx="8.5" cy="15" r="1.5" fill="#E26D00"/>
        <circle cx="15.5" cy="15" r="1.5" fill="#E26D00"/>
      </svg>
    `)
  }
};
