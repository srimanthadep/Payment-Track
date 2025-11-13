# Testing Guide

This guide explains how to write and run tests for Payment-Track.

## Table of Contents

- [Overview](#overview)
- [Test Setup](#test-setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

Payment-Track uses the following testing tools:

- **Vitest** - Fast unit test framework
- **React Testing Library** - React component testing utilities
- **jsdom** - Browser environment simulation

## Test Setup

Tests are configured in `vitest.config.ts` and the setup file is at `src/test/setup.ts`.

### Installation

Testing dependencies are already included in `package.json`. Install them with:

```bash
npm install
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test src/test/format.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --grep "formatCurrency"
```

## Writing Tests

### Test File Structure

Test files should be placed in `src/test/` and follow the naming convention:
- `ComponentName.test.tsx` for component tests
- `utilityName.test.ts` for utility function tests

### Basic Test Template

```typescript
import { describe, it, expect } from 'vitest'

describe('Feature Name', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test'
    
    // Act
    const result = someFunction(input)
    
    // Assert
    expect(result).toBe('expected')
  })
})
```

### Component Testing

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    render(<MyComponent onClick={handleClick} />)
    
    const button = screen.getByRole('button')
    await userEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Testing Async Code

```typescript
import { describe, it, expect, vi } from 'vitest'
import { waitFor } from '@testing-library/react'

describe('Async Operations', () => {
  it('fetches data successfully', async () => {
    const mockData = { id: 1, name: 'Test' }
    
    // Mock API call
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockData),
      })
    ) as any

    const result = await fetchData()
    
    expect(result).toEqual(mockData)
  })
})
```

### Mocking Supabase

```typescript
import { vi } from 'vitest'

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      })),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))
```

### Testing React Router

```typescript
import { BrowserRouter } from 'react-router-dom'

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Navigation', () => {
  it('navigates to correct route', () => {
    renderWithRouter(<App />)
    // Test navigation
  })
})
```

## Best Practices

### 1. Follow AAA Pattern
```typescript
it('should calculate commission', () => {
  // Arrange - Set up test data
  const amount = 1000
  const cardType = 'normal_upi'
  
  // Act - Execute the code
  const result = calculateCommission(amount, cardType, 'withdrawal')
  
  // Assert - Verify the result
  expect(result).toBe(20)
})
```

### 2. Use Descriptive Test Names

❌ Bad:
```typescript
it('works', () => { ... })
```

✅ Good:
```typescript
it('calculates withdrawal commission for normal UPI correctly', () => { ... })
```

### 3. Test One Thing at a Time

❌ Bad:
```typescript
it('does everything', () => {
  expect(fn1()).toBe(true)
  expect(fn2()).toBe(false)
  expect(fn3()).toBe(null)
})
```

✅ Good:
```typescript
it('returns true when condition is met', () => {
  expect(fn1()).toBe(true)
})

it('returns false when condition is not met', () => {
  expect(fn2()).toBe(false)
})
```

### 4. Clean Up After Tests

```typescript
import { afterEach, vi } from 'vitest'

afterEach(() => {
  vi.clearAllMocks()
  cleanup() // From @testing-library/react
})
```

### 5. Use Test Data Builders

```typescript
const createMockTransaction = (overrides = {}) => ({
  id: '123',
  amount: 1000,
  commission: 20,
  status: 'completed',
  ...overrides,
})

it('processes transaction', () => {
  const transaction = createMockTransaction({ amount: 2000 })
  // Use transaction in test
})
```

### 6. Test Edge Cases

```typescript
describe('formatCurrency', () => {
  it('handles positive numbers', () => {
    expect(formatCurrency(1000)).toBe('₹1,000.00')
  })
  
  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('₹0.00')
  })
  
  it('handles negative numbers', () => {
    expect(formatCurrency(-500)).toBe('-₹500.00')
  })
  
  it('handles very large numbers', () => {
    expect(formatCurrency(999999999)).toBeDefined()
  })
})
```

## Examples

### Testing Utility Functions

```typescript
// src/test/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/utils/format'

describe('formatCurrency', () => {
  it('formats Indian currency correctly', () => {
    expect(formatCurrency(1000)).toBe('₹1,000.00')
  })
})
```

### Testing React Components

```typescript
// src/test/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick handler', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await userEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDisabled()
  })
})
```

### Testing Custom Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useMyHook } from '@/hooks/useMyHook'

describe('useMyHook', () => {
  it('returns initial value', () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current.value).toBe(null)
  })

  it('updates value', async () => {
    const { result } = renderHook(() => useMyHook())
    
    act(() => {
      result.current.setValue('new value')
    })

    await waitFor(() => {
      expect(result.current.value).toBe('new value')
    })
  })
})
```

### Testing Forms

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/LoginForm'

describe('LoginForm', () => {
  it('submits form with valid data', async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('shows validation errors', async () => {
    render(<LoginForm onSubmit={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })
})
```

## Coverage Reports

After running `npm run test:coverage`, view the HTML report:

```bash
# The report is generated in coverage/index.html
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

Coverage goals:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Troubleshooting

### Tests Fail with "Cannot find module"

Make sure path aliases are configured in `vitest.config.ts`:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Tests Fail with "window is not defined"

Add to `src/test/setup.ts`:

```typescript
global.window = {} as any
```

### Supabase Client Errors

Mock the Supabase client in your tests:

```typescript
vi.mock('@/integrations/supabase/client')
```

### Style Issues in Tests

If you encounter CSS-related errors, ensure `css: true` is set in `vitest.config.ts`.

### Timeout Errors

Increase test timeout:

```typescript
it('long running test', async () => {
  // test code
}, 10000) // 10 second timeout
```

Or in config:

```typescript
test: {
  testTimeout: 10000,
}
```

## CI Integration

Tests run automatically in GitHub Actions. See `.github/workflows/ci.yml`.

To run tests locally before pushing:

```bash
npm run lint
npm test
npm run build
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new features:

1. Write tests for new code
2. Ensure all tests pass
3. Maintain or improve code coverage
4. Update this guide if needed

Happy Testing! 🧪
