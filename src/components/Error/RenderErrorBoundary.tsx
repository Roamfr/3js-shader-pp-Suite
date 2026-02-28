import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  /** Change this value to reset the error boundary (e.g. pass a shader key) */
  resetKey?: string | null
}

interface State {
  hasError: boolean
}

/**
 * Catches WebGL / rendering errors thrown during React render and prevents
 * them from crashing the entire Canvas. Resets when resetKey changes.
 */
export class RenderErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  componentDidCatch(error: Error) {
    console.warn('[RenderErrorBoundary] caught:', error.message)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }
    return this.props.children
  }
}
