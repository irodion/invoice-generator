#!/bin/bash
# .devcontainer/scripts/setup-gpg.sh

# Create GPG directory with correct permissions
GPG_DIR="${HOME}/.gnupg-container"
mkdir -p "${GPG_DIR}"
chmod 700 "${GPG_DIR}"

# Create required GPG files with correct permissions
touch "${GPG_DIR}/pubring.kbx"
chmod 600 "${GPG_DIR}/pubring.kbx"

# Create GPG agent configuration
mkdir -p "${GPG_DIR}/private-keys-v1.d"
chmod 700 "${GPG_DIR}/private-keys-v1.d"

echo "GPG directory setup completed with correct permissions"
