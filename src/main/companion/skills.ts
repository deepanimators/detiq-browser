import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

interface Skill {
  name: string
  description: string
  triggers: string[]
  companions: string[] // companion IDs or ['all']
  body: string
}

let cache: Skill[] | null = null

function skillsDir(): string {
  // dev: src/skills relative to main output dir (out/main → ../../src/skills)
  // prod: resources/skills
  const candidates = [
    join(__dirname, '../../../src/skills'),
    join(process.resourcesPath ?? '', 'skills')
  ]
  for (const c of candidates) {
    try { readdirSync(c); return c } catch { /* try next */ }
  }
  return candidates[0]
}

function parseMeta(raw: string): Record<string, string> {
  const meta: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return meta
}

function loadAll(): Skill[] {
  if (cache) return cache
  try {
    const dir = skillsDir()
    const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
    cache = files.map((f) => {
      const raw = readFileSync(join(dir, f), 'utf-8')
      const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/)
      const meta = match ? parseMeta(match[1]) : {}
      const body = match ? match[2] : raw
      return {
        name: meta.name ?? f.replace('.md', ''),
        description: meta.description ?? '',
        triggers: (meta.triggers ?? '').split(',').map((t) => t.trim()).filter(Boolean),
        companions: (meta.companions ?? 'all').split(',').map((t) => t.trim()),
        body: body.trim()
      }
    })
  } catch {
    cache = []
  }
  return cache!
}

export function getSkillsForTask(instruction: string, companionId?: string): string {
  const skills = loadAll()
  const query = instruction.toLowerCase()

  const relevant = skills.filter((s) => {
    const companionMatch = s.companions.includes('all') || (companionId ? s.companions.includes(companionId) : false)
    if (!companionMatch) return false
    return s.triggers.some((t) => query.includes(t)) ||
           s.name.replace(/-/g, ' ').split(' ').some((w) => w.length > 3 && query.includes(w))
  })

  if (relevant.length === 0) return ''
  return '\n\n## Activated Skills\n\n' + relevant.map((s) => `### ${s.name}\n${s.body}`).join('\n\n')
}

export function listSkills(): { name: string; description: string; companions: string[] }[] {
  return loadAll().map(({ name, description, companions }) => ({ name, description, companions }))
}

export function reloadSkills(): void {
  cache = null
}
