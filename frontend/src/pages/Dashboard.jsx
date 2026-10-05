import { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

function StatusBadge({ status }) {
  const isConnected = status === 'connected'
  const isPending  = status === 'pending'

  const color = isPending
    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
    : isConnected
    ? 'bg-green-500/10 text-green-400 border-green-500/30'
    : 'bg-red-500/10 text-red-400 border-red-500/30'

  const dot = isPending
    ? 'bg-yellow-400 animate-pulse'
    : isConnected
    ? 'bg-green-400'
    : 'bg-red-400'

  const label = isPending ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${color}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

export default function Dashboard() {
  const [backendStatus, setBackendStatus] = useState('pending')

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/health`, { timeout: 5000 })
      .then(() => setBackendStatus('connected'))
      .catch(() => setBackendStatus('disconnected'))
  }, [])

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <p className="text-gray-400 mt-1 text-sm">
          AI-Powered DevSecOps Security Analysis Platform
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          System Status
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Backend API</p>
            <p className="text-gray-400 text-xs mt-0.5">{API_BASE}/api/health</p>
          </div>
          <StatusBadge status={backendStatus} />
        </div>
      </div>

      <div className="mt-6 bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5">
        <p className="text-cyan-300 text-sm font-medium">Phase 1 - Foundation</p>
        <p className="text-gray-400 text-sm mt-1">
          This is the initial project scaffold. Security scanners, AI analysis, and
          repository management will be added in upcoming phases.
        </p>
      </div>
    </div>
  )
}