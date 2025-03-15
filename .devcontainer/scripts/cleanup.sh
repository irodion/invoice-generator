#!/bin/bash
# cleanup.sh

# Stop any running containers for this workspace
container_name=$(basename $(pwd))
podman stop $container_name 2>/dev/null

# Remove the volumes
podman volume rm vscode-server-$container_name 2>/dev/null
podman volume rm node-modules-$container_name 2>/dev/null

# Clean up temporary files
rm -rf .devcontainer/.tmp 2>/dev/null

echo "Cleanup complete. You can now rebuild the container."
