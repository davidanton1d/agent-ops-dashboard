// backend/src/scanner/patterns.js

const FS_TICKET_RE = /\/fs-ticket\s+(\d+)/i
const INC_RE = /(?:#?INC-)(\d{4,6})/i

/**
 * Extract ticket number from text.
 * Returns the numeric ticket ID string or null.
 */
export function extractTicketId(text) {
  const fsMatch = text.match(FS_TICKET_RE)
  if (fsMatch) return fsMatch[1]

  const incMatch = text.match(INC_RE)
  if (incMatch) return incMatch[1]

  return null
}

/**
 * Extract tool names from an assistant message's content blocks.
 */
export function extractToolUses(messageContent) {
  if (!Array.isArray(messageContent)) return []
  return messageContent
    .filter(block => block.type === 'tool_use')
    .map(block => block.name)
}
