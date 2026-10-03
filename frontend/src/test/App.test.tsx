import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import App from '@/App'

describe('App', () => {
  beforeAll(() => {
    window.scrollTo = vi.fn()
  })

  it('renders without crashing', () => {
    render(<App />)
    expect(document.body).toBeDefined()
  })
})
