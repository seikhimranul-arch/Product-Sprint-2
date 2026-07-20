import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GoalModal from '../components/GoalModal'

describe('GoalModal', () => {
  it('renders with heading', () => {
    render(<GoalModal onClose={() => {}} onSave={() => {}} />)
    expect(screen.getByText('Set weekly goal')).toBeInTheDocument()
  })

  it('calls onSave with the entered value', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<GoalModal onClose={onClose} onSave={onSave} />)
    const input = screen.getByLabelText('Amount in INR')
    await userEvent.clear(input)
    await userEvent.type(input, '25000')
    fireEvent.click(screen.getByText('Save Goal'))
    expect(onSave).toHaveBeenCalledWith(25000)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on cancel', () => {
    const onClose = vi.fn()
    render(<GoalModal onClose={onClose} onSave={() => {}} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('has save button enabled', () => {
    render(<GoalModal onClose={() => {}} onSave={() => {}} />)
    expect(screen.getByText('Save Goal')).toBeEnabled()
  })
})
