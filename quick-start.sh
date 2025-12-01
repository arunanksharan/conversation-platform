#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  Healthcare Conversation Platform              ║"
echo "║  Quick Start Script                            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js >= 18: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be >= 18 (current: $(node -v))"
    exit 1
fi
print_success "Node.js $(node -v)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm is not installed, installing..."
    npm install -g pnpm
fi
print_success "pnpm $(pnpm -v)"

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed"
    echo "Please install Python >= 3.11: https://www.python.org"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 11 ]); then
    print_error "Python version must be >= 3.11 (current: $PYTHON_VERSION)"
    exit 1
fi
print_success "Python $PYTHON_VERSION"

# Check Poetry
if ! command -v poetry &> /dev/null; then
    print_warning "Poetry is not installed, installing..."
    curl -sSL https://install.python-poetry.org | python3 -
    export PATH="$HOME/.local/bin:$PATH"
fi
print_success "Poetry $(poetry --version | awk '{print $3}')"

# Check MongoDB
if ! command -v mongosh &> /dev/null; then
    print_warning "MongoDB CLI (mongosh) is not installed"
    echo "Checking if MongoDB is running..."
fi

if ! mongosh --eval "db.version()" > /dev/null 2>&1; then
    print_error "MongoDB is not running"
    echo ""
    echo "Please install and start MongoDB:"
    echo "  macOS: brew install mongodb-community && brew services start mongodb-community"
    echo "  Linux: sudo systemctl start mongod"
    echo "  Windows: net start MongoDB"
    echo ""
    read -p "Press Enter when MongoDB is running, or Ctrl+C to exit..."
fi
print_success "MongoDB is running"

echo ""
echo "════════════════════════════════════════════════"
echo "  Installation"
echo "════════════════════════════════════════════════"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Install conversation-core dependencies
echo "📦 Installing conversation-core dependencies..."
cd packages/conversation-core
if [ ! -f ".env" ]; then
    print_warning ".env file not found, creating from template..."
    cat > .env << EOF
# MongoDB
MONGODB_URI=mongodb://localhost:27017/conversation-platform
MONGODB_DB_NAME=conversation-platform

# JWT
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d

# LiveKit (optional for voice)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Python Voice Service
PYTHON_VOICE_SERVICE_URL=http://localhost:8000

# OpenAI
OPENAI_API_KEY=your-openai-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=debug

# HIPAA
ENABLE_AUDIT_LOGGING=true
ENABLE_PHI_DETECTION=true
ENCRYPTION_KEY=$(openssl rand -hex 16)
EOF
    print_info "Please update packages/conversation-core/.env with your API keys"
fi

pnpm install
print_success "conversation-core dependencies installed"

# Install voice-pipeline dependencies
cd "$SCRIPT_DIR"
echo ""
echo "📦 Installing voice-pipeline dependencies..."
cd packages/voice-pipeline

if [ ! -d "venv" ]; then
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

if [ ! -f ".env" ]; then
    print_warning ".env file not found, creating from template..."
    cat > .env << EOF
# LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# OpenAI
OPENAI_API_KEY=your-openai-key-here

# Google Cloud (optional)
# GOOGLE_CLOUD_CREDENTIALS_PATH=/path/to/credentials.json
# GOOGLE_CLOUD_PROJECT_ID=your-project-id

# NestJS Service
NESTJS_SERVICE_URL=http://localhost:3001

# Server
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=INFO

# Voice Processing
STT_PROVIDER=whisper
TTS_PROVIDER=google
USE_WHISPER_STT=true
EOF
    print_info "Please update packages/voice-pipeline/.env with your API keys"
fi

poetry install
print_success "voice-pipeline dependencies installed"

cd "$SCRIPT_DIR"

echo ""
echo "════════════════════════════════════════════════"
echo "  Configuration Check"
echo "════════════════════════════════════════════════"
echo ""

