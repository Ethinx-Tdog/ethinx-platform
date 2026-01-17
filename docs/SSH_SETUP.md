# SSH Setup Guide

This guide covers SSH key setup for the ETHINX platform, including Git access and server deployment.

## Table of Contents

- [SSH Key Generation](#ssh-key-generation)
- [GitHub SSH Setup](#github-ssh-setup)
- [Server Deployment SSH](#server-deployment-ssh)
- [SSH Configuration](#ssh-configuration)
- [Troubleshooting](#troubleshooting)

## SSH Key Generation

### Generate a New SSH Key

1. Check for existing SSH keys:
   ```bash
   ls -la ~/.ssh
   ```

2. Generate a new SSH key (Ed25519 algorithm recommended):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

   Or, if Ed25519 is not supported:
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
   ```

3. When prompted, save the key to the default location (`~/.ssh/id_ed25519`) or specify a custom path.

4. Enter a secure passphrase when prompted (optional but recommended).

### Start the SSH Agent

```bash
eval "$(ssh-agent -s)"
```

### Add Your SSH Key to the Agent

```bash
ssh-add ~/.ssh/id_ed25519
```

## GitHub SSH Setup

### Add SSH Key to GitHub

1. Copy your public key to clipboard:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

2. Go to [GitHub SSH Keys Settings](https://github.com/settings/keys)

3. Click **New SSH key**

4. Give it a descriptive title (e.g., "Work Laptop")

5. Paste your public key and click **Add SSH key**

### Test GitHub Connection

```bash
ssh -T git@github.com
```

You should see: `Hi username! You've successfully authenticated...`

### Clone Repository with SSH

```bash
git clone git@github.com:Ethinx-Tdog/ethinx-platform.git
```

## Server Deployment SSH

### Setup SSH Access to Deployment Server

1. Generate a deployment-specific key (optional):
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/ethinx_deploy -C "ethinx-deployment"
   ```

2. Copy your public key to the server:
   ```bash
   ssh-copy-id -i ~/.ssh/ethinx_deploy user@server-ip
   ```

   Or manually:
   ```bash
   cat ~/.ssh/ethinx_deploy.pub | ssh user@server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
   ```

3. Test the connection:
   ```bash
   ssh -i ~/.ssh/ethinx_deploy user@server-ip
   ```

### Automated Deployment (Recommended)

Use the `deploy.ps1` script to automate the upload and execution process. This script handles SCP transfer and remote command execution safely.

**Usage:**

```powershell
# Basic usage (will prompt for password if key is not configured)
.\deploy.ps1 -ServerIP "your-server-ip"

# With SSH Key (Recommended)
.\deploy.ps1 -ServerIP "your-server-ip" -User "ubuntu" -KeyFile "~/.ssh/ethinx_deploy"
```

**Note:** Ensure the `deployment` folder exists in your current directory before running the script.

## SSH Configuration

### Create SSH Config File

Copy the example config:
```bash
cp .ssh/config.example ~/.ssh/config
```

Edit `~/.ssh/config` to add your servers:

```ssh-config
# GitHub
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    AddKeysToAgent yes

# ETHINX Production Server
Host ethinx-prod
    HostName your-server-ip
    User deploy
    Port 22
    IdentityFile ~/.ssh/ethinx_deploy
    ForwardAgent no
    ServerAliveInterval 60
    ServerAliveCountMax 3

# ETHINX Staging Server
Host ethinx-staging
    HostName staging-server-ip
    User deploy
    Port 22
    IdentityFile ~/.ssh/ethinx_deploy
```

Now you can connect using aliases:
```bash
ssh ethinx-prod
```

### Secure Your SSH Keys

Set proper permissions:
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/config
```

## Troubleshooting

### Permission Denied (publickey)

1. Verify the key is added to ssh-agent:
   ```bash
   ssh-add -l
   ```

2. Add the key if missing:
   ```bash
   ssh-add ~/.ssh/id_ed25519
   ```

3. Check if the public key is on the server:
   ```bash
   ssh user@server "cat ~/.ssh/authorized_keys"
   ```

### Connection Timeout

1. Check if SSH port is correct (default is 22):
   ```bash
   ssh -p 22 user@server
   ```

2. Verify firewall rules allow SSH connections

### SSH Key Not Working on GitHub

1. Test connection with verbose output:
   ```bash
   ssh -vT git@github.com
   ```

2. Ensure the key is added to your GitHub account

3. Try using HTTPS instead:
   ```bash
   git remote set-url origin https://github.com/Ethinx-Tdog/ethinx-platform.git
   ```

### Multiple SSH Keys

If you use different keys for different services, use the SSH config file to specify which key to use for each host (see [SSH Configuration](#ssh-configuration) above).

## Security Best Practices

1. **Use Ed25519 keys** - More secure and faster than RSA
2. **Use strong passphrases** - Protect your private keys
3. **Never share private keys** - Only share public keys (.pub files)
4. **Use separate keys** - Different keys for different purposes (GitHub, production, staging)
5. **Rotate keys regularly** - Update keys every 6-12 months
6. **Disable password authentication** - On servers, use key-only authentication
7. **Enable 2FA** - Use two-factor authentication on GitHub

## GitHub Actions SSH Setup

For CI/CD deployments, add your private key as a GitHub secret:

1. Go to repository **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Name: `SSH_PRIVATE_KEY`
4. Value: Your private key content (entire file including headers)
5. Add corresponding `SSH_HOST` and `SSH_USER` secrets

Example workflow usage:
```yaml
- name: Deploy to server
  env:
    SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
  run: |
    mkdir -p ~/.ssh
    echo "$SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
    chmod 600 ~/.ssh/deploy_key
    ssh -i ~/.ssh/deploy_key user@server 'cd /path && git pull && docker-compose up -d'
```

## Resources

- [GitHub SSH Documentation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [OpenSSH Documentation](https://www.openssh.com/manual.html)
- [DigitalOcean SSH Tutorial](https://www.digitalocean.com/community/tutorials/ssh-essentials-working-with-ssh-servers-clients-and-keys)
