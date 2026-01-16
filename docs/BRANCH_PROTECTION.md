# Branch Protection Configuration

## Overview

This repository uses branch protection rules to ensure code quality and prevent accidental or malicious changes to the main branch.

## Protection Rules

The main branch is protected with the following rules:

### Prevent Destructive Actions
- **No Force Pushes**: Force pushing to the main branch is disabled to prevent rewriting history
- **No Deletions**: The main branch cannot be deleted
- **Applies to Admins**: These rules apply to all users including repository administrators for consistent security

### Required Status Checks
Before merging any pull request into main, the following checks must pass:
- **ETHINX CI** (`build`): Runs linting and tests

Note: The **Catalog Validate** workflow runs automatically when catalog files are modified, but is not a required status check since it only applies to catalog changes.

### Pull Request Requirements
- At least **1 approval** is required before merging
- Stale reviews are automatically dismissed when new commits are pushed
- Branches must be up to date with main before merging

## Configuration File

The branch protection rules are defined in `.github/settings.yml`. This file can be used with:
- [Probot Settings App](https://github.com/probot/settings)
- GitHub repository settings synchronization tools
- Manual configuration reference for GitHub UI settings

## Applying Settings

### Option 1: Using GitHub UI (Recommended for immediate setup)
1. Go to Repository Settings → Branches
2. Add branch protection rule for `main`
3. Configure settings to match `.github/settings.yml`:
   - ✅ Require status checks to pass before merging
     - ✅ Require branches to be up to date before merging
     - Select: `build`
   - ✅ Require pull request reviews before merging
     - Required approving reviews: 1
     - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Include administrators (enforce rules for admins)
   - ✅ Restrict who can push to matching branches (prevent force pushes)
   - ✅ Do not allow deletions

### Option 2: Using Probot Settings App
1. Install the [Probot Settings App](https://github.com/apps/settings)
2. The app will automatically apply settings from `.github/settings.yml`
3. Any changes to `.github/settings.yml` will be applied automatically

### Option 3: Using GitHub API
```bash
# Use GitHub's REST API to apply settings
# Requires appropriate permissions and a GitHub token
gh api repos/Ethinx-Tdog/ethinx-platform/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["build"]
  },
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "enforce_admins": true,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

## Benefits

1. **Prevent Accidents**: No accidental force pushes or branch deletions
2. **Code Quality**: All code must pass CI checks before merging
3. **Code Review**: Ensures changes are reviewed by team members
4. **History Preservation**: Maintains a clean, traceable git history

## Modifying Protection Rules

To modify branch protection rules:
1. Update `.github/settings.yml`
2. Apply changes using one of the methods above
3. Test with a pull request to verify the rules work as expected

## Troubleshooting

### Status Checks Not Showing Up
- Ensure the workflow names in `required_status_checks.contexts` match the actual job names in your GitHub Actions workflows
- Check that workflows have run at least once on the main branch

### Can't Merge Despite Passing Checks
- Verify branch is up to date with main
- Check that all required reviewers have approved
- Ensure no blocking reviews exist

## References

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Repository Settings Schema](https://github.com/repository-settings/app)
