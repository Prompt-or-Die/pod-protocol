#!/bin/bash

# PoD Protocol Docker Deployment Script
# This script handles deployment of the PoD Protocol stack

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment file
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning "Environment file not found, copying from template..."
        cp .env.docker .env
        log_warning "Please edit .env file with your configuration before running again"
        exit 1
    fi
    
    log_success "Requirements check passed"
}

backup_database() {
    if [[ "$1" == "--backup" ]]; then
        log_info "Creating database backup..."
        
        mkdir -p "$BACKUP_DIR"
        
        # Export database
        docker-compose exec -T postgres pg_dump -U podprotocol podprotocol > "$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
        
        log_success "Database backup created"
    fi
}

build_images() {
    log_info "Building Docker images..."
    
    # Build with no cache in production
    if [[ "${NODE_ENV:-production}" == "production" ]]; then
        docker-compose build --no-cache
    else
        docker-compose build
    fi
    
    log_success "Images built successfully"
}

deploy_services() {
    log_info "Deploying services..."
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    
    # Wait for database
    timeout 60 sh -c 'until docker-compose exec postgres pg_isready -U podprotocol; do sleep 2; done'
    
    # Wait for Phala Cloud app
    timeout 90 sh -c 'until curl -f http://localhost:3000/api/health; do sleep 2; done'
    
    # Wait for API server
    timeout 60 sh -c 'until curl -f http://localhost:4000/health; do sleep 2; done'
    
    # Wait for MCP server
    timeout 60 sh -c 'until curl -f http://localhost:8080/health; do sleep 2; done'
    
    log_success "All services are healthy"
}

run_migrations() {
    log_info "Running database migrations..."
    
    # Run Prisma migrations
    docker-compose exec api-server npx prisma migrate deploy
    
    log_success "Database migrations completed"
}

show_status() {
    log_info "Service status:"
    docker-compose ps
    
    echo
    log_info "Service endpoints:"
    echo "  • Phala Cloud App: http://localhost:3000"
    echo "  • API Server: http://localhost:4000"
    echo "  • API Health: http://localhost:4000/health"
    echo "  • MCP HTTP: http://localhost:8080"
    echo "  • MCP WebSocket: ws://localhost:8081"
    echo "  • MCP Health: http://localhost:8080/health"
    
    if docker-compose --profile nginx ps nginx | grep -q Up; then
        echo "  • Nginx Proxy: http://localhost:80"
    fi
}

cleanup() {
    log_info "Cleaning up..."
    docker-compose down
    docker system prune -f
    log_success "Cleanup completed"
}

# Command handling
case "${1:-deploy}" in
    "deploy")
        check_requirements
        backup_database "$@"
        build_images
        deploy_services
        run_migrations
        show_status
        ;;
    "start")
        log_info "Starting services..."
        docker-compose up -d
        show_status
        ;;
    "stop")
        log_info "Stopping services..."
        docker-compose down
        ;;
    "restart")
        log_info "Restarting services..."
        docker-compose restart
        show_status
        ;;
    "logs")
        docker-compose logs -f "${2:-}"
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        ;;
    "backup")
        backup_database --backup
        ;;
    "rebuild")
        log_info "Rebuilding and redeploying..."
        docker-compose down
        backup_database "$@"
        build_images
        deploy_services
        run_migrations
        show_status
        ;;
    *)
        echo "Usage: $0 {deploy|start|stop|restart|logs|status|cleanup|backup|rebuild}"
        echo
        echo "Commands:"
        echo "  deploy   - Full deployment (build, start, migrate)"
        echo "  start    - Start services"
        echo "  stop     - Stop services"
        echo "  restart  - Restart services"
        echo "  logs     - View logs (optionally specify service)"
        echo "  status   - Show service status and endpoints"
        echo "  cleanup  - Stop services and clean up"
        echo "  backup   - Create database backup"
        echo "  rebuild  - Rebuild images and redeploy"
        echo
        echo "Options:"
        echo "  --backup - Create database backup before deployment"
        exit 1
        ;;
esac