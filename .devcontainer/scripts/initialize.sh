#!/bin/bash
# .devcontainer/initialize.sh

# Make sure the script is executable
chmod +x "${0}"

# Set up .clasprc.json if it doesn't exist
CLASP_RC="${HOME}/.clasprc.json"
if [ ! -f "${CLASP_RC}" ]; then
    echo "{}" > "${CLASP_RC}"
    echo "Created empty .clasprc.json file. You'll need to run 'clasp login' after the container starts."
fi

# Create a .clasp.json file if it doesn't exist in the project root
CLASP_PROJECT="/workspaces/$(basename ${PWD})/.clasp.json"
if [ ! -f "${CLASP_PROJECT}" ]; then
    echo "Note: No .clasp.json found in project root. You'll need to run 'clasp create' or 'clasp clone' to set up your Apps Script project."
fi

# Make sure global node modules are accessible
if ! grep -q "export PATH=\$PATH:\$HOME/.npm-global/bin" "${HOME}/.bashrc"; then
    mkdir -p "${HOME}/.npm-global"
    npm config set prefix "${HOME}/.npm-global"
    echo 'export PATH=$PATH:$HOME/.npm-global/bin' >> "${HOME}/.bashrc"
    echo "Updated PATH to include global npm binaries"
fi

# Make directories writable
mkdir -p /workspaces/$(basename ${PWD})/build
mkdir -p /workspaces/$(basename ${PWD})/node_modules
sudo chown -R node:node /workspaces/$(basename ${PWD})

# Make sure the script succeeds
exit 0
