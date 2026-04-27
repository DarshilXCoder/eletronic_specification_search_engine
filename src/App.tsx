import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { marked } from 'marked'

type LookupResponse = {
  markdown?: string
  error?: string
}

const loadingSteps = [
  'Searching specifications...',
  'Fetching pricing...',
  'Comparing retailer listings...',
  'Checking release details...',
  'Assembling final report...',
]

function App() {
  const [model, setModel] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const resultRef = useRef<HTMLElement | null>(null)

  const renderedMarkdown = useMemo(() => marked.parse(markdown), [markdown])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedModel = model.trim()
    if (!trimmedModel) {
      setError('Model number is required.')
      return
    }

    setLoading(true)
    setError('')
    setMarkdown('')
    setStepIndex(0)

    const stepTimer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % loadingSteps.length)
    }, 1400)

    try {
      const response = await fetch('/api/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: trimmedModel,
          brand: brand.trim(),
          category: category.trim(),
        }),
      })

      const data = (await response.json()) as LookupResponse

      if (!response.ok) {
        throw new Error(data.error || 'Lookup failed.')
      }

      if (!data.markdown) {
        setError(`No results found for "${trimmedModel}".`)
        return
      }

      setMarkdown(data.markdown)
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    } catch (lookupError) {
      const message =
        lookupError instanceof Error ? lookupError.message : 'Unexpected error.'
      setError(message)
    } finally {
      window.clearInterval(stepTimer)
      setLoading(false)
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Live electronics research</p>
          <h1>SPECLOOKUP</h1>
        </div>
      </header>

      <main className="app-frame">
        <section className="panel input-panel">
          <div className="panel-heading">
            <p>Lookup target</p>
            <span className="status-dot" aria-hidden="true" />
          </div>

          <form onSubmit={handleSubmit} className="lookup-form">
            <label>
              <span>Model number</span>
              <input
                type="text"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="RTX 4090"
                autoComplete="off"
                required
              />
            </label>

            <label>
              <span>Brand / company</span>
              <input
                type="text"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="NVIDIA"
                autoComplete="off"
              />
            </label>

            <label>
              <span>Product category</span>
              <input
                type="text"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="GPU"
                autoComplete="off"
              />
            </label>

            <button type="submit" className="lookup-button" disabled={loading}>
              {loading ? 'Running lookup...' : 'Look Up'}
            </button>
          </form>

          {loading ? (
            <p className="loading-text" aria-live="polite">
              {loadingSteps[stepIndex]}
            </p>
          ) : null}

          {error ? <p className="error-text">{error}</p> : null}
        </section>

        <section className="panel output-panel" ref={resultRef}>
          <div className="panel-heading">
            <p>Research output</p>
            <span className="mono-label">markdown</span>
          </div>

          {markdown ? (
            <article
              className="markdown-output"
              dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
            />
          ) : (
            <div className="empty-state">
              <p className="empty-kicker">Awaiting query</p>
              <h2>Specs, pricing, and variants appear here.</h2>
              <p>
                Enter a model number, then the app runs a Gemini lookup through
                the OpenAI SDK, backed by Brave Search.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
