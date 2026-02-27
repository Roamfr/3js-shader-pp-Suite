import { MATERIAL_SYSTEM_PROMPT, POSTPROCESSING_SYSTEM_PROMPT, FIX_SHADER_PROMPT, FIX_JSON_PROMPT } from './shaderPrompts'
import type { ShaderOrEffect } from '../types/shader'

const API_URL = '/api/claude/v1/messages'

interface StreamCallbacks {
  onToken?: (token: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: string) => void
}

export async function generateShader(
  prompt: string,
  mode: 'material' | 'postprocessing',
  apiKey: string,
  callbacks?: StreamCallbacks
): Promise<ShaderOrEffect> {
  const systemPrompt = mode === 'material' ? MATERIAL_SYSTEM_PROMPT : POSTPROCESSING_SYSTEM_PROMPT
  return callClaude(prompt, systemPrompt, apiKey, callbacks)
}

export async function fixShaderWithError(
  originalPrompt: string,
  error: string,
  mode: 'material' | 'postprocessing',
  apiKey: string,
  callbacks?: StreamCallbacks
): Promise<ShaderOrEffect> {
  const systemPrompt = mode === 'material' ? MATERIAL_SYSTEM_PROMPT : POSTPROCESSING_SYSTEM_PROMPT
  const fixPrompt = `Original request: ${originalPrompt}\n\n${FIX_SHADER_PROMPT(error)}`
  return callClaude(fixPrompt, systemPrompt, apiKey, callbacks)
}

export async function fixJSONFormat(
  originalPrompt: string,
  rawResponse: string,
  mode: 'material' | 'postprocessing',
  apiKey: string,
  callbacks?: StreamCallbacks
): Promise<ShaderOrEffect> {
  const systemPrompt = mode === 'material' ? MATERIAL_SYSTEM_PROMPT : POSTPROCESSING_SYSTEM_PROMPT
  const fixPrompt = `Original request: ${originalPrompt}\n\nYour previous response:\n${rawResponse}\n\n${FIX_JSON_PROMPT}`
  return callClaude(fixPrompt, systemPrompt, apiKey, callbacks)
}

async function callClaude(
  userMessage: string,
  systemPrompt: string,
  apiKey: string,
  callbacks?: StreamCallbacks
): Promise<ShaderOrEffect> {
  const model = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-6'

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      stream: true,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error (${response.status}): ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const event = JSON.parse(data)
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text
            callbacks?.onToken?.(event.delta.text)
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }
  }

  callbacks?.onComplete?.(fullText)

  // Parse the JSON response
  // Try to extract JSON from the response (handle markdown fences if present)
  let jsonStr = fullText.trim()
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  const parsed = JSON.parse(jsonStr) as ShaderOrEffect
  return parsed
}
