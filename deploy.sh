#!/bin/bash
# Deployment script for the new architecture
# This script helps set up and deploy the ref-punk, accounts, and XHashPass workers

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}LuceneX Secure Deployment Script${NC}"
echo "====================================="

# Set paths based on current directory
REF_PUNK_DIR="$HOME/Sites/ref-punk"
ACCOUNTS_DIR="$HOME/Sites/accounts"
XHASHPASS_DIR="$HOME/projects/python/XHashPass"

# Function to prompt for environment
select_environment() {
  PS3="Select deployment environment: "
  options=("Development" "Staging" "Production" "Cancel")
  select opt in "${options[@]}"
  do
    case $opt in
      "Development")
        echo -e "${YELLOW}Deploying to development environment...${NC}"
        ENVIRONMENT="development"
        break
        ;;
      "Staging")
        echo -e "${YELLOW}Deploying to staging environment...${NC}"
        ENVIRONMENT="staging"
        break
        ;;
      "Production")
        echo -e "${RED}WARNING: You are about to deploy to PRODUCTION!${NC}"
        read -p "Are you sure? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
          echo -e "${YELLOW}Deploying to production environment...${NC}"
          ENVIRONMENT="production"
          break
        else
          echo "Deployment cancelled."
          exit 1
        fi
        ;;
      "Cancel")
        echo "Deployment cancelled."
        exit 0
        ;;
      *) echo "Invalid option $REPLY" ;;
    esac
  done
}

# Function to select workers to deploy
select_workers() {
  PS3="Select workers to deploy (space to select, enter when done): "
  options=("ref-punk" "accounts" "xhashpass" "all" "done")
  
  SELECTED_WORKERS=()
  
  while true; do
    select opt in "${options[@]}"
    do
      case $opt in
        "ref-punk")
          if [[ ! " ${SELECTED_WORKERS[@]} " =~ " ref-punk " ]]; then
            SELECTED_WORKERS+=("ref-punk")
            echo "Added ref-punk to deployment list"
          else
            echo "ref-punk is already in the deployment list"
          fi
          break
          ;;
        "accounts")
          if [[ ! " ${SELECTED_WORKERS[@]} " =~ " accounts " ]]; then
            SELECTED_WORKERS+=("accounts")
            echo "Added accounts to deployment list"
          else
            echo "accounts is already in the deployment list"
          fi
          break
          ;;
        "xhashpass")
          if [[ ! " ${SELECTED_WORKERS[@]} " =~ " xhashpass " ]]; then
            SELECTED_WORKERS+=("xhashpass")
            echo "Added xhashpass to deployment list"
          else
            echo "xhashpass is already in the deployment list"
          fi
          break
          ;;
        "all")
          SELECTED_WORKERS=("ref-punk" "accounts" "xhashpass")
          echo "Selected all workers"
          break
          ;;
        "done")
          if [ ${#SELECTED_WORKERS[@]} -eq 0 ]; then
            echo "Please select at least one worker to deploy"
          else
            return
          fi
          break
          ;;
        *) echo "Invalid option $REPLY" ;;
      esac
    done
  done
}

# Function to set up secrets
setup_secrets() {
  echo -e "${YELLOW}Setting up secrets for $ENVIRONMENT environment...${NC}"
  
  # Generate a secure API token or use existing
  if [[ ! -f .ref-punk-api-token-$ENVIRONMENT ]]; then
    read -p "Enter the REF_PUNK_API_TOKEN or press Enter to generate a new token: " API_TOKEN
    if [ -z "$API_TOKEN" ]; then
      API_TOKEN=$(openssl rand -hex 32)
      echo "Generated token: ${API_TOKEN:0:8}...${API_TOKEN: -8} (partly hidden for security)"
    fi
    echo "$API_TOKEN" > .ref-punk-api-token-$ENVIRONMENT
  else
    API_TOKEN=$(cat .ref-punk-api-token-$ENVIRONMENT)
    echo "Using existing token: ${API_TOKEN:0:8}...${API_TOKEN: -8} (partly hidden for security)"
    read -p "Do you want to generate a new token? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      API_TOKEN=$(openssl rand -hex 32)
      echo "Generated new token: ${API_TOKEN:0:8}...${API_TOKEN: -8} (partly hidden for security)"
      echo "$API_TOKEN" > .ref-punk-api-token-$ENVIRONMENT
    fi
  fi
  
  # Set up secrets for each selected worker
  for worker in "${SELECTED_WORKERS[@]}"; do
    case "$worker" in
      ref-punk)
        echo -e "${YELLOW}Setting REF_PUNK_API_TOKEN secret for ref-punk worker...${NC}"
        cd "$REF_PUNK_DIR"
        echo "$API_TOKEN" | npx wrangler secret put REF_PUNK_API_TOKEN --env $ENVIRONMENT
        ;;
      accounts)
        echo -e "${YELLOW}Setting REF_PUNK_API_TOKEN secret for accounts worker...${NC}"
        cd "$ACCOUNTS_DIR"
        echo "$API_TOKEN" | npx wrangler secret put REF_PUNK_API_TOKEN --env $ENVIRONMENT
        
        # Set JWT_SECRET and WORKER_TOKEN for staging and production
        if [ "$ENVIRONMENT" != "development" ]; then
          echo -e "${YELLOW}Setting JWT_SECRET for accounts worker...${NC}"
          read -p "Enter the JWT_SECRET or press Enter to generate: " JWT_SECRET
          if [ -z "$JWT_SECRET" ]; then
            JWT_SECRET=$(openssl rand -hex 32)
            echo "Generated JWT_SECRET: ${JWT_SECRET:0:8}...${JWT_SECRET: -8} (partly hidden for security)"
          fi
          echo "$JWT_SECRET" | npx wrangler secret put JWT_SECRET --env $ENVIRONMENT
          
          echo -e "${YELLOW}Setting WORKER_TOKEN for accounts worker...${NC}"
          read -p "Enter the WORKER_TOKEN or press Enter to generate: " WORKER_TOKEN
          if [ -z "$WORKER_TOKEN" ]; then
            WORKER_TOKEN=$(openssl rand -hex 32)
            echo "Generated WORKER_TOKEN: ${WORKER_TOKEN:0:8}...${WORKER_TOKEN: -8} (partly hidden for security)"
          fi
          echo "$WORKER_TOKEN" | npx wrangler secret put WORKER_TOKEN --env $ENVIRONMENT
        fi
        ;;
      xhashpass)
        echo -e "${YELLOW}Setting REF_PUNK_API_TOKEN secret for XHashPass worker...${NC}"
        cd "$XHASHPASS_DIR"
        echo "$API_TOKEN" | npx wrangler secret put REF_PUNK_API_TOKEN --env $ENVIRONMENT
        ;;
    esac
  done
}

