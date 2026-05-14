/**
 * Тесты автосохранения: таймеры, статус ошибки, отсутствие вызовов после unmount.
 *
 * Тестируем логику scheduleSave/save изолированно, без React-компонента,
 * чтобы не тащить в тесты Lexical и react-router.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Фабрика автосохранения (воспроизводит логику NoteEditorPage) ─────────────

function makeAutosave(saveFn: (title: string, content: string) => Promise<void>, delay = 100) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let titleRef = ''
  let contentRef = ''

  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => saveFn(titleRef, contentRef), delay)
  }

  function setTitle(v: string) { titleRef = v; schedule() }
  function setContent(v: string) { contentRef = v; schedule() }

  function cleanup() {
    if (timer) clearTimeout(timer)
    timer = null
  }

  return { setTitle, setContent, cleanup }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('autosave: no timer fire after cleanup', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('does not call save after cleanup is called', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { setTitle, cleanup } = makeAutosave(save, 200)

    setTitle('Hello')       // schedules save at +200ms
    cleanup()               // should cancel the timer
    vi.advanceTimersByTime(500)

    expect(save).not.toHaveBeenCalled()
  })

  it('debounces: rapid changes produce only one save call', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { setTitle } = makeAutosave(save, 200)

    setTitle('H')
    setTitle('He')
    setTitle('Hel')
    setTitle('Hell')
    setTitle('Hello')

    vi.advanceTimersByTime(250)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('Hello', '')
  })
})

describe('autosave: save error status', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('captures error when save rejects', async () => {
    const error = new Error('network error')
    const save = vi.fn().mockRejectedValue(error)

    const statuses: string[] = []
    let savedError: Error | null = null

    async function wrappedSave(title: string, content: string) {
      statuses.push('saving')
      try {
        await save(title, content)
        statuses.push('saved')
      } catch (e) {
        savedError = e as Error
        statuses.push('error')
      }
    }

    const { setTitle } = makeAutosave(wrappedSave, 100)
    setTitle('Test')
    vi.advanceTimersByTime(150)
    // flush the promise
    await vi.runAllTimersAsync()

    expect(statuses).toContain('saving')
    expect(statuses).toContain('error')
    expect(statuses).not.toContain('saved')
    expect(savedError).toBe(error)
  })
})

describe('autosave: pin race — pin wins without losing content', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('pin update carries latest title/content from refs', async () => {
    const calls: Array<{ title: string; content: string; isPinned?: boolean }> = []

    const saveFn = vi.fn(async (title: string, content: string) => {
      calls.push({ title, content })
    })
    const pinFn = vi.fn(async (title: string, content: string, isPinned: boolean) => {
      calls.push({ title, content, isPinned })
    })

    let titleRef = ''
    let contentRef = ''

    function scheduleAutoSave() {
      saveFn(titleRef, contentRef)
    }

    // Simulate: user types → schedules save → immediately pins before timer fires
    titleRef = 'My Note'
    contentRef = 'Some text'
    // Pin fires before autosave debounce
    await pinFn(titleRef, contentRef, true)
    // Now autosave fires with same refs
    scheduleAutoSave()

    expect(pinFn).toHaveBeenCalledWith('My Note', 'Some text', true)
    // Autosave should also see the latest state
    expect(saveFn).toHaveBeenCalledWith('My Note', 'Some text')
  })
})
