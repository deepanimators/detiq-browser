import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'

function getMemoryRoot(): string {
  return join(app.getPath('userData'), 'memory')
}

function getCompanionMemoryPath(companionId: string): string {
  return join(getMemoryRoot(), 'companions', companionId, 'memory.md')
}

function getSharedMemoryPath(): string {
  return join(getMemoryRoot(), 'shared', 'global.md')
}

async function ensureDir(filePath: string): Promise<void> {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'))
  await fs.mkdir(dir, { recursive: true })
}

export async function readCompanionMemory(companionId: string): Promise<string> {
  const path = getCompanionMemoryPath(companionId)
  try {
    return await fs.readFile(path, 'utf-8')
  } catch {
    return ''
  }
}

export async function writeCompanionMemory(companionId: string, content: string): Promise<void> {
  const path = getCompanionMemoryPath(companionId)
  await ensureDir(path)
  await fs.writeFile(path, content, 'utf-8')
}

export async function appendCompanionMemory(companionId: string, fact: string): Promise<void> {
  const existing = await readCompanionMemory(companionId)
  const section = '# Companion memory'

  if (existing.includes(section)) {
    const updated = existing.trimEnd() + '\n' + fact + '\n'
    await writeCompanionMemory(companionId, updated)
  } else {
    const content = existing.trimEnd() + `\n\n${section}\n${fact}\n`
    await writeCompanionMemory(companionId, content.trimStart())
  }
}

export async function readSharedMemory(): Promise<string> {
  const path = getSharedMemoryPath()
  try {
    return await fs.readFile(path, 'utf-8')
  } catch {
    return ''
  }
}

export async function writeSharedMemory(content: string): Promise<void> {
  const path = getSharedMemoryPath()
  await ensureDir(path)
  await fs.writeFile(path, content, 'utf-8')
}

export async function buildMemoryContext(companionId: string): Promise<string> {
  const [sharedMem, companionMem] = await Promise.all([
    readSharedMemory(),
    readCompanionMemory(companionId)
  ])

  const parts: string[] = []
  if (sharedMem.trim()) parts.push(`## Shared context\n${sharedMem.trim()}`)
  if (companionMem.trim()) parts.push(`## Your memory\n${companionMem.trim()}`)

  return parts.join('\n\n')
}
