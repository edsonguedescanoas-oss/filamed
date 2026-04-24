export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // Console log for debugging
  console.log(`[Analytics] Event: ${eventName}`, properties);

  // Here the user can add their actual tracking code, for example:
  // @ts-ignore
  if (typeof window !== 'undefined' && window.gtag) {
    // @ts-ignore
    window.gtag('event', eventName, properties);
  }
  
  // Facebook Pixel
  // @ts-ignore
  if (typeof window !== 'undefined' && window.fbq) {
    // @ts-ignore
    window.fbq('track', eventName, properties);
  }
};
