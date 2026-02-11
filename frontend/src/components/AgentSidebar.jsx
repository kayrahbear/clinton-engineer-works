import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { chatWithAgent, clearAgentConversation, getAgentConversation } from '../api'
import { useActiveLegacy } from '../context/useActiveLegacy'

export default function AgentSidebar({ isOpen, onClose }) {
  const { activeLegacyId, loading: legacyLoading } = useActiveLegacy()
  const [conversationId, setConversationId] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)
  const abortRef = useRef(null)

  const STREAM_BASE_URL =
    import.meta.env.VITE_STREAM_API_BASE_URL ??
    import.meta.env.VITE_API_BASE_URL ??
    'http://localhost:3001/api/v1'

  const canChat = useMemo(() => !legacyLoading && Boolean(activeLegacyId), [legacyLoading, activeLegacyId])

  useEffect(() => {
    if (!isOpen) return
    if (!canChat) {
      setConversationId('')
      setMessages([])
      setError('')
      return
    }

    let isMounted = true

    async function loadConversation() {
      try {
        setLoading(true)
        setError('')
        const data = await getAgentConversation(activeLegacyId)
        if (!isMounted) return
        const convo = data.conversation
        setConversationId(convo?.conversation_id || '')
        setMessages(data.messages || [])
      } catch (requestError) {
        if (!isMounted) return
        setError(requestError?.data?.error || requestError?.message || 'Failed to load conversation.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadConversation()

    return () => {
      isMounted = false
    }
  }, [isOpen, canChat, activeLegacyId, legacyLoading])

  useEffect(() => {
    if (!isOpen) return
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, loading, isOpen])

  useEffect(() => () => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const applyStreamingUpdate = (content, { finalize = false, reply } = {}) => {
    setMessages((prev) => {
      const next = [...prev]
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].role === 'assistant' && next[i].is_streaming) {
          next[i] = {
            ...next[i],
            content,
            is_streaming: finalize ? false : true,
            input_tokens: finalize ? reply?.input_tokens : next[i].input_tokens,
            output_tokens: finalize ? reply?.output_tokens : next[i].output_tokens,
            tool_calls: finalize ? reply?.tool_calls || null : next[i].tool_calls,
          }
          break
        }
      }
      return next
    })
  }

  const streamAssistantResponse = async ({ legacyId, conversationId, message }) => {
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller
    setStreaming(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${STREAM_BASE_URL}/agent/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          legacy_id: legacyId,
          conversation_id: conversationId,
          message,
        }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error('Streaming request failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      const processEvent = (event, data) => {
        if (event === 'chunk') {
          const chunk = JSON.parse(data)
          fullText += chunk
          applyStreamingUpdate(fullText)
        } else if (event === 'done') {
          const payload = JSON.parse(data)
          applyStreamingUpdate(payload.reply?.content || fullText, {
            finalize: true,
            reply: payload.reply,
          })
          if (payload.conversation_id) {
            setConversationId(payload.conversation_id)
          }
        } else if (event === 'error') {
          const payload = JSON.parse(data)
          throw new Error(payload?.error || 'Streaming error')
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let separatorIndex = buffer.indexOf('\n\n')
        while (separatorIndex !== -1) {
          const rawEvent = buffer.slice(0, separatorIndex).trim()
          buffer = buffer.slice(separatorIndex + 2)

          let eventType = 'message'
          const dataLines = []
          rawEvent.split('\n').forEach((line) => {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim()
            } else if (line.startsWith('data:')) {
              dataLines.push(line.replace('data:', '').trim())
            }
          })

          if (dataLines.length > 0) {
            processEvent(eventType, dataLines.join('\n'))
          }

          separatorIndex = buffer.indexOf('\n\n')
        }
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const handleSend = async (event) => {
    event.preventDefault()
    if (!input.trim() || !canChat || loading || streaming) return

    try {
      const trimmedInput = input.trim()
      const timestamp = new Date().toISOString()
      setInput('')
      setLoading(true)
      setError('')
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmedInput, created_at: timestamp },
        { role: 'assistant', content: '', created_at: timestamp, is_streaming: true },
      ])

      try {
        await streamAssistantResponse({
          legacyId: activeLegacyId,
          conversationId: conversationId || undefined,
          message: trimmedInput,
        })
      } catch (streamError) {
        const data = await chatWithAgent({
          legacyId: activeLegacyId,
          conversationId: conversationId || undefined,
          message: trimmedInput,
        }, { timeout: 30000 })

        const reply = data?.reply
        const nextConversationId = data?.conversation_id || conversationId
        setConversationId(nextConversationId)
        applyStreamingUpdate(reply?.content || 'No response received.', {
          finalize: true,
          reply,
        })
      }
    } catch (requestError) {
      setMessages((prev) => prev.filter((message) => !message.is_streaming))
      setError(requestError?.data?.error || requestError?.message || 'Failed to send message.')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    if (!canChat || clearing) return
    try {
      setClearing(true)
      setError('')
      await clearAgentConversation(activeLegacyId, {
        conversation_id: conversationId || undefined,
      })
      setConversationId('')
      setMessages([])
    } catch (requestError) {
      setError(requestError?.data?.error || requestError?.message || 'Failed to clear chat.')
    } finally {
      setClearing(false)
    }
  }

  const handleClose = () => {
    setError('')
    onClose?.()
  }

  const renderMarkdown = (content) => (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mt-2 first:mt-0">{children}</p>,
        a: ({ children, ...props }) => (
          <a
            {...props}
            className="text-ff-mint underline underline-offset-2 hover:text-ff-mint/80"
            target="_blank"
            rel="noreferrer"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ inline, children }) =>
          inline ? (
            <code className="rounded bg-ff-border/40 px-1 py-0.5 font-mono text-xs text-ff-text">
              {children}
            </code>
          ) : (
            <code className="block whitespace-pre-wrap">{children}</code>
          ),
        pre: ({ children }) => (
          <pre className="mt-2 overflow-x-auto rounded-xl bg-ff-border/30 p-3 text-xs text-ff-text">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mt-2 border-l-2 border-ff-mint/40 pl-3 text-ff-muted">
            {children}
          </blockquote>
        ),
        h1: ({ children }) => <h1 className="mt-3 text-base font-semibold">{children}</h1>,
        h2: ({ children }) => <h2 className="mt-3 text-sm font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="mt-3 text-sm font-semibold">{children}</h3>,
      }}
    >
      {content}
    </ReactMarkdown>
  )

  return (
    <>
      {isOpen && (
        <button
          type="button"
          onClick={handleClose}
          className="fixed inset-0 z-40 cursor-default bg-black/40"
          aria-label="Close agent panel"
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-ff-border/70 bg-ff-surface/95 backdrop-blur transition-transform duration-300 md:left-0 md:right-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full md:-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-ff-border/60 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ff-muted">AI Agent</p>
            <h2 className="text-lg font-semibold text-ff-text">Legacy companion</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={!messages.length || clearing}
              className="rounded-full border border-ff-border/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-ff-muted transition hover:text-ff-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              {clearing ? 'Clearing...' : 'Clear'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-ff-border/60 px-3 py-1 text-sm text-ff-muted transition hover:text-ff-text"
            >
              Close
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto px-5 py-4">
          {legacyLoading && <p className="text-sm text-ff-muted">Loading legacy context...</p>}
          {!legacyLoading && !activeLegacyId && (
            <p className="text-sm text-ff-muted">
              Select a legacy to start chatting with your assistant.
            </p>
          )}
          {error && (
            <p className="mb-3 rounded-lg border border-ff-pink/40 bg-ff-pink/10 px-3 py-2 text-sm text-ff-pink">
              {error}
            </p>
          )}
          {messages.length === 0 && canChat && !loading && !error && (
            <p className="text-sm text-ff-muted">
              Start a conversation. Ask for a summary, describe your play session, or tell me what
              happened in your game and I'll update your data automatically!
            </p>
          )}
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${message.created_at || index}`}
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'ml-auto bg-ff-mint/15 text-ff-text'
                    : 'mr-auto bg-ff-border/20 text-ff-text'
                }`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-ff-muted">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </p>
                <div className="mt-2 text-sm text-ff-text">{renderMarkdown(message.content)}</div>
                {message.role === 'assistant' &&
                  message.tool_calls &&
                  message.tool_calls.length > 0 && (
                    <details className="mt-3 rounded-lg border border-ff-border/40 bg-ff-border/10 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-medium text-ff-muted">
                        Updated {message.tool_calls.length} item
                        {message.tool_calls.length !== 1 ? 's' : ''}
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-ff-muted">
                        {message.tool_calls.map((tool, toolIndex) => (
                          <li key={toolIndex} className="flex items-start gap-1.5">
                            <span>{tool.result?.success ? '\u2705' : '\u274c'}</span>
                            <span>{tool.result?.message || tool.result?.error || tool.name}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                {message.role === 'assistant' &&
                  (message.input_tokens || message.output_tokens) && (
                    <p className="mt-3 text-xs text-ff-muted">
                      Tokens: in {message.input_tokens ?? 0} · out {message.output_tokens ?? 0}
                    </p>
                  )}
              </div>
            ))}
            {loading && (
              <div className="mr-auto w-fit max-w-[85%] rounded-2xl bg-ff-border/20 px-4 py-3 text-sm text-ff-text">
                <p className="text-xs uppercase tracking-[0.2em] text-ff-muted">Assistant</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ff-mint" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ff-mint [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ff-mint [animation-delay:300ms]" />
                  <span className="text-xs text-ff-muted">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <form onSubmit={handleSend} className="border-t border-ff-border/60 px-5 py-4">
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-ff-muted">
            Your message
          </label>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-2xl border border-ff-border/60 bg-ff-surface px-4 py-3 text-sm text-ff-text focus:border-ff-mint/60 focus:outline-none"
            placeholder={canChat ? 'Ask about your legacy...' : 'Select a legacy first.'}
            disabled={!canChat || loading}
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-ff-muted">Streaming response mode</p>
            <button
              type="submit"
              disabled={!canChat || loading || streaming || !input.trim()}
              className="rounded-full bg-ff-mint/20 px-4 py-2 text-sm font-medium text-ff-mint transition hover:bg-ff-mint/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </form>
      </aside>
    </>
  )
}
