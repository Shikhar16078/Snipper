const LINK_REGEX = /\b(?:https?:\/\/[^\s<>"'`]+|www\.[^\s<>"'`]+|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?::\d{2,5})?(?:\/[^\s<>"'`]*)?)/gi

function trimTrailingPunctuation(value: string): string {
  let current = value
  while (/[),.;!?]$/.test(current)) {
    current = current.slice(0, -1)
  }
  return current
}

export function normalizeLinkKey(value: string): string | null {
  const raw = value.trim()
  if (!raw || raw.includes('@')) return null

  const hasProtocol = /^https?:\/\//i.test(raw)
  const candidate = hasProtocol ? raw : `https://${raw}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

    if (!hasProtocol) {
      const parts = url.hostname.split('.')
      const tld = parts[parts.length - 1] ?? ''
      if (parts.length < 2 || !/^[a-z]{2,}$/i.test(tld)) return null
    }

    return url.toString()
  } catch {
    return null
  }
}

export function extractLinks(text: string): string[] {
  const links: string[] = []
  const seen = new Set<string>()

  for (const match of text.matchAll(LINK_REGEX)) {
    const normalized = normalizeLinkKey(trimTrailingPunctuation(match[0]))
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    links.push(normalized)
  }

  return links
}

export function getDefaultLinkTitle(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname !== '/' ? parsed.pathname.replace(/\/$/, '') : ''
    const label = `${parsed.hostname}${path}${parsed.search}`
    return label.length > 48 ? `${label.slice(0, 45)}...` : label
  } catch {
    return url
  }
}

export function getLinkTitle(url: string, titles?: Record<string, string>): string {
  const custom = titles?.[url]?.trim()
  return custom && custom.length > 0 ? custom : getDefaultLinkTitle(url)
}
