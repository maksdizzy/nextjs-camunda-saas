#!/bin/bash

# Workflow UI Installation Script
# This script automates the setup of the Guru Framework BPMN workflow UI

set -e

echo "🚀 Installing Workflow UI for Guru Framework BPMN Engine"
echo "========================================================="
echo ""

# Step 1: Install dependencies
echo "📦 Step 1/3: Installing dependencies..."
npm install @tanstack/react-query date-fns
echo "✅ Dependencies installed"
echo ""

# Step 2: Configure environment
echo "⚙️  Step 2/3: Configuring environment..."
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    cat > .env.local << 'EOF'
# Workflow API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
    echo "✅ Created .env.local with default configuration"
else
    if ! grep -q "NEXT_PUBLIC_API_URL" .env.local; then
        echo "" >> .env.local
        echo "# Workflow API Configuration" >> .env.local
        echo "NEXT_PUBLIC_API_URL=http://localhost:8000" >> .env.local
        echo "✅ Added NEXT_PUBLIC_API_URL to existing .env.local"
    else
        echo "ℹ️  NEXT_PUBLIC_API_URL already exists in .env.local"
    fi
fi
echo ""

# Step 3: Instructions for manual steps
echo "📝 Step 3/3: Manual configuration needed"
echo ""
echo "Please update your dashboard navigation menu:"
echo ""
echo "File: src/app/[locale]/(auth)/dashboard/layout.tsx"
echo ""
echo "Add these menu items to the menu array:"
echo ""
echo "  {"
echo "    href: '/workflows',"
echo "    label: 'Workflows',"
echo "  },"
echo "  {"
echo "    href: '/workflows/tasks',"
echo "    label: 'My Tasks',"
echo "  },"
echo "  {"
echo "    href: '/workflows/instances',"
echo "    label: 'Instances',"
echo "  },"
echo ""
echo "========================================================="
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Update the dashboard navigation (see above)"
echo "2. Start your Next.js dev server: npm run dev"
echo "3. Ensure your FastAPI backend is running at the configured URL"
echo "4. Visit http://localhost:3000/workflows to test"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: WORKFLOW_QUICKSTART.md"
echo "   - Full Setup: WORKFLOW_UI_SETUP.md"
echo "   - Files List: WORKFLOW_FILES_CREATED.md"
echo ""
echo "🎉 Happy workflow building!"
