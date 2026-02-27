import { useState } from 'react'
import { useUIStore } from '../../store/uiStore'

export function APIKeyInput() {
  const apiKey = useUIStore((s) => s.apiKey)
  const setApiKey = useUIStore((s) => s.setApiKey)
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: '#888' }}>Anthropic API Key</label>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type={isVisible ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          style={{
            flex: 1,
            padding: '6px 8px',
            background: '#1a1a1a',
            color: '#eee',
            border: '1px solid #333',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
        <button
          onClick={() => setIsVisible(!isVisible)}
          style={{
            padding: '6px 8px',
            background: '#2a2a2a',
            color: '#888',
            border: '1px solid #333',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>
      {apiKey && (
        <span style={{ fontSize: 10, color: '#4a4' }}>Key set</span>
      )}
    </div>
  )
}
