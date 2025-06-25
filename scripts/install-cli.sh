#!/bin/bash

# Install PoD Protocol CLI to user's local bin directory

set -e

echo "🔧 Installing PoD Protocol CLI..."

# Create local bin directory if it doesn't exist
mkdir -p ~/.local/bin

# Create a wrapper script for the CLI
PROJECT_PATH="$(pwd)"
cat > ~/.local/bin/pod << EOF
#!/bin/bash
cd "$PROJECT_PATH" && node cli/dist/index.js "\$@"
EOF

# Make it executable
chmod +x ~/.local/bin/pod

# Add ~/.local/bin to PATH if not already there
if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
    echo "📝 Adding ~/.local/bin to PATH..."
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    echo "💡 Run 'source ~/.bashrc' or restart your terminal to apply changes"
fi

echo "✅ PoD Protocol CLI installed successfully!"
echo "🚀 You can now use: pod --help"
echo "📍 CLI location: ~/.local/bin/pod"

# Test if it works
if command -v pod >/dev/null 2>&1; then
    echo "🎉 CLI is ready to use!"
else
    echo "⚠️  Please run 'source ~/.bashrc' to update your PATH"
fi