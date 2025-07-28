#!/bin/bash
# start-app.sh: Start backend and frontend for AetherPress AI (improved with cleaner process tracking & port handling)

# ────────────────────────────────────────────────────────────────
# 🌈 Terminal Colors
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m" # No Color

# ────────────────────────────────────────────────────────────────
# ⚙️ Dependency Check
check_dependencies() {
    local service_dir=$1
    echo -e "${GREEN}Checking dependencies in $service_dir...${NC}"
    if [ ! -d "$service_dir/node_modules" ]; then
        echo -e "${RED}Installing dependencies...${NC}"
        (cd "$service_dir" && npm install)
    else
        echo -e "${GREEN}Dependencies already installed.${NC}"
    fi
}

# ────────────────────────────────────────────────────────────────
# 🔥 Port Cleanup
free_port() {
    local PORT=$1
    if lsof -i tcp:$PORT -sTCP:LISTEN -t >/dev/null; then
        echo -e "${RED}Killing process on port $PORT...${NC}"
        kill -9 $(lsof -i tcp:$PORT -sTCP:LISTEN -t)
    fi
}

# ────────────────────────────────────────────────────────────────
# 🧠 Start Backend
start_backend() {
    echo -e "${GREEN}Starting backend...${NC}"
    cd server
    npm run dev &
    BACKEND_PID=$!
    cd ..

    echo -e "${GREEN}Waiting for backend to become ready...${NC}"
    until curl --output /dev/null --silent --head --fail http://localhost:3000; do
        echo "⏳ Waiting for backend at http://localhost:3000..."
        sleep 1
    done
    echo -e "${GREEN}✅ Backend is ready!${NC}"
}

# ────────────────────────────────────────────────────────────────
# 🌐 Start Frontend
start_frontend() {
    echo -e "${GREEN}Starting frontend...${NC}"
    cd client
    npm run dev &
    FRONTEND_PID=$!
    cd ..
}

# ────────────────────────────────────────────────────────────────
# 🚦 Start Routine
echo "Ensuring ports are free..."
free_port 3000
free_port 5173
sleep 1

echo "🚧 Building shared package..."
(cd shared && npm install && npm run build)

echo "🚀 Starting server..."
check_dependencies server
start_backend

echo "🌐 Starting client..."
check_dependencies client
start_frontend

# ────────────────────────────────────────────────────────────────
# 🛑 Wait for Exit
echo -e "${GREEN}Both backend and frontend are running.${NC}"
echo "Press Ctrl+C to stop both."

wait $BACKEND_PID $FRONTEND_PID
