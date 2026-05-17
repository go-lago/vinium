/**
 * Tests for AIPanel state machine logic, extracted as a pure factory
 * (same pattern as autosave.test.ts — no React/Lexical deps).
 */
import { describe, it, expect, vi } from 'vitest'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface AIState {
  status: Status
  result: string
  error: string
}

function makeAIPanel(
  actionFn: (action: string, content: string, signal: AbortSignal) => Promise<string>,
) {
  let state: AIState = { status: 'idle', result: '', error: '' }
  let lastAction = ''
  let abortCtrl: AbortController | null = null

  async function runAction(action: string, content: string): Promise<void> {
    if (abortCtrl) abortCtrl.abort()
    abortCtrl = new AbortController()
    lastAction = action
    state = { status: 'loading', result: '', error: '' }

    try {
      const result = await actionFn(action, content, abortCtrl.signal)
      state = { status: 'success', result, error: '' }
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      state = { status: 'error', result: '', error: err?.message ?? 'unknown' }
    }
  }

  function dismiss() {
    state = { status: 'idle', result: '', error: '' }
  }

  function retry(content: string) {
    return runAction(lastAction, content)
  }

  return {
    runAction,
    dismiss,
    retry,
    getState: () => state,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AIPanel state machine', () => {
  it('starts in idle state', () => {
    const panel = makeAIPanel(vi.fn())
    expect(panel.getState().status).toBe('idle')
  })

  it('transitions idle → loading → success', async () => {
    const panel = makeAIPanel(async () => 'Summary text')
    const promise = panel.runAction('summarize', 'Some note content')
    expect(panel.getState().status).toBe('loading')
    await promise
    expect(panel.getState().status).toBe('success')
    expect(panel.getState().result).toBe('Summary text')
  })

  it('transitions idle → loading → error on rejection', async () => {
    const panel = makeAIPanel(async () => { throw new Error('network error') })
    await panel.runAction('summarize', 'content')
    expect(panel.getState().status).toBe('error')
    expect(panel.getState().error).toBe('network error')
  })

  it('dismiss resets to idle', async () => {
    const panel = makeAIPanel(async () => 'result')
    await panel.runAction('summarize', 'content')
    panel.dismiss()
    expect(panel.getState().status).toBe('idle')
    expect(panel.getState().result).toBe('')
  })

  it('AbortError leaves state in loading (not error)', async () => {
    // When the underlying request is aborted, the state machine swallows the error
    // and does not transition to 'error' — the state stays wherever it was.
    const panel = makeAIPanel(async () => {
      const err = new Error('aborted')
      err.name = 'AbortError'
      throw err
    })

    await panel.runAction('summarize', 'content')
    expect(panel.getState().status).toBe('loading')
    expect(panel.getState().error).toBe('')
  })

  it('retry re-runs the last action', async () => {
    let calls = 0
    const panel = makeAIPanel(async () => {
      calls++
      if (calls === 1) throw new Error('fail')
      return 'ok'
    })

    await panel.runAction('summarize', 'content')
    expect(panel.getState().status).toBe('error')

    await panel.retry('content')
    expect(panel.getState().status).toBe('success')
    expect(panel.getState().result).toBe('ok')
  })

  it('second action cancels first in-flight request', async () => {
    let firstAborted = false
    const panel = makeAIPanel(async (_action, _content, signal) => {
      if (_action === 'summarize') {
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            firstAborted = true
            const err = new Error('AbortError')
            err.name = 'AbortError'
            reject(err)
          })
        })
        return 'first result'
      }
      return 'second result'
    })

    const p1 = panel.runAction('summarize', 'content')
    const p2 = panel.runAction('rephrase', 'content')
    await Promise.allSettled([p1, p2])

    expect(firstAborted).toBe(true)
    expect(panel.getState().result).toBe('second result')
  })
})
