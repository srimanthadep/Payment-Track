# 💰 Payment-Track

<div align="center">

![GitHub](https://img.shields.io/github/license/srimanthadep/Payment-Track)
![GitHub issues](https://img.shields.io/github/issues/srimanthadep/Payment-Track)
![GitHub stars](https://img.shields.io/github/stars/srimanthadep/Payment-Track)
![GitHub forks](https://img.shields.io/github/forks/srimanthadep/Payment-Track)

**A modern, full-featured payment transaction tracking system**

[Features](#-features) • [Demo](#-demo) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Demo](#-demo)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Deployment](#-deployment)
- [Docker Support](#-docker-support)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

## 🎯 About

Payment-Track is a comprehensive payment transaction tracking system built with modern web technologies. It provides a seamless experience for tracking transactions, managing portals, calculating profits, and generating insightful reports. Perfect for businesses and individuals who need to track payment flows across multiple payment gateways.

## ✨ Features

### 🔐 Authentication & Authorization
- **Multi-factor Authentication**: Phone OTP and Email/Password
- **Role-based Access Control**: Admin and User roles with different permissions
- **Secure Sessions**: JWT-based authentication via Supabase

### 💳 Transaction Management
- **CRUD Operations**: Create, Read, Update, Delete transactions
- **Bulk Operations**: Import transactions via CSV
- **Advanced Filtering**: Search and filter by date, amount, portal, status
- **Real-time Updates**: Live transaction updates with Supabase subscriptions
- **CSV Export**: Export transactions for analysis

### 📊 Analytics & Reporting
- **Profit Tracking**: Daily, Weekly, and Monthly profit calculations
- **Visual Charts**: Interactive charts with Recharts
- **Portal Comparison**: Compare performance across different payment portals
- **Admin Dashboard**: Comprehensive statistics and metrics
- **Commission Calculator**: Automatic commission and fee calculations

### 🏪 Portal Management
- **Multi-portal Support**: Track transactions across multiple payment gateways
- **Portal Configuration**: Set commission rates and fees per portal
- **Active/Inactive Toggle**: Enable or disable portals as needed

### 🔍 Web Scraping
- **Automated Scraping**: Configure rules to scrape transaction data from websites
- **Pattern Matching**: Flexible regex-based extraction
- **Error Handling**: Robust error handling and logging

### 🎨 User Interface
- **Responsive Design**: Mobile-first approach, works on all devices
- **Dark Mode**: Built-in dark mode support
- **Modern UI**: Beautiful components from shadcn/ui
- **Pull-to-Refresh**: Mobile-friendly pull-to-refresh functionality
- **Smooth Animations**: Framer Motion animations

### 👨‍💼 Admin Features
- **User Management**: View and manage all users
- **Role Assignment**: Promote users to admin
- **Transaction Oversight**: View all transactions across users
- **Platform Statistics**: Total users, revenue, profit metrics

## 🎬 Demo

**Live Demo**: [View Payment Tracker](https://payment-track.vercel.app)

## 📸 Screenshots

_Coming soon - Add your application screenshots here_

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Routing**: React Router v6
- **State Management**: React Query (@tanstack/react-query)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation

### Backend
- **BaaS**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL with Row Level Security
- **Edge Functions**: Deno-based serverless functions
- **Real-time**: Supabase Realtime subscriptions

### DevOps
- **CI/CD**: GitHub Actions
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (for production)
- **Code Quality**: ESLint, TypeScript

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or bun
- A Supabase account ([sign up free](https://supabase.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/srimanthadep/Payment-Track.git
   cd Payment-Track
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Supabase credentials:
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

## ⚙️ Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Required variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key

### Database Setup

1. Create tables in your Supabase project
2. Enable Row Level Security (RLS) on all tables
3. Set up appropriate RLS policies
4. Run any necessary migrations

See [BACKEND_ACCESS.md](./BACKEND_ACCESS.md) for detailed backend setup instructions.

### Edge Functions

Deploy Edge Functions to Supabase:

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy scrape-website
supabase functions deploy admin-create-user
```

See [DEPLOY_INSTRUCTIONS.md](./DEPLOY_INSTRUCTIONS.md) for detailed deployment instructions.

## 📖 Usage

### For Users
1. **Sign up/Login**: Use phone OTP or email/password
2. **Add Transactions**: Click "Add Transaction" to record new transactions
3. **Import Payouts**: Bulk import via CSV
4. **View Analytics**: Track your daily, weekly, and monthly profits
5. **Manage Portals**: Add or configure payment portals
6. **Export Data**: Export transactions as CSV for analysis

### For Admins
1. **Access Admin Panel**: Navigate to /admin
2. **View Statistics**: See total users, transactions, revenue, and profit
3. **Manage Users**: View all users and assign admin roles
4. **Oversee Transactions**: View and manage all transactions
5. **Configure Portals**: Manage platform-wide portal settings

## 🌐 Deployment

### Deploy with Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/srimanthadep/Payment-Track)

### Deploy with Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/srimanthadep/Payment-Track)

### Manual Deployment

```bash
# Build the application
npm run build

# The dist/ folder contains the production build
# Deploy the contents to your hosting provider
```

## 🐳 Docker Support

### Using Docker Compose (Recommended)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access the application at `http://localhost:3000`

### Using Docker

```bash
# Build image
docker build -t payment-track .

# Run container
docker run -p 3000:80 payment-track
```

## 📚 API Documentation

API documentation is auto-generated by Supabase. Access it at:
- **REST API**: `https://YOUR_PROJECT_REF.supabase.co/rest/v1/`
- **API Docs**: In your Supabase Dashboard → Project Settings → API

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing.

## 📝 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Project Structure

```
Payment-Track/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom hooks
│   ├── utils/          # Utility functions
│   ├── integrations/   # Third-party integrations
│   └── lib/           # Library code
├── supabase/
│   └── functions/      # Edge Functions
├── public/            # Static assets
└── ...config files
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔒 Security

See [SECURITY.md](./SECURITY.md) for security policies and vulnerability reporting.

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/srimanthadep/Payment-Track/issues)
- **Discussions**: [GitHub Discussions](https://github.com/srimanthadep/Payment-Track/discussions)
- **Documentation**: [Project Wiki](https://github.com/srimanthadep/Payment-Track/wiki)

## 🗺️ Roadmap

See [IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md) for planned features and improvements.

## 📊 Project Status

![GitHub last commit](https://img.shields.io/github/last-commit/srimanthadep/Payment-Track)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/srimanthadep/Payment-Track)

## 🙏 Acknowledgments

- UI Components from [shadcn/ui](https://ui.shadcn.com)
- Backend powered by [Supabase](https://supabase.com)
- Icons from [Lucide](https://lucide.dev)

## 📞 Contact

For questions or feedback, please open an issue or reach out to the maintainers.

---

<div align="center">
Made with ❤️ by the Payment-Track team

⭐ Star us on GitHub — it helps!
</div>
