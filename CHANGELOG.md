# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CONTRIBUTING.md with comprehensive contribution guidelines
- CODE_OF_CONDUCT.md to establish community standards
- LICENSE (MIT) to define usage rights
- SECURITY.md with security policy and vulnerability reporting process
- .env.example with comprehensive environment variable documentation
- CHANGELOG.md to track version history
- GitHub issue templates for bugs and feature requests
- Pull request template
- GitHub Actions CI/CD workflow
- Docker support with multi-stage build
- Enhanced README.md with badges and better documentation

### Fixed
- TypeScript `any` type issues in multiple components
- React hooks exhaustive dependencies warnings
- ESLint warnings and errors

### Changed
- Improved documentation structure
- Enhanced development setup instructions

## [0.1.0] - 2024-11-13

### Added
- Admin Statistics Dashboard component
- Enhanced Admin Panel with Overview tab
- Improved scrape-website Edge Function with better error handling
- Transaction edit functionality
- CSV export feature
- Pull-to-refresh functionality
- Portal comparison charts
- Real-time data updates

### Features
- User authentication (Phone OTP and Email/Password)
- Role-based access control (Admin/User)
- Transaction management (CRUD operations)
- Portal management
- Web scraping configuration
- Profit tracking (Daily/Weekly/Monthly)
- Responsive design with mobile support
- Dark mode support

### Backend
- Supabase PostgreSQL database
- Supabase Edge Functions
- Row Level Security (RLS) policies
- Real-time subscriptions

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- shadcn/ui component library
- React Router for navigation
- React Query for data fetching
- Recharts for data visualization

---

## Version History Format

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security fixes and improvements

---

[Unreleased]: https://github.com/srimanthadep/Payment-Track/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/srimanthadep/Payment-Track/releases/tag/v0.1.0
