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

# Make sure the script succeeds
exit 0