# Check if OpenAI key is set
CONV_ENV="$SCRIPT_DIR/packages/conversation-core/.env"
if grep -q "OPENAI_API_KEY=your-openai-key-here" "$CONV_ENV"; then
    print_warning "OpenAI API key not configured in conversation-core/.env"
    read -p "Do you have an OpenAI API key? (y/n): " has_openai
    if [ "$has_openai" = "y" ]; then
        read -p "Enter your OpenAI API key: " openai_key
        sed -i.bak "s/OPENAI_API_KEY=your-openai-key-here/OPENAI_API_KEY=$openai_key/" "$CONV_ENV"
        print_success "OpenAI API key configured"
    else
        print_error "OpenAI API key is required for data extraction"
        print_info "Get one at: https://platform.openai.com/api-keys"
        exit 1
    fi
fi

echo ""
echo "════════════════════════════════════════════════"
echo "  Ready to Start!"
echo "════════════════════════════════════════════════"
echo ""

echo "You can start the services with:"
echo ""
echo "  ${GREEN}Terminal 1:${NC} Start conversation-core (NestJS)"
echo "    cd packages/conversation-core"
echo "    pnpm run dev"
echo ""
echo "  ${GREEN}Terminal 2:${NC} Start voice-pipeline (Python) - Optional for voice"
echo "    cd packages/voice-pipeline"
echo "    source venv/bin/activate"
echo "    poetry run python -m app.main"
echo ""
echo "  ${GREEN}Terminal 3:${NC} Start your application frontend"
echo "    cd /path/to/your/frontend"
echo "    npm run dev"
echo ""

read -p "Would you like to start the services now? (y/n): " start_now

if [ "$start_now" = "y" ]; then
    echo ""
    echo "Starting services..."
    echo ""

    # Start MongoDB if not running
    if ! mongosh --eval "db.version()" > /dev/null 2>&1; then
        print_info "Starting MongoDB..."
        brew services start mongodb-community 2>/dev/null || sudo systemctl start mongod 2>/dev/null
        sleep 3
    fi

    # Start conversation-core in background
    print_info "Starting conversation-core..."
    cd "$SCRIPT_DIR/packages/conversation-core"
    pnpm run dev > "$SCRIPT_DIR/logs/conversation-core.log" 2>&1 &
    CONV_PID=$!
    echo $CONV_PID > "$SCRIPT_DIR/.conversation-core.pid"

    # Wait a bit for it to start
    sleep 5

    # Check if it's running
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "conversation-core is running on http://localhost:3001"
    else
        print_error "conversation-core failed to start, check logs/conversation-core.log"
    fi

    # Optionally start voice-pipeline
    read -p "Start voice-pipeline for voice mode? (y/n): " start_voice
    if [ "$start_voice" = "y" ]; then
        print_info "Starting voice-pipeline..."
        cd "$SCRIPT_DIR/packages/voice-pipeline"
        source venv/bin/activate
        poetry run python -m app.main > "$SCRIPT_DIR/logs/voice-pipeline.log" 2>&1 &
        VOICE_PID=$!
        echo $VOICE_PID > "$SCRIPT_DIR/.voice-pipeline.pid"

        sleep 5

        if curl -f http://localhost:8000/api/v1/health > /dev/null 2>&1; then
            print_success "voice-pipeline is running on http://localhost:8000"
        else
            print_error "voice-pipeline failed to start, check logs/voice-pipeline.log"
        fi
    fi

    echo ""
    print_success "Services are running!"
    echo ""
    echo "📊 View logs:"
    echo "  conversation-core: tail -f logs/conversation-core.log"
    echo "  voice-pipeline: tail -f logs/voice-pipeline.log"
    echo ""
    echo "🛑 Stop services:"
    echo "  ./stop.sh"
    echo ""
else
    print_info "Services not started. Use the commands above to start them manually."
fi

echo ""
print_success "Setup complete!"
