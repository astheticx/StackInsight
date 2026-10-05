import { useState } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

// ─── Sub-components ────────────────────────────────────────────────────────

function LanguagePill({ lang }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
      {lang}
    </span>
  )
}

function ResultCard({ data }) {
  const { repository, total_files, detected_languages } = data
  return (
    <div className="mt-6 bg-gray-900 border border-green-500/30 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-green-400 text-sm font-semibold">Repository Ready</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Owner</p>
          <p className="text-white font-medium">{repository.owner}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Repository</p>
          <p className="text-white font-medium">{repository.name}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total Files</p>
          <p className="text-white font-medium">{total_files.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">URL</p>
          <a
            href={repository.url}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400 hover:text-cyan-300 truncate block"
          >
            {repository.url}
          </a>
        </div>
      </div>

      {detected_languages.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            Detected Languages
          </p>
          <div className="flex flex-wrap gap-2">
            {detected_languages.map((lang) => (
              <LanguagePill key={lang} lang={lang} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ErrorAlert({ message }) {
  return (
    <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3">
      <span className="text-red-400 text-lg leading-none">⚠</span>
      <p className="text-red-300 text-sm">{message}</p>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function NewScan() {
  const [url, setUrl]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [result, setResult]   = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const { data } = await axios.post(
        `${API_BASE}/api/repositories/prepare`,
        { repository_url: url.trim() },
        { timeout: 90_000 },   // 90 s — allow time for clone
      )
      setResult(data)
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'An unexpected error occurred.'
      // Pydantic validation errors come back as an array
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(' '))
      } else {
        setError(String(detail))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">New Scan</h2>
        <p className="text-gray-400 mt-1 text-sm">
          Enter a public GitHub repository URL to prepare it for analysis.
        </p>
      </div>

      {/* Input card */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4"
      >
        <div>
          <label
            htmlFor="repo-url"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            GitHub Repository URL
          </label>
          <input
            id="repo-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            required
            disabled={loading}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white
                       placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500
                       focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 transition-colors"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Only public GitHub repositories are supported in this phase.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700
                     disabled:text-gray-500 text-white font-medium py-2.5 px-4 rounded-lg
                     text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Cloning repository…
            </>
          ) : (
            'Prepare Repository'
          )}
        </button>
      </form>

      {/* Error */}
      {error && <ErrorAlert message={error} />}

      {/* Success result */}
      {result && <ResultCard data={result} />}
    </div>
  )
}