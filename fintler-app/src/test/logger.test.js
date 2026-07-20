import { describe, it, expect, vi, beforeEach } from 'vitest'
import logger from '../lib/logger'

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('logs error in any env', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('err')
    expect(spy).toHaveBeenCalled()
  })

  it('logs warn in any env', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logger.warn('warn')
    expect(spy).toHaveBeenCalled()
  })

  it('debug is a function', () => {
    expect(typeof logger.debug).toBe('function')
  })

  it('info is a function', () => {
    expect(typeof logger.info).toBe('function')
  })
})
