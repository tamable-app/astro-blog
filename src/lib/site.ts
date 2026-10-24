/** The canonical address with no trailing slash: SITE_URL, or `url` in site.config.ts. */
export const siteUrl = import.meta.env.SITE.replace(/\/+$/, '')
