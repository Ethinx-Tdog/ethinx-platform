#!/bin/bash
# SSH Key Setup Helper Script for ETHINX Platform
# This script helps set up SSH keys for development and deployment

set -e

echo "================================================"
echo "  ETHINX Platform - SSH Key Setup"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if SSH directory exists
if [ ! -d "$HOME/.ssh" ]; then
    print_info "Creating ~/.ssh directory..."
    mkdir -p "$HOME/.ssh"
    chmod 700 "$HOME/.ssh"
fi

# Function to check if a key exists
check_key_exists() {
    local key_path="$1"
    if [ -f "$key_path" ]; then
        return 0
    else
        return 1
    fi
}

# Main menu
echo "What would you like to do?"
echo ""
echo "1. Generate a new SSH key for GitHub"
echo "2. Generate a deployment SSH key for ETHINX servers"
echo "3. Setup SSH config file"
echo "4. Test GitHub SSH connection"
echo "5. List existing SSH keys"
echo "6. Exit"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        print_info "Generating SSH key for GitHub..."
        echo ""
        read -p "Enter your email address: " email
        
        key_path="$HOME/.ssh/id_ed25519"
        
        if check_key_exists "$key_path"; then
            print_warning "Key already exists at $key_path"
            read -p "Do you want to overwrite it? (y/N): " overwrite
            if [[ ! $overwrite =~ ^[Yy]$ ]]; then
                print_info "Skipping key generation."
                exit 0
            fi
        fi
        
        ssh-keygen -t ed25519 -C "$email" -f "$key_path" -N ""
        
        print_warning "Key generated without passphrase. For better security, add one with:"
        echo "ssh-keygen -p -f $key_path"
        
        print_info "SSH key generated successfully!"
        echo ""
        print_info "Your public key:"
        echo ""
        cat "${key_path}.pub"
        echo ""
        print_info "Copy the above public key and add it to GitHub:"
        print_info "https://github.com/settings/keys"
        ;;
        
    2)
        print_info "Generating deployment SSH key..."
        echo ""
        
        key_path="$HOME/.ssh/ethinx_deploy"
        
        if check_key_exists "$key_path"; then
            print_warning "Key already exists at $key_path"
            read -p "Do you want to overwrite it? (y/N): " overwrite
            if [[ ! $overwrite =~ ^[Yy]$ ]]; then
                print_info "Skipping key generation."
                exit 0
            fi
        fi
        
        ssh-keygen -t ed25519 -C "ethinx-deployment" -f "$key_path" -N ""
        
        print_warning "Key generated without passphrase. For better security, add one with:"
        echo "ssh-keygen -p -f $key_path"
        
        print_info "Deployment SSH key generated successfully!"
        echo ""
        print_info "Your public key:"
        echo ""
        cat "${key_path}.pub"
        echo ""
        print_info "To add this key to your server, run:"
        echo "ssh-copy-id -i ${key_path}.pub user@your-server-ip"
        ;;
        
    3)
        print_info "Setting up SSH config file..."
        echo ""
        
        config_path="$HOME/.ssh/config"
        example_path="$(dirname "$0")/../.ssh/config.example"
        
        if [ -f "$config_path" ]; then
            print_warning "SSH config already exists at $config_path"
            read -p "Do you want to view the example config instead? (Y/n): " view_example
            if [[ $view_example =~ ^[Nn]$ ]]; then
                exit 0
            fi
            
            if [ -f "$example_path" ]; then
                print_info "Example SSH config:"
                echo ""
                cat "$example_path"
            else
                print_error "Example config not found at $example_path"
            fi
        else
            if [ -f "$example_path" ]; then
                print_info "Copying example config to $config_path"
                cp "$example_path" "$config_path"
                chmod 600 "$config_path"
                print_info "SSH config created successfully!"
                print_warning "Don't forget to edit $config_path with your server details"
            else
                print_error "Example config not found at $example_path"
                exit 1
            fi
        fi
        ;;
        
    4)
        print_info "Testing GitHub SSH connection..."
        echo ""
        print_info "Adding github.com to known_hosts..."
        ssh-keyscan -H github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null
        ssh -T git@github.com
        ;;
        
    5)
        print_info "Listing SSH keys in ~/.ssh/..."
        echo ""
        
        found=0
        for pattern in "id_*" "*_rsa" "*_ed25519" "*_ecdsa"; do
            for key in "$HOME/.ssh/"$pattern; do
                if [ -f "$key" ] && [[ ! "$key" == *.pub ]]; then
                    echo "$key"
                    found=1
                fi
            done
        done
        
        if [ $found -eq 0 ]; then
            print_warning "No SSH keys found in ~/.ssh/"
        else
            echo ""
            print_info "Found SSH keys"
        fi
        ;;
        
    6)
        print_info "Exiting..."
        exit 0
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
print_info "Done!"
print_info "For more information, see docs/SSH_SETUP.md"
