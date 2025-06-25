# GitHub Secrets Configuration

This document explains how to configure GitHub repository secrets for the various workflows in this project.

## Required Secrets

### For Code Quality and CI Workflows

1. **CODECOV_TOKEN** (Optional)
   - **Purpose:** Upload test coverage reports to Codecov
   - **How to get:**
     1. Sign up at [codecov.io](https://codecov.io)
     2. Connect your GitHub repository
     3. Copy the repository upload token
   - **How to set:** GitHub Repository → Settings → Secrets and variables → Actions → New repository secret

2. **SONAR_TOKEN** (Optional)
   - **Purpose:** Run SonarCloud code quality analysis
   - **How to get:**
     1. Sign up at [sonarcloud.io](https://sonarcloud.io)
     2. Create a new project
     3. Generate a token in Account → Security → Generate Token
   - **How to set:** GitHub Repository → Settings → Secrets and variables → Actions → New repository secret

### For Release Workflow

1. **NPM_TOKEN** (Required for publishing)
   - **Purpose:** Publish packages to npm registry
   - **How to get:**
     1. Sign up at [npmjs.com](https://www.npmjs.com)
     2. Go to Access Tokens in your account settings
     3. Generate a new token with "Automation" type
   - **How to set:** GitHub Repository → Settings → Secrets and variables → Actions → New repository secret

## Automatic Secrets (No Configuration Needed)

- **GITHUB_TOKEN** - Automatically provided by GitHub Actions
- Used for: Creating releases, commenting on PRs, accessing repository data

## Setting Up Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Navigate to **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter the secret name and value
6. Click **Add secret**

## Workflow Behavior Without Secrets

All workflows are designed to work without these optional secrets:

- **Without CODECOV_TOKEN:** Coverage upload will be skipped (with warning)
- **Without SONAR_TOKEN:** SonarCloud analysis will be skipped (with warning)  
- **Without NPM_TOKEN:** Package publishing will fail (expected for forks/dev)

The workflows use `continue-on-error: true` for optional steps, so the overall build won't fail.

## Testing Workflows

You can test workflows without configuring secrets:

1. **Fork the repository** - All basic CI/CD will work
2. **Create a branch** - Push to trigger workflows
3. **Check Actions tab** - See which steps pass/fail
4. **Configure secrets gradually** - Add them as needed

## Security Notes

- **Never commit secrets to code**
- **Use environment-specific secrets** for different deployment stages
- **Rotate tokens regularly** for security
- **Use least-privilege access** when generating tokens
- **Review secret access** in organization settings

## Troubleshooting

### "Context access might be invalid" warnings

These are normal warnings when secrets are not configured. The workflows will still run.

### Workflow fails on secret-dependent steps

Check that:

1. Secret name matches exactly (case-sensitive)
2. Secret value is correct and not expired
3. Token has sufficient permissions

### NPM publish fails

Ensure:

1. NPM_TOKEN is set correctly
2. Package names in package.json are available on npm
3. You have publish permissions for the packages