# Function to update REF_PUNK_URL in all workers
update_ref_punk_url() {
  echo -e "${YELLOW}Validating REF_PUNK_URL for $ENVIRONMENT environment...${NC}"
  
  # Only need to update if we're deploying to staging or production
  if [ "$ENVIRONMENT" == "development" ]; then
    echo "Using localhost URLs for development environment"
    return
  fi
  
  # Get the deployed URL for ref-punk
  echo -e "${YELLOW}Enter the deployed URL for ref-punk worker:${NC}"
  read -p "REF_PUNK_URL (e.g., https://ref-punk.yourdomain.workers.dev): " REF_PUNK_URL
  
  if [ -z "$REF_PUNK_URL" ]; then
    echo -e "${RED}No URL provided. URLs in wrangler files will not be updated.${NC}"
    return
  fi
  
  # Update URL in accounts wrangler.json if needed
  if [[ " ${SELECTED_WORKERS[@]} " =~ " accounts " ]]; then
    cd "$ACCOUNTS_DIR"
    # Extract current URL from wrangler.json
    CURRENT_URL=$(grep -A 5 "\"$ENVIRONMENT\"" wrangler.json | grep "REF_PUNK_URL" | sed 's/.*: "\(.*\)".*/\1/')
    
    # Update URL in wrangler.json
    sed -i '' "s|\"REF_PUNK_URL\": \"$CURRENT_URL\"|\"REF_PUNK_URL\": \"$REF_PUNK_URL\"|g" wrangler.json
    echo -e "${GREEN}Updated REF_PUNK_URL in accounts worker to: $REF_PUNK_URL${NC}"
  fi
  
  # Update URL in XHashPass wrangler.toml if needed
  if [[ " ${SELECTED_WORKERS[@]} " =~ " xhashpass " ]]; then
    cd "$XHASHPASS_DIR"
    # Extract current URL from wrangler.toml if it exists
    if grep -q "REF_PUNK_URL" wrangler.toml; then
      CURRENT_URL=$(grep "REF_PUNK_URL" wrangler.toml | sed 's/.*= "\(.*\)".*/\1/')
      
      # Update URL in wrangler.toml
      sed -i '' "s|REF_PUNK_URL = \"$CURRENT_URL\"|REF_PUNK_URL = \"$REF_PUNK_URL\"|g" wrangler.toml
      echo -e "${GREEN}Updated REF_PUNK_URL in XHashPass worker to: $REF_PUNK_URL${NC}"
    else
      echo -e "${YELLOW}REF_PUNK_URL not found in XHashPass wrangler.toml. You may need to add it manually.${NC}"
    fi
  fi
}

# Function to deploy workers
deploy_workers() {
  for worker in "${SELECTED_WORKERS[@]}"; do
    case "$worker" in
      ref-punk)
        echo -e "${YELLOW}Deploying ref-punk worker...${NC}"
        cd "$REF_PUNK_DIR"
        npm run build
        if [ "$ENVIRONMENT" == "development" ]; then
          npx wrangler dev --env development
        else
          npx wrangler deploy --env $ENVIRONMENT
        fi
        
        if [ $? -eq 0 ]; then
          echo -e "${GREEN}ref-punk deployment to $ENVIRONMENT successful!${NC}"
        else
          echo -e "${RED}ref-punk deployment failed. Please check the logs above.${NC}"
        fi
        ;;
      accounts)
        echo -e "${YELLOW}Deploying accounts worker...${NC}"
        cd "$ACCOUNTS_DIR"
        if [ "$ENVIRONMENT" == "development" ]; then
          npx wrangler dev --env development
        else
          npx wrangler deploy --env $ENVIRONMENT
        fi
        
        if [ $? -eq 0 ]; then
          echo -e "${GREEN}accounts deployment to $ENVIRONMENT successful!${NC}"
        else
          echo -e "${RED}accounts deployment failed. Please check the logs above.${NC}"
        fi
        ;;
      xhashpass)
        echo -e "${YELLOW}Deploying XHashPass worker...${NC}"
        cd "$XHASHPASS_DIR"
        if [ "$ENVIRONMENT" == "development" ]; then
          npx wrangler dev --env development
        else
          npx wrangler deploy --env $ENVIRONMENT
        fi
        
        if [ $? -eq 0 ]; then
          echo -e "${GREEN}XHashPass deployment to $ENVIRONMENT successful!${NC}"
        else
          echo -e "${RED}XHashPass deployment failed. Please check the logs above.${NC}"
        fi
        ;;
    esac
  done
}

# Main process
select_environment
select_workers
setup_secrets
update_ref_punk_url
deploy_workers

echo -e "${GREEN}Deployment process completed.${NC}"
