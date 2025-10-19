# Next.js SaaS with Guru Framework (Camunda) Workflow Integration

🚀 **Production-ready SaaS boilerplate** with integrated BPMN workflow engine for building business process automation platforms.

Built on top of the popular [Next.js SaaS Boilerplate](https://github.com/ixartz/SaaS-Boilerplate) with **Guru Framework (Camunda BPM Platform 7)** integration for enterprise-grade workflow automation.

## 🎯 What Makes This Different

This isn't just another SaaS template - it's a **complete workflow automation platform** that combines:

- ✅ **Modern SaaS Foundation**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- ✅ **Enterprise Workflow Engine**: Camunda BPM Platform 7 (Guru Framework)
- ✅ **Complete Authentication Stack**: Clerk JWT → FastAPI Proxy → Engine JWT
- ✅ **17 Pre-deployed BPMN Workflows**: Ready to use or customize
- ✅ **Visual Workflow Management**: Complete UI for process orchestration
- ✅ **Docker Orchestration**: One command to run the entire stack

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                         │
│              (React Query + Clerk Auth)                      │
│                   Port: 3001                                 │
└────────────────────────┬────────────────────────────────────┘
                         │ Clerk JWT
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Proxy                              │
│         (JWT Transformation Layer)                           │
│                   Port: 8000                                 │
└────────────────────────┬────────────────────────────────────┘
                         │ Engine JWT
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Guru Engine (Camunda BPM)                       │
│         (17 BPMN Workflows + REST API)                       │
│                   Port: 8081                                 │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Python Workers                              │
│           (External Task Handlers)                           │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

### SaaS Foundation
- ⚡ **Next.js 14** with App Router and React Server Components
- 🔥 **TypeScript** for type safety
- 💎 **Tailwind CSS** + **shadcn/ui** for modern UI
- 🔒 **Clerk Authentication** with JWT, social login, MFA
- 👥 **Multi-tenancy** with team support
- 📝 **Role-based access control** (RBAC)
- 🌐 **Internationalization** (i18n) with next-intl
- 📦 **DrizzleORM** for type-safe database operations
- 🧪 **Testing**: Vitest (unit) + Playwright (E2E)
- 🚨 **Error Monitoring**: Sentry integration
- 🎨 **Code Quality**: ESLint, Prettier, Husky, lint-staged

### Workflow Engine Integration
- 🔄 **Camunda BPM Platform 7** (Guru Framework)
- 📊 **17 Pre-deployed BPMN Workflows**:
  - User management (sign up, invite friends)
  - Admin operations (wallet transfers, community reports)
  - Application support (chatbot, agent controls)
  - Token operations (swap, transfer, top-up)
  - And more...
- 🎯 **Complete Workflow UI**:
  - Browse process definitions
  - Start process instances with forms
  - Task management (claim, complete, unclaim)
  - Process instance monitoring
  - Activity history and statistics
- 🔌 **Python Worker Framework** for external task handling
- 🐳 **Docker Compose** orchestration for the entire stack

### FastAPI Proxy Layer
- 🔐 **JWT Authentication Bridge**: Clerk JWT → Engine JWT
- 🛡️ **Security**: Automatic token transformation and validation
- 🌍 **CORS Configuration** for Next.js integration
- 📝 **Comprehensive Logging** with request tracking
- ⚡ **High Performance**: Async operations with httpx

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/maksdizzy/nextjs-camunda-saas.git
cd nextjs-camunda-saas
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
# Copy example files
cp .env.example .env.local
cp .env.guru.example .env.guru

# Edit .env.local with your Clerk credentials
# Edit .env.guru with your configuration
```

4. **Start the Guru stack** (Engine + Proxy + Workers):
```bash
docker-compose -f docker-compose.guru.yaml --env-file .env.guru up -d
```

5. **Start the Next.js frontend**:
```bash
npm run dev
# Or specify port explicitly:
# PORT=3001 npm run dev
```

6. **Access the applications**:
- Frontend: http://localhost:3000 (default) or http://localhost:3001
- Workflows UI: http://localhost:3000/workflows (or :3001)
- Camunda Cockpit: http://localhost:8081/camunda (demo/demo)
- FastAPI Proxy: http://localhost:8000
- Engine REST API: http://localhost:8081/engine-rest

## 📚 Documentation

### Setup Guides
- [Authentication Setup](claudedocs/JWT_AUTH_FIX.md) - Complete JWT authentication troubleshooting
- [Testing Guide](claudedocs/TESTING_SUMMARY.md) - Comprehensive testing and validation
- [Environment Configuration](claudedocs/) - Detailed environment setup

### Key Configuration Files
- `.env.guru.example` - Guru stack configuration template
- `.env.example.workflow` - Workflow UI configuration template
- `docker-compose.guru.yaml` - Complete stack orchestration
- `install-workflow-ui.sh` - Automated workflow UI setup

## 🔧 Configuration

### Clerk Authentication

1. Create a Clerk account at [Clerk.com](https://go.clerk.com/zGlzydF)
2. Create a new application
3. Enable Organizations in settings
4. Copy your keys to `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Guru Framework Setup

The Guru stack requires matching JWT secrets between the proxy and engine:

```bash
# .env.guru
ENGINE_JWT_SECRET=Ym9ZpC1VyZUU9svrmtrJGXZlAlMx5dW29qQwXUDYp50=
ENGINE_JWT_ALGORITHM=HS256
CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json
```

## 🏭 Available Workflows

The Guru Framework comes with 17 pre-deployed BPMN workflows:

1. **User Management**:
   - `user_sign_up` - User registration workflow
   - `invite_friends` - Friend invitation system

2. **Admin Operations**:
   - `admin_transferWallet` - Wallet transfer management
   - `admin_sendTokensToWallet` - Token distribution
   - `admin_communityReport` - Community moderation

3. **Application Support**:
   - `app_support` - Support ticket handling
   - `chatbot_thread` - Chatbot conversation management
   - `agent_chatReply` - AI agent responses
   - `agent_controls` - Agent orchestration

4. **Token Operations**:
   - `swap_tokens` - Token swap workflow
   - `native_transfer_from_wallet` - Native token transfers
   - `top_up_wallet` - Wallet top-up process

5. **Advanced Workflows**:
   - `chainflow-engine` - Multi-chain workflow orchestration
   - And 4 additional admin processes

## 🐳 Docker Services

The stack includes three main services:

```yaml
services:
  engine:    # Camunda BPM Engine (Port 8081)
  proxy:     # FastAPI Authentication Proxy (Port 8000)
  workers:   # Python External Task Workers
```

### Service Management

```bash
# Start all services
docker-compose -f docker-compose.guru.yaml --env-file .env.guru up -d

# View logs
docker-compose -f docker-compose.guru.yaml --env-file .env.guru logs -f

# Stop services
docker-compose -f docker-compose.guru.yaml --env-file .env.guru down

# Stop and rebuild services (recommended after code changes)
docker-compose -f docker-compose.guru.yaml --env-file .env.guru down && \
docker-compose -f docker-compose.guru.yaml --env-file .env.guru up -d

# Rebuild without stopping first
docker-compose -f docker-compose.guru.yaml --env-file .env.guru up -d --build
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration & E2E Tests
```bash
npx playwright install
npm run test:e2e
```

### Workflow Testing
Access the Camunda Cockpit to test workflows visually:
- URL: http://localhost:8081/camunda
- Credentials: demo/demo

## 📖 Development Workflow

1. **Start Docker services**: `docker-compose -f docker-compose.guru.yaml --env-file .env.guru up -d`
2. **Start Next.js dev server**: `npm run dev` (port 3000) or `PORT=3001 npm run dev`
3. **Access workflow UI**: http://localhost:3000/workflows (or :3001)
4. **View Camunda Cockpit**: http://localhost:8081/camunda
5. **Check proxy health**: http://localhost:8000/health

## 🔒 Security

This project includes comprehensive security measures:

- ✅ JWT authentication with automatic token transformation
- ✅ CORS configuration for cross-origin requests
- ✅ Environment variable validation
- ✅ Secure credential management (no .env files in git)
- ✅ Docker network isolation
- ✅ Input validation with Zod

**Important**: Always rotate Clerk API keys before deploying to production.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using conventional commits (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

Licensed under the MIT License, Copyright © 2024

See [LICENSE](LICENSE) for more information.

## 🙏 Acknowledgments

Built on top of:
- [Next.js SaaS Boilerplate](https://github.com/ixartz/SaaS-Boilerplate) by CreativeDesignsGuru
- [Camunda BPM Platform 7](https://camunda.com/)
- [Clerk](https://clerk.com/) for authentication
- [FastAPI](https://fastapi.tiangolo.com/) for the proxy layer

## 📧 Support

For questions, issues, or feature requests:
- Open an issue on [GitHub](https://github.com/maksdizzy/nextjs-camunda-saas/issues)
- Check the [documentation](claudedocs/)

## 🗺️ Roadmap

- [ ] PostgreSQL database integration for production
- [ ] Additional BPMN workflow templates
- [ ] Enhanced monitoring and analytics
- [ ] Workflow designer UI integration
- [ ] Multi-language workflow support
- [ ] Advanced error handling and recovery

---

Made with ♥ for the workflow automation community

**Star this repo** if you find it useful! ⭐
