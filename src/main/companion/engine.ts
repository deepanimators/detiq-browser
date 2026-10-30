import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, tool, stepCountIs, LanguageModel } from 'ai'
import { z } from 'zod'
import { capturePageState, getWebContentsById } from '../browser-control/page-state'
import { executeAction } from '../browser-control/actions'
import { COMPANION_SYSTEM_PROMPT } from './prompts'
import { getCompanionProfile } from './profiles'
import { getSkillsForTask } from './skills'
import { searchMemories, storeMemory } from '../memory/vector-store'
import { buildMemoryContext } from '../memory/file-memory'

const activeSessions = new Map<string, AbortController>()
const MAX_CONCURRENT_SESSIONS = 20

function resolveModel(modelId?: string): LanguageModel {
  const id = modelId ?? process.env['DETIQ_MODEL'] ?? 'claude-sonnet-4-6'

  if (id.startsWith('gpt') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('openai/')) {
    const openai = createOpenAI({ apiKey: process.env['OPENAI_API_KEY'] })
    return openai(id.replace('openai/', ''))
  }

  const anthropic = createAnthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] })
  return anthropic(id.replace('anthropic/', ''))
}

export async function runCompanion(
  sessionId: string,
  instruction: string,
  tabId: string,
  onAction: (action: CompanionAction) => void,
  companionId?: string,
  modelId?: string
): Promise<CompanionResult> {
  // Evict oldest session if at cap to prevent unbounded growth
  if (activeSessions.size >= MAX_CONCURRENT_SESSIONS) {
    const oldest = activeSessions.keys().next().value!
    activeSessions.get(oldest)?.abort()
    activeSessions.delete(oldest)
  }
  const controller = new AbortController()
  activeSessions.set(sessionId, controller)

  const model = resolveModel(modelId)
  const profile = companionId ? getCompanionProfile(companionId) : null

  // Build system prompt: base + skills + memory context
  const basePrompt = profile?.templateInstructions ?? COMPANION_SYSTEM_PROMPT
  const skills = getSkillsForTask(instruction, companionId)
  const fileMemory = companionId ? await buildMemoryContext(companionId) : ''
  const vectorMemories = companionId ? await searchMemories(instruction, companionId, 5) : []
  const vectorMemCtx = vectorMemories.length > 0
    ? '\n\n## Relevant past memories\n' + vectorMemories.map((m, i) => `${i + 1}. ${m}`).join('\n')
    : ''

  const systemPrompt = basePrompt + skills + (fileMemory ? '\n\n' + fileMemory : '') + vectorMemCtx

  const messages: { role: 'user' | 'assistant'; content: string }[] = []
  const MAX_STEPS = 50

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      if (controller.signal.aborted) {
        return { status: 'cancelled', sessionId }
      }

      const pageState = await capturePageState(tabId)

      const userContent =
        step === 0
          ? `Task: ${instruction}\n\nCurrent page:\nURL: ${pageState.url}\nTitle: ${pageState.title}\n\nVisible text (truncated):\n${pageState.visibleText.slice(0, 3000)}`
          : `Current page:\nURL: ${pageState.url}\nTitle: ${pageState.title}\n\nVisible text:\n${pageState.visibleText.slice(0, 3000)}`

      messages.push({ role: 'user', content: userContent })

      const result = await generateText({
        model,
        system: systemPrompt,
        messages,
        tools: {
          navigate: tool({
            description: 'Navigate to a URL',
            inputSchema: z.object({ url: z.string().url() }),
            execute: async ({ url }) => {
              onAction({ type: 'navigate', url })
              return executeAction(tabId, { type: 'navigate', url })
            }
          }),
          click: tool({
            description: 'Click an element on the page',
            inputSchema: z.object({
              selector: z.string().describe('CSS selector or description of element'),
              description: z.string().describe('Human-readable description of what you are clicking')
            }),
            execute: async ({ selector, description }) => {
              onAction({ type: 'click', selector, description })
              return executeAction(tabId, { type: 'click', selector })
            }
          }),
          type: tool({
            description: 'Type text into an input field',
            inputSchema: z.object({
              selector: z.string(),
              text: z.string(),
              description: z.string()
            }),
            execute: async ({ selector, text, description }) => {
              onAction({ type: 'type', selector, text, description })
              return executeAction(tabId, { type: 'type', selector, text })
            }
          }),
          extract: tool({
            description: 'Extract structured data from the current page',
            inputSchema: z.object({
              instructions: z.string().describe('What data to extract and how to structure it')
            }),
            execute: async ({ instructions }) => {
              onAction({ type: 'extract', instructions })
              return executeAction(tabId, { type: 'extract', instructions })
            }
          }),
          scroll: tool({
            description: 'Scroll the page up or down',
            inputSchema: z.object({
              direction: z.enum(['up', 'down']),
              amount: z.number().default(500)
            }),
            execute: async ({ direction, amount }) => {
              onAction({ type: 'scroll', direction, amount })
              return executeAction(tabId, { type: 'scroll', direction, amount })
            }
          }),
          request_approval: tool({
            description: 'Request user approval before performing a sensitive action (send email, submit form, delete)',
            inputSchema: z.object({
              action_description: z.string(),
              consequences: z.string()
            }),
            execute: async ({ action_description, consequences }) => {
              onAction({ type: 'approval_request', action_description, consequences })
              const { dialog } = await import('electron')
              const result = await dialog.showMessageBox({
                type: 'question',
                buttons: ['Approve', 'Deny'],
                defaultId: 0,
                cancelId: 1,
                title: 'Companion Action Approval',
                message: action_description,
                detail: `Consequences: ${consequences}`
              })
              const approved = result.response === 0
              return { approved }
            }
          }),
          take_screenshot: tool({
            description: 'Take a screenshot of the current page to visually analyze it',
            inputSchema: z.object({
              reason: z.string().describe('Why you need a screenshot')
            }),
            execute: async ({ reason }) => {
              onAction({ type: 'screenshot', reason })
              const wc = getWebContentsById(tabId)
              if (!wc) return { error: 'No active tab' }
              const img = await wc.capturePage()
              return { screenshot: img.toDataURL(), reason }
            }
          }),
          task_complete: tool({
            description: 'Signal that the task is complete',
            inputSchema: z.object({
              summary: z.string().describe('Summary of what was accomplished')
            }),
            execute: async ({ summary }) => {
              activeSessions.delete(sessionId)
              return { done: true, summary }
            }
          })
        },
        stopWhen: stepCountIs(1),
        abortSignal: controller.signal
      })

      messages.push({ role: 'assistant', content: result.text || '' })

      const completionTool = result.toolResults?.find((r) => r.toolName === 'task_complete')
      if (completionTool) {
        const summary = (completionTool as { output: { summary: string } }).output.summary
        // Store task + outcome as a vector memory for future context retrieval
        if (companionId) {
          storeMemory(companionId, `Task: ${instruction}\nOutcome: ${summary}`).catch(() => {})
        }
        return { status: 'success', sessionId, summary }
      }
    }

    return { status: 'max_steps_reached', sessionId }
  } catch (error) {
    if (controller.signal.aborted) return { status: 'cancelled', sessionId }
    throw error
  } finally {
    activeSessions.delete(sessionId)
  }
}

export function stopCompanion(sessionId: string): void {
  activeSessions.get(sessionId)?.abort()
  activeSessions.delete(sessionId)
}

export interface CompanionAction {
  type: string
  [key: string]: unknown
}

export interface CompanionResult {
  status: 'success' | 'cancelled' | 'max_steps_reached' | 'error'
  sessionId: string
  summary?: string
  error?: string
}
