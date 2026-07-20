import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

const Bomb = ({ shouldThrow = false }) => {
  if (shouldThrow) throw new Error('💥')
  return <div>Working</div>
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(screen.getByText('Working')).toBeInTheDocument()
  })

  it('renders fallback on error', () => {
    render(<ErrorBoundary><Bomb shouldThrow={true} /></ErrorBoundary>)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('reloads page on button click', () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', { value: { reload }, writable: true })
    render(<ErrorBoundary><Bomb shouldThrow={true} /></ErrorBoundary>)
    fireEvent.click(screen.getByText('Refresh App'))
    expect(reload).toHaveBeenCalled()
  })
})
