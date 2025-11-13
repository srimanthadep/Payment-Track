# Contributing to Payment-Track

First off, thank you for considering contributing to Payment-Track! It's people like you that make Payment-Track such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if relevant**
- **Note your environment** (OS, browser, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Your First Code Contribution

Unsure where to begin? You can start by looking through these issues:

- Issues labeled `good first issue` - should only require a few lines of code
- Issues labeled `help wanted` - more involved than `good first issue`

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or bun
- A Supabase account and project

### Setup Steps

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Payment-Track.git
   cd Payment-Track
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173`

### Database Setup

1. Go to your Supabase project dashboard
2. Run the migrations in `supabase/migrations` (if any)
3. Set up the required tables as per the schema

### Edge Functions Setup

If you're working on Edge Functions:

1. Install Supabase CLI:
   ```bash
   # Windows (Scoop)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   
   # macOS (Homebrew)
   brew install supabase/tap/supabase
   ```

2. Link your project:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Deploy functions:
   ```bash
   supabase functions deploy FUNCTION_NAME
   ```

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run lint
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template with:
     - Clear description of changes
     - Related issue number (if applicable)
     - Screenshots (if UI changes)
     - Testing steps

7. **Wait for review**
   - Address any feedback from maintainers
   - Make requested changes
   - Once approved, your PR will be merged!

## Coding Standards

### TypeScript/React

- Use TypeScript for type safety
- Avoid using `any` type - use proper types instead
- Use functional components with hooks
- Follow React best practices
- Use meaningful variable and function names

### File Structure

```
src/
├── components/      # Reusable UI components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── integrations/   # Third-party integrations
└── lib/           # Library code
```

### Component Guidelines

- One component per file
- Use named exports
- Props should be typed with interfaces
- Extract complex logic into custom hooks
- Keep components focused and small

### Styling

- Use Tailwind CSS utility classes
- Follow the existing design system
- Use shadcn/ui components when possible
- Ensure responsive design (mobile-first)

### State Management

- Use React hooks (useState, useEffect, etc.)
- Use React Query for server state
- Keep state as local as possible
- Lift state only when necessary

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(transactions): add bulk delete functionality

- Add checkbox selection to transactions table
- Add bulk delete button
- Implement confirmation dialog
- Update API calls to handle multiple IDs

Closes #123
```

```
fix(auth): resolve login redirect loop

The auth state was not being cleared properly on logout,
causing users to be redirected back to the login page
repeatedly.

Fixes #456
```

## Testing

- Write tests for new features
- Ensure existing tests pass
- Test in multiple browsers if making UI changes
- Test responsive behavior on different screen sizes

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments for complex functions
- Update API documentation if you add/change endpoints
- Keep comments up-to-date with code changes

## Questions?

If you have questions, feel free to:
- Open an issue with the `question` label
- Reach out to the maintainers
- Check existing documentation

## Recognition

Contributors will be recognized in our README.md. Thank you for your contributions! 🎉
