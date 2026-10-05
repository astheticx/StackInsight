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

function SeverityBadge({ severity }) {
  const s = (severity || 'INFO').toUpperCase()
  let color = 'bg-gray-800 text-gray-300 border-gray-600'

  if (s === 'CRITICAL') {
    color = 'bg-red-950/70 text-red-300 border-red-500/60'
  } else if (s === 'HIGH') {
    color = 'bg-orange-950/70 text-orange-300 border-orange-500/60'
  } else if (s === 'MEDIUM') {
    color = 'bg-yellow-950/70 text-yellow-300 border-yellow-500/60'
  } else if (s === 'LOW') {
    color = 'bg-blue-950/70 text-blue-300 border-blue-500/60'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {s}
    </span>
  )
}

function ErrorAlert({ message }) {
  return (
    <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3">
      <span className="text-red-400 text-lg leading-none">⚠</span>
      <p className="text-red-300 text-sm whitespace-pre-wrap">{message}</p>
    </div>
  )
}

function FindingItem({ finding }) {
  const lines =
    finding.start_line === finding.end_line
      ? `Line ${finding.start_line}`
      : `Lines ${finding.start_line}–${finding.end_line}`

  return (
    <div className="bg-gray-900 border border-gray-700/80 hover:border-gray-600 rounded-xl p-5 space-y-3 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <h4 className="text-sm font-semibold text-white">{finding.title}</h4>
          </div>
          <p className="text-xs text-cyan-400 font-mono break-all">{finding.rule_id}</p>
        </div>
        <div className="text-right text-xs text-gray-400 font-mono bg-gray-800/80 px-2.5 py-1 rounded border border-gray-700">
          <span>{finding.file_path}</span>
          <span className="text-gray-500 mx-1.5">:</span>
          <span className="text-cyan-300">{lines}</span>
        </div>
      </div>

      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
        {finding.description}
      </p>

      {((finding.cwe && finding.cwe.length > 0) || (finding.owasp && finding.owasp.length > 0)) && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-800 text-xs">
          {finding.cwe?.map((c, i) => (
            <span key={i} className="px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/50">
              {c}
            </span>
          ))}
          {finding.owasp?.map((o, i) => (
            <span key={i} className="px-2 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-800/50">
              {o}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ScanResultsView({ scanData }) {
  const { repository, scanner, total_findings, severity_summary, findings } = scanData

  return (
    <div className="mt-8 space-y-6">
      {/* Header and Summary Bar */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-lg font-bold text-white tracking-tight">Security Scan Results</h3>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase font-mono">
                {scanner}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Repository: <span className="text-white font-medium">{repository.owner}/{repository.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Total Findings:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
              total_findings > 0
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-green-500/10 text-green-300 border-green-500/30'
            }`}>
              {total_findings}
            </span>
          </div>
        </div>

        {/* Severity Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-gray-800/70 border border-red-500/20 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 uppercase font-medium">Critical</p>
            <p className="text-xl font-bold text-red-400 mt-1">{severity_summary.critical}</p>
          </div>
          <div className="bg-gray-800/70 border border-orange-500/20 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 uppercase font-medium">High</p>
            <p className="text-xl font-bold text-orange-400 mt-1">{severity_summary.high}</p>
          </div>
          <div className="bg-gray-800/70 border border-yellow-500/20 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 uppercase font-medium">Medium</p>
            <p className="text-xl font-bold text-yellow-400 mt-1">{severity_summary.medium}</p>
          </div>
          <div className="bg-gray-800/70 border border-blue-500/20 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 uppercase font-medium">Low</p>
            <p className="text-xl font-bold text-blue-400 mt-1">{severity_summary.low}</p>
          </div>
          <div className="bg-gray-800/70 border border-gray-600/30 rounded-lg p-3 text-center col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-400 uppercase font-medium">Info</p>
            <p className="text-xl font-bold text-gray-300 mt-1">{severity_summary.info}</p>
          </div>
        </div>
      </div>

      {/* Findings list or Zero Findings message */}
      {total_findings === 0 ? (
        <div className="bg-gray-900 border border-green-500/30 rounded-xl p-8 text-center space-y-2">
          <div className="text-3xl text-green-400">🛡️</div>
          <h4 className="text-base font-semibold text-white">No security findings detected by Semgrep.</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Semgrep analyzed the repository against standard security rules and found 0 matching vulnerabilities.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Detailed Findings ({findings.length})
          </h4>
          <div className="space-y-3">
            {findings.map((item, idx) => (
              <FindingItem key={`${item.rule_id}-${item.file_path}-${item.start_line}-${idx}`} finding={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function NewScan() {
  const [url, setUrl]                     = useState('')
  const [preparing, setPreparing]         = useState(false)
  const [scanning, setScanning]           = useState(false)
  const [prepareError, setPrepareError]   = useState(null)
  const [scanError, setScanError]         = useState(null)
  const [preparedRepo, setPreparedRepo]   = useState(null)
  const [scanResult, setScanResult]       = useState(null)

  const handlePrepareSubmit = async (e) => {
    e.preventDefault()
    setPrepareError(null)
    setScanError(null)
    setPreparedRepo(null)
    setScanResult(null)
    setPreparing(true)

    try {
      const { data } = await axios.post(
        `${API_BASE}/api/repositories/prepare`,
        { repository_url: url.trim() },
        { timeout: 90_000 }
      )
      setPreparedRepo(data)
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to prepare repository.'
      if (Array.isArray(detail)) {
        setPrepareError(detail.map((d) => d.msg).join(' '))
      } else {
        setPrepareError(String(detail))
      }
    } finally {
      setPreparing(false)
    }
  }

  const handleRunScan = async () => {
    if (!preparedRepo || scanning) return
    setScanError(null)
    setScanResult(null)
    setScanning(true)

    try {
      const targetUrl = preparedRepo.repository?.url || url.trim()
      const { data } = await axios.post(
        `${API_BASE}/api/scans/semgrep`,
        { repository_url: targetUrl },
        { timeout: 240_000 }
      )
      setScanResult(data)
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Semgrep security scan failed.'
      if (Array.isArray(detail)) {
        setScanError(detail.map((d) => d.msg).join(' '))
      } else {
        setScanError(String(detail))
      }
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="max-w-3xl pb-16">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">New Scan</h2>
        <p className="text-gray-400 mt-1 text-sm">
          Prepare a public GitHub repository and run a Semgrep security scan.
        </p>
      </div>

      {/* Step 1: Repository Input */}
      <form
        onSubmit={handlePrepareSubmit}
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4"
      >
        <div>
          <label htmlFor="repo-url" className="block text-sm font-medium text-gray-300 mb-2">
            GitHub Repository URL
          </label>
          <input
            id="repo-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            required
            disabled={preparing || scanning}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white
                       placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500
                       focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 transition-colors"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Enter a public GitHub repository URL (e.g., https://github.com/owner/repo).
          </p>
        </div>

        <button
          type="submit"
          disabled={preparing || scanning || !url.trim()}
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700
                     disabled:text-gray-500 text-white font-medium py-2.5 px-4 rounded-lg
                     text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {preparing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Preparing repository…
            </>
          ) : (
            'Prepare Repository'
          )}
        </button>
      </form>

      {/* Prepare Error */}
      {prepareError && <ErrorAlert message={prepareError} />}

      {/* Step 2: Repository Prepared Card with "Run Security Scan" */}
      {preparedRepo && (
        <div className="mt-6 bg-gray-900 border border-green-500/30 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="text-green-400 text-sm font-semibold">Repository Ready</span>
            </div>
            <span className="text-xs text-gray-500">Phase 2 Verified</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-gray-800/40 p-4 rounded-lg border border-gray-800">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Owner</p>
              <p className="text-white font-medium truncate">{preparedRepo.repository.owner}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Repository</p>
              <p className="text-white font-medium truncate">{preparedRepo.repository.name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total Files</p>
              <p className="text-white font-medium">{preparedRepo.total_files.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">URL</p>
              <a
                href={preparedRepo.repository.url}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 truncate block text-xs underline"
              >
                View on GitHub
              </a>
            </div>
          </div>

          {preparedRepo.detected_languages?.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Detected Languages</p>
              <div className="flex flex-wrap gap-1.5">
                {preparedRepo.detected_languages.map((lang) => (
                  <LanguagePill key={lang} lang={lang} />
                ))}
              </div>
            </div>
          )}

          {/* Action Button: Run Security Scan */}
          <div className="pt-2 border-t border-gray-800">
            <button
              onClick={handleRunScan}
              disabled={scanning}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700
                         disabled:text-gray-400 text-white font-semibold py-3 px-4 rounded-lg
                         text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-emerald-950/40"
            >
              {scanning ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running Semgrep Security Scan… (please wait)
                </>
              ) : (
                <>
                  <span>🛡️</span>
                  Run Security Scan
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Scan Error */}
      {scanError && <ErrorAlert message={scanError} />}

      {/* Step 3: Scan Results Display */}
      {scanResult && <ScanResultsView scanData={scanResult} />}
    </div>
  )
}