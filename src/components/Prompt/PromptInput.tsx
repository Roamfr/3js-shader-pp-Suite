import { useState, useCallback, useRef } from 'react'
import { useUIStore } from '../../store/uiStore'
import { useGalleryStore } from '../../store/galleryStore'
import { generateShader, fixShaderWithError } from '../../lib/claude'
import { ShaderTypeSelector } from './ShaderTypeSelector'
import { ShaderError } from '../Error/ShaderError'
import type { ShaderConfig, PostEffectConfig } from '../../types/shader'

const MAX_RETRIES = 3

export function PromptInput() {
  const [prompt, setPrompt] = useState('')
  const [streamText, setStreamText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPrompt, setLastPrompt] = useState('')
  const retryCount = useRef(0)

  const apiKey = useUIStore((s) => s.apiKey)
  const shaderMode = useUIStore((s) => s.shaderMode)
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const setShader = useGalleryStore((s) => s.setShader)
  const setPostEffect = useGalleryStore((s) => s.setPostEffect)
  const setTileError = useGalleryStore((s) => s.setTileError)
  const setTileGenerating = useGalleryStore((s) => s.setTileGenerating)
  const tiles = useGalleryStore((s) => s.tiles)

  const applyResult = useCallback(
    (result: ShaderConfig | PostEffectConfig) => {
      const tileId = selectedTileId ?? tiles[0]?.id
      if (!tileId) return

      if (result.type === 'material') {
        setShader(tileId, result as ShaderConfig)
      } else {
        setPostEffect(tileId, [result as PostEffectConfig])
      }
      setTileError(tileId, null)
    },
    [selectedTileId, tiles, setShader, setPostEffect, setTileError]
  )

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return
    if (!apiKey) {
      setError('Please set your Anthropic API key in settings')
      return
    }

    const tileId = selectedTileId ?? tiles[0]?.id
    if (!tileId) return

    setIsGenerating(true)
    setStreamText('')
    setError(null)
    setLastPrompt(prompt)
    retryCount.current = 0
    setTileGenerating(tileId, true)

    try {
      const result = await generateShader(prompt, shaderMode, apiKey, {
        onToken: (token) => setStreamText((prev) => prev + token),
      })
      applyResult(result)
      setStreamText('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      setTileError(tileId, errorMsg)
    } finally {
      setIsGenerating(false)
      setTileGenerating(tileId, false)
    }
  }, [prompt, isGenerating, apiKey, shaderMode, selectedTileId, tiles, applyResult, setTileGenerating, setTileError])

  const handleFix = useCallback(async () => {
    if (!error || !lastPrompt || retryCount.current >= MAX_RETRIES) return
    if (!apiKey) return

    const tileId = selectedTileId ?? tiles[0]?.id
    if (!tileId) return

    retryCount.current++
    setIsGenerating(true)
    setStreamText('')
    setTileGenerating(tileId, true)

    try {
      const result = await fixShaderWithError(lastPrompt, error, shaderMode, apiKey, {
        onToken: (token) => setStreamText((prev) => prev + token),
      })
      applyResult(result)
      setError(null)
      setStreamText('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      setTileError(tileId, errorMsg)
    } finally {
      setIsGenerating(false)
      setTileGenerating(tileId, false)
    }
  }, [error, lastPrompt, apiKey, shaderMode, selectedTileId, tiles, applyResult, setTileGenerating, setTileError])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }

  const targetTile = tiles.find((t) => t.id === selectedTileId) ?? tiles[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ShaderTypeSelector />

      <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>
        Target: <span style={{ color: '#aaa' }}>{targetTile?.label ?? 'No tile'}</span>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          shaderMode === 'material'
            ? 'Describe a material shader... (e.g., "holographic with scanlines and rainbow fresnel")'
            : 'Describe a post-processing effect... (e.g., "chromatic aberration with radial offset")'
        }
        style={{
          width: '100%',
          minHeight: 80,
          padding: 10,
          background: '#1a1a1a',
          color: '#eee',
          border: '1px solid #333',
          borderRadius: 6,
          resize: 'vertical',
          fontFamily: 'inherit',
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={isGenerating || !prompt.trim()}
        style={{
          padding: '8px 16px',
          background: isGenerating ? '#333' : '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: isGenerating ? 'default' : 'pointer',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {isGenerating ? 'Generating...' : 'Generate Shader ⏎'}
      </button>

      {streamText && (
        <pre
          style={{
            background: '#111',
            border: '1px solid #333',
            borderRadius: 6,
            padding: 10,
            fontSize: 11,
            fontFamily: 'monospace',
            color: '#8b8',
            maxHeight: 120,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            margin: 0,
          }}
        >
          {streamText}
        </pre>
      )}

      {error && (
        <ShaderError
          error={error}
          onFixRequest={handleFix}
          isFixing={isGenerating}
        />
      )}
    </div>
  )
}
