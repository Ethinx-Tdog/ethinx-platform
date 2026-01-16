# ETHINX Platform Documentation

This directory contains documentation for the ETHINX platform.

## Available Documentation

- [SSH Setup Guide](SSH_SETUP.md) - Complete guide for setting up SSH keys for development and deployment
- [Branch Protection Configuration](BRANCH_PROTECTION.md) - Branch protection rules and repository security settings

## Quick Links

### For Developers
- **SSH Setup**: See [SSH_SETUP.md](SSH_SETUP.md) for instructions on setting up SSH keys for Git and GitHub access
- **Helper Script**: Run `./scripts/setup_ssh.sh` for an interactive SSH key setup wizard
- **Branch Protection**: See [BRANCH_PROTECTION.md](BRANCH_PROTECTION.md) for main branch protection rules and contribution guidelines

### For DevOps/Deployment
- **Branch Protection**: Configuration file at `.github/settings.yml` defines main branch protection rules
- **SSH Configuration**: Example SSH config available at `.ssh/config.example`
- **GitHub Actions Deployment**: Deployment workflow at `.github/workflows/deploy.yml`
- **Docker Compose**: Main application stack in `docker-compose.yml`

## Contributing

When adding new documentation:
1. Use Markdown format
2. Follow the existing structure
3. Include clear examples
4. Link related documents
5. Update this README with new document links
