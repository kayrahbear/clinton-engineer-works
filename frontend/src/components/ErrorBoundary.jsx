import { Component } from 'react'
import ErrorState from './ErrorState'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Frontend error boundary caught an error', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto w-full max-w-6xl px-6 py-10">
          <ErrorState
            title="We hit a snag"
            message={this.state.error?.message}
            onRetry={this.handleRetry}
          />
        </div>
      )
    }

    return this.props.children
  }
}