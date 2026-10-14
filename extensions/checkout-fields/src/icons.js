// High-quality, self-contained SVG data URIs for Payment & Courier Trust Badges

function svgDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const PAYMENT_ICONS = {
  visa: {
    name: 'Visa',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0"/>
        <path d="M19.5 22h-2.8l1.8-11.2h2.8l-1.8 11.2zm8.5-11c-.6-.2-1.5-.4-2.6-.4-2.9 0-4.9 1.5-4.9 3.6 0 1.6 1.5 2.5 2.6 3 1.1.5 1.5.9 1.5 1.4 0 .8-.9 1.1-1.8 1.1-1.2 0-1.9-.2-2.9-.6l-.4-.2-.4 2.4c.7.3 1.9.6 3.2.6 3.1 0 5.1-1.5 5.1-3.8 0-1.3-.8-2.2-2.5-3-1.1-.5-1.7-.9-1.7-1.4 0-.5.6-.9 1.7-.9 1 0 1.7.2 2.2.4l.3.1.6-2.3zm8.3 0h-2.2c-.7 0-1.2.2-1.5 1l-4.2 10h3l.6-1.7h3.7l.3 1.7h2.6l-2.3-11zm-3.6 7l1.5-4.2.9 4.2h-2.4zm-19.2-7l-2.8 7.6-.3-1.5c-.5-1.7-2.1-3.5-3.9-4.5l2.5 9.6h3l4.5-11.2h-3z" fill="#1434CB"/>
      </svg>
    `)
  },
  mastercard: {
    name: 'Mastercard',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0"/>
        <circle cx="19" cy="16" r="9" fill="#EB001B"/>
        <circle cx="29" cy="16" r="9" fill="#F79E1B" fill-opacity="0.9"/>
        <path d="M24 9.5a8.95 8.95 0 0 1 3.5 6.5 8.95 8.95 0 0 1-3.5 6.5 8.95 8.95 0 0 1-3.5-6.5c0-2.6 1.4-4.9 3.5-6.5z" fill="#FF5F00"/>
      </svg>
    `)
  },
  amex: {
    name: 'American Express',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#006FCF"/>
        <path d="M7 16h4l1.5-3.5h2L16 16h3l-2.5-5.5h-3L12 14l-1.5-3.5H7v11h3.5l1.5-3.5h2l1.5 3.5h3l-2.5-5.5-2.5 5.5H7V16zm15-5.5h8v2.2h-5.5v1.8h5v2.2h-5v2h5.5v2.3H22v-10.5zm10 0h3l2 4 2-4h3l-3.5 5.5 3.5 5h-3l-2-3.8-2 3.8h-3l3.5-5-3.5-5.5z" fill="#ffffff"/>
      </svg>
    `)
  },
  paypal: {
    name: 'PayPal',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0"/>
        <path d="M17 9h6.2c3 0 5 1.5 4.5 4.5-.4 2.8-2.6 4.5-5.5 4.5h-2l-1 5.5h-3.2L17 9z" fill="#003087"/>
        <path d="M20.5 13h5.2c2.6 0 4.3 1.3 3.9 3.9-.4 2.4-2.2 3.9-4.7 3.9h-1.8l-.9 4.7h-2.7l1-12.5z" fill="#0079C1"/>
      </svg>
    `)
  },
  apple_pay: {
    name: 'Apple Pay',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#000000"/>
        <path d="M15.5 11.2c-.5.6-1.3 1-2.1.9 0-.8.4-1.6.8-2.1.5-.6 1.4-.9 2.1-.9.1.8-.3 1.5-.8 2.1zm.8 1.1c-1.1 0-2 .6-2.5.6-.6 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8-1.2 2.1-.3 5.3.9 7 .6.8 1.3 1.8 2.2 1.7.9 0 1.2-.6 2.3-.6 1 0 1.3.6 2.3.6.9 0 1.6-.8 2.2-1.7.7-1 1-2 1-2.1-.1 0-2-.8-2-2.9 0-1.8 1.5-2.6 1.5-2.7-1-.9-2.1-1-2.7-1.1z" fill="#ffffff"/>
        <text x="23" y="21" font-family="-apple-system, sans-serif" font-size="11" font-weight="600" fill="#ffffff">Pay</text>
      </svg>
    `)
  },
  google_pay: {
    name: 'Google Pay',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0"/>
        <path d="M15.2 16c0-.5 0-.9-.1-1.3h-4.3v2.5h2.5c-.1.7-.5 1.3-1.1 1.7v1.4h1.8c1-1 1.2-2.6 1.2-4.3z" fill="#4285F4"/>
        <path d="M10.8 20.4c1.3 0 2.4-.4 3.2-1.2l-1.8-1.4c-.4.3-1 .5-1.4.5-1.1 0-2.1-.7-2.4-1.7H6.5v1.4c.8 1.5 2.4 2.4 4.3 2.4z" fill="#34A853"/>
        <path d="M8.4 16.6c-.1-.3-.1-.6-.1-.9 0-.3 0-.6.1-.9v-1.4H6.5c-.3.7-.5 1.5-.5 2.3s.2 1.6.5 2.3l1.9-1.4z" fill="#FBBC05"/>
        <path d="M10.8 12.8c.7 0 1.4.2 1.9.7l1.4-1.4c-.9-.8-2-1.3-3.3-1.3-1.9 0-3.5 1-4.3 2.5l1.9 1.4c.3-1 1.3-1.9 2.4-1.9z" fill="#EA4335"/>
        <text x="18" y="20.5" font-family="sans-serif" font-size="12" font-weight="700" fill="#5f6368">Pay</text>
      </svg>
    `)
  },
  shop_pay: {
    name: 'Shop Pay',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#5A31F4"/>
        <text x="5" y="20" font-family="sans-serif" font-size="10" font-weight="700" fill="#ffffff">shop</text>
        <rect x="28" y="10" width="15" height="12" rx="2" fill="#ffffff"/>
        <text x="30" y="19" font-family="sans-serif" font-size="8" font-weight="700" fill="#5A31F4">Pay</text>
      </svg>
    `)
  },
  klarna: {
    name: 'Klarna',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#FFB3C7"/>
        <path d="M12 10h2.4v12H12V10zm5.8 0h2.4v5.3l4.2-5.3h3l-4.7 5.7L28 22h-3.1l-4.7-5.8V22h-2.4V10zm14 9.5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z" fill="#0B0B0B"/>
      </svg>
    `)
  },
  afterpay: {
    name: 'Afterpay',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#B2FCE4"/>
        <path d="M12 16l4-7h4.5l-4 7 4 7H16l-4-7zm16-7h4.5l4 7-4 7H28l4-7-4-7z" fill="#000000"/>
      </svg>
    `)
  },
  venmo: {
    name: 'Venmo',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#008CFF"/>
        <path d="M31 10.5c.3 1.2.4 2.5.4 3.9 0 5-3.5 10.1-7.8 13.6h-5.8L14 11.2l4.8-.4 2.1 11.2c1.7-1.7 3.3-4.5 3.3-7 0-1.2-.2-2-.5-2.8l7.3-1.7z" fill="#ffffff"/>
      </svg>
    `)
  },
  cod: {
    name: 'Cash on Delivery',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#059669"/>
        <rect x="8" y="9" width="32" height="14" rx="2" fill="none" stroke="#ffffff" stroke-width="1.8"/>
        <circle cx="24" cy="16" r="4" fill="none" stroke="#ffffff" stroke-width="1.8"/>
        <text x="22" y="19" font-family="sans-serif" font-size="8" font-weight="bold" fill="#ffffff">$</text>
      </svg>
    `)
  },
  dhl: {
    name: 'DHL Express',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#FFCC00"/>
        <text x="7" y="21" font-family="Impact, sans-serif" font-size="16" font-style="italic" fill="#D40511" letter-spacing="1">DHL</text>
      </svg>
    `)
  },
  fedex: {
    name: 'FedEx',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0"/>
        <text x="6" y="21" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#4D148C">Fed</text>
        <text x="28" y="21" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#FF6600">Ex</text>
      </svg>
    `)
  },
  ups: {
    name: 'UPS',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#351C15"/>
        <path d="M24 7l9 4v7c0 5-4 9-9 11-5-2-9-6-9-11v-7l9-4z" fill="#FFB500"/>
        <text x="18" y="21" font-family="sans-serif" font-size="9" font-weight="900" fill="#351C15">UPS</text>
      </svg>
    `)
  },
  usps: {
    name: 'USPS',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#333366"/>
        <text x="8" y="20" font-family="Arial, sans-serif" font-size="11" font-weight="900" font-style="italic" fill="#ffffff">USPS</text>
      </svg>
    `)
  },
  royal_mail: {
    name: 'Royal Mail',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#DF1020"/>
        <text x="5" y="16" font-family="sans-serif" font-size="7" font-weight="700" fill="#FFD700">Royal</text>
        <text x="6" y="24" font-family="sans-serif" font-size="8" font-weight="700" fill="#FFD700">Mail</text>
      </svg>
    `)
  },
  dpd: {
    name: 'DPD',
    src: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
        <rect width="48" height="32" rx="4" fill="#DC0032"/>
        <text x="8" y="21" font-family="sans-serif" font-size="14" font-weight="900" fill="#ffffff">dpd</text>
      </svg>
    `)
  }
};

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
