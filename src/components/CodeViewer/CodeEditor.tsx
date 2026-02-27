import { useRef, useCallback, useEffect } from 'react'

interface CodeEditorProps {
  code: string
  onChange: (code: string) => void
  debounceMs?: number
}

export function CodeEditor({ code, onChange, debounceMs = 500 }: CodeEditorProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange(value)
      }, debounceMs)
    },
    [onChange, debounceMs]
  )

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Handle Tab key for indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value
      textarea.value = value.substring(0, start) + '  ' + value.substring(end)
      textarea.selectionStart = textarea.selectionEnd = start + 2
    }
  }, [])

  return (
    <textarea
      ref={textareaRef}
      defaultValue={code}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      spellCheck={false}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 200,
        padding: 8,
        fontSize: 11,
        lineHeight: 1.5,
        fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
        color: '#abb2bf',
        background: '#1a1a1a',
        border: 'none',
        outline: 'none',
        resize: 'none',
        whiteSpace: 'pre',
        tabSize: 2,
        boxSizing: 'border-box',
      }}
    />
  )
}
