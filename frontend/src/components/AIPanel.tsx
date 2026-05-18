import { useRef, useState } from 'react'
import { aiApi } from '@/api/ai'
import axios from 'axios'
import { Button } from '@/components/ui/button'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface Props {
  isDraft: boolean
  contentRef: React.RefObject<string>
}

const ACTIONS = [
  { key: 'summarize', label: 'Сводка' },
  { key: 'rephrase', label: 'Перефразировать' },
  { key: 'expand', label: 'Расширить' },
] as const

export function AIPanel({ isDraft, contentRef }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [lastAction, setLastAction] = useState('')
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const isDisabled = isDraft || contentRef.current === ''
  const isLoading = status === 'loading'

  async function runAction(action: string) {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLastAction(action)
    setStatus('loading')
    setResult('')
    setErrorMsg('')

    try {
      const { data } = await aiApi.action(action, contentRef.current, ctrl.signal)
      setResult(data.result)
      setStatus('success')
    } catch (err) {
      if (axios.isCancel(err)) return
      let msg = 'Что-то пошло не так'
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        if (status === 429) msg = 'Превышен лимит запросов. Попробуйте позже.'
        else if (status === 400) msg = err.response?.data?.error ?? 'Заметка пуста'
        else if (status === 504) msg = 'AI не ответил за 30 сек. Попробуйте снова.'
        else if (status === 503) msg = 'AI временно недоступен'
      }
      setErrorMsg(msg)
      setStatus('error')
    }
  }

  function dismiss() {
    if (abortRef.current) abortRef.current.abort()
    setStatus('idle')
    setResult('')
    setErrorMsg('')
  }

  async function copy() {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
        AI — вся заметка
      </p>

      {/* Action buttons */}
      <div className="flex flex-col gap-1 mb-3">
        {ACTIONS.map(({ key, label }) => (
          <Button
            key={key}
            variant="outline"
            size="xs"
            disabled={isDisabled || isLoading}
            onClick={() => runAction(key)}
            className="justify-start font-mono text-[11px]"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-1.5 mb-2">
          {[70, 90, 55].map((w) => (
            <div
              key={w}
              className="h-2 rounded bg-muted animate-pulse"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="mt-1">
          <p className="text-[12px] leading-relaxed text-foreground max-h-48 overflow-y-auto mb-2 whitespace-pre-wrap">
            {result}
          </p>
          <div className="flex gap-1.5">
            <Button variant="outline" size="xs" onClick={copy}>
              {copied ? 'Скопировано ✓' : 'Копировать'}
            </Button>
            <Button variant="ghost" size="xs" onClick={dismiss}>×</Button>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="mt-1">
          <p className="text-[11px] text-destructive mb-1.5 leading-snug">{errorMsg}</p>
          <div className="flex gap-1.5">
            <Button variant="outline" size="xs" onClick={() => runAction(lastAction)}>
              Повторить
            </Button>
            <Button variant="ghost" size="xs" onClick={dismiss}>×</Button>
          </div>
        </div>
      )}

      {/* Hint when disabled */}
      {isDisabled && status === 'idle' && (
        <p className="text-[11px] text-muted-foreground px-0.5 leading-relaxed">
          {isDraft ? 'Сохраните заметку, чтобы использовать AI' : 'Начните писать, чтобы использовать AI'}
        </p>
      )}
    </div>
  )
}
