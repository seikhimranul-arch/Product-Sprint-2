import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SparklineChart from '../components/SparklineChart'

describe('SparklineChart', () => {
  it('renders with data', () => {
    const { container } = render(<SparklineChart data={[10, 20, 15]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has accessible label with data', () => {
    render(<SparklineChart data={[10, 20, 15]} />)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Spending trend chart')
  })

  it('renders a flat line for empty data', () => {
    const { container } = render(<SparklineChart data={[]} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-label', 'Flat spending trend chart')
  })

  it('renders a flat line for null data', () => {
    const { container } = render(<SparklineChart data={null} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-label', 'Flat spending trend chart')
  })

  it('renders with single data point', () => {
    const { container } = render(<SparklineChart data={[42]} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-label', 'Flat spending trend chart')
  })
})
