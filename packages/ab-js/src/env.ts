declare const __ABSNAP_API_BASE__: string
declare const __ABSNAP_CDN_BASE__: string

export const API_BASE = typeof __ABSNAP_API_BASE__ !== 'undefined'
  ? __ABSNAP_API_BASE__
  : 'https://api.absnap.com'

export const CDN_BASE = typeof __ABSNAP_CDN_BASE__ !== 'undefined'
  ? __ABSNAP_CDN_BASE__
  : 'https://cdn.absnap.com'
