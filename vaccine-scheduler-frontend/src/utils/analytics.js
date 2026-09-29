const MARKETING_ATTRIBUTION_KEY = 'pvc_marketing_attribution';
const REGISTRATION_ATTRIBUTION_KEY = 'pvc_registration_attribution';
const CHECKOUT_CONTEXT_KEY = 'pvc_checkout_context';
const ONCE_PREFIX = 'pvc_ga4_once:';

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function readLocalStorage(key) {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return safeParse(window.localStorage.getItem(key));
  } catch {
    return {};
  }
}

function writeLocalStorage(key, value) {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    })
  );
}

/**
 * Returns marketing attribution captured earlier in the funnel.
 * Never returns email or other personally identifying registration fields.
 */
export function getMarketingAttribution() {
  const marketing = readLocalStorage(MARKETING_ATTRIBUTION_KEY);
  const registration = readLocalStorage(REGISTRATION_ATTRIBUTION_KEY);

  return compactParams({
    utm_source:
      marketing.utm_source ||
      registration.utm_source ||
      '',
    utm_medium:
      marketing.utm_medium ||
      registration.utm_medium ||
      '',
    utm_campaign:
      marketing.utm_campaign ||
      registration.utm_campaign ||
      '',
    utm_content:
      marketing.utm_content ||
      registration.utm_content ||
      '',
    landing_page:
      marketing.landing_page ||
      registration.landing_page ||
      '',
  });
}

/**
 * Sends an analytics event.
 * Supports standard gtag installs and Cloudflare Zaraz.
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined') {
    return false;
  }

  const payload = compactParams({
    ...getMarketingAttribution(),
    ...params,
  });

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload);
      return true;
    }

    if (
      window.zaraz &&
      typeof window.zaraz.track === 'function'
    ) {
      window.zaraz.track(eventName, payload);
      return true;
    }
  } catch (error) {
    console.warn(`Analytics event failed: ${eventName}`, error);
  }

  return false;
}

/**
 * Sends an event only once for a unique key on this browser.
 * Useful for purchase deduplication and first-schedule tracking.
 */
export function trackEventOnce(eventName, uniqueKey, params = {}) {
  if (typeof window === 'undefined') {
    return false;
  }

  const storageKey =
    `${ONCE_PREFIX}${eventName}:${uniqueKey || 'default'}`;

  try {
    if (window.localStorage.getItem(storageKey)) {
      return false;
    }
  } catch {
    // If storage is unavailable, continue and attempt the event.
  }

  const sent = trackEvent(eventName, params);

  if (sent) {
    try {
      window.localStorage.setItem(
        storageKey,
        new Date().toISOString()
      );
    } catch {
      // Event was still sent successfully.
    }
  }

  return sent;
}

/**
 * Saves checkout context so it survives an external Stripe redirect.
 */
export function saveCheckoutContext(context = {}) {
  const payload = compactParams({
    ...getMarketingAttribution(),
    ...context,
    saved_at: new Date().toISOString(),
  });

  writeLocalStorage(CHECKOUT_CONTEXT_KEY, payload);
  return payload;
}

export function getCheckoutContext() {
  return readLocalStorage(CHECKOUT_CONTEXT_KEY);
}

export function clearCheckoutContext() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(CHECKOUT_CONTEXT_KEY);
  } catch {
    // No action needed.
  }
}
