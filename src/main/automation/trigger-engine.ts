import { getDb } from '../storage/db'
import { randomUUID } from 'crypto'

export interface AutomationRule {
  id: string
  name: string
  trigger_type: 'url_match' | 'schedule' | 'page_content'
  trigger_pattern: string    // glob/regex for url_match, cron for schedule, keyword for page_content
  companion_id: string
  instruction: string
  enabled: boolean
  last_run?: number
  run_count: number
  created_at: number
}

// ── Rule CRUD ──────────────────────────────────────────────────────────────

export function listRules(): AutomationRule[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM automation_rules ORDER BY created_at DESC').all()
  return (rows as AutomationRule[]).map((r) => ({ ...r, enabled: Boolean(r.enabled) }))
}

export function createRule(data: Omit<AutomationRule, 'id' | 'run_count' | 'created_at'>): AutomationRule {
  const db = getDb()
  const id = randomUUID()
  const created_at = Math.floor(Date.now() / 1000)
  db.prepare(`
    INSERT INTO automation_rules (id, name, trigger_type, trigger_pattern, companion_id, instruction, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.trigger_type, data.trigger_pattern, data.companion_id, data.instruction, data.enabled ? 1 : 0, created_at)
  return { ...data, id, run_count: 0, created_at }
}

export function deleteRule(id: string): void {
  getDb().prepare('DELETE FROM automation_rules WHERE id = ?').run(id)
}

export function toggleRule(id: string, enabled: boolean): void {
  getDb().prepare('UPDATE automation_rules SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id)
}

// ── URL trigger evaluation ─────────────────────────────────────────────────

function urlMatchesPattern(url: string, pattern: string): boolean {
  // Hard-cap pattern length to prevent ReDoS on user-supplied regex
  if (pattern.length > 300) return url.includes(pattern.slice(0, 100))
  try {
    // Custom regex: only if short and explicitly delimited
    if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length <= 100) {
      return new RegExp(pattern.slice(1, -1)).test(url)
    }
    // Glob-style: escape metacharacters first, then restore * → .*
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
    return new RegExp(`^${escaped}$`).test(url)
  } catch {
    return url.includes(pattern)
  }
}

/**
 * Called after each navigation. Returns matching rules that should auto-run.
 * Caller is responsible for actually running the companion.
 */
export function getMatchingUrlRules(url: string): AutomationRule[] {
  const rules = listRules()
  return rules.filter(
    (r) => r.enabled && r.trigger_type === 'url_match' && urlMatchesPattern(url, r.trigger_pattern)
  )
}

export function recordRuleExecution(ruleId: string): void {
  const db = getDb()
  db.prepare(
    'UPDATE automation_rules SET last_run = unixepoch(), run_count = run_count + 1 WHERE id = ?'
  ).run(ruleId)
}

// ── Page-content trigger evaluation ───────────────────────────────────────

export function getMatchingContentRules(pageText: string): AutomationRule[] {
  const rules = listRules()
  const text = pageText.toLowerCase()
  return rules.filter(
    (r) => r.enabled && r.trigger_type === 'page_content' && text.includes(r.trigger_pattern.toLowerCase())
  )
}

// ── Pre-built common automation templates ─────────────────────────────────

export const AUTOMATION_TEMPLATES: Omit<AutomationRule, 'id' | 'run_count' | 'created_at' | 'last_run'>[] = [
  {
    name: 'Auto-summarize LinkedIn profiles',
    trigger_type: 'url_match',
    trigger_pattern: 'https://www.linkedin.com/in/*',
    companion_id: 'talent-ren',
    instruction: 'Summarize this LinkedIn profile: extract name, current role, company, experience summary, key skills, and an overall assessment of fit as a candidate.',
    enabled: false
  },
  {
    name: 'Auto-extract product pricing',
    trigger_type: 'url_match',
    trigger_pattern: '*/pricing*',
    companion_id: 'sales-sam',
    instruction: 'Extract all pricing plans from this page: plan names, prices (monthly and annual), included features, and any hidden limits or overages.',
    enabled: false
  },
  {
    name: 'Auto-research company on homepage',
    trigger_type: 'url_match',
    trigger_pattern: 'https://*.com/',
    companion_id: 'research-ria',
    instruction: 'Research this company: what they do, who they serve, estimated size, and any notable facts visible on the homepage.',
    enabled: false
  },
  {
    name: 'Auto-summarize GitHub repositories',
    trigger_type: 'url_match',
    trigger_pattern: 'https://github.com/*/*',
    companion_id: 'developer-dev',
    instruction: 'Summarize this GitHub repository: purpose, tech stack, activity level, notable issues, and whether it looks well-maintained.',
    enabled: false
  }
]
