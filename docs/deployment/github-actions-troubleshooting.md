# GitHub Actions Troubleshooting Guide for POD-COM

## Quick Debugging Steps

### 1. Check Action Logs
- Go to the **Actions** tab in your repository
- Click on the failed workflow run
- Expand each step to see detailed logs
- Look for red error messages or warnings

### 2. Common Issues and Solutions

#### SonarQube Token Issues
```bash
# Verify your SONAR_TOKEN secret is set
# Go to: Settings > Secrets and variables > Actions
# Ensure SONAR_TOKEN is added with your SonarCloud token