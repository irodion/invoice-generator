FROM mcr.microsoft.com/devcontainers/typescript-node:0-18

# Install global packages
RUN npm install -g @google/clasp

# Set up clasp configuration directory
USER node
RUN mkdir -p /home/node/.npm-global && \
    npm config set prefix /home/node/.npm-global && \
    echo 'export PATH=$PATH:/home/node/.npm-global/bin' >> /home/node/.bashrc && \
    mkdir -p /home/node/.config/clasp

# Create an empty .clasprc.json to be populated later
RUN echo '{}' > /home/node/.clasprc.json

# Set up a welcome message with instructions
RUN echo 'echo "Welcome to Google Sheets Invoice Generator DevPod!"' >> /home/node/.bashrc && \
    echo 'echo "To get started, run the following commands:"' >> /home/node/.bashrc && \
    echo 'echo " - Run \"clasp login\" to authenticate with Google"' >> /home/node/.bashrc && \
    echo 'echo " - Run \"clasp clone\" or \"clasp create\" to set up your project"' >> /home/node/.bashrc && \
    echo 'echo " - Run \"npm run build\" to compile TypeScript"' >> /home/node/.bashrc && \
    echo 'echo " - Run \"npm run push\" to push to Google Apps Script"' >> /home/node/.bashrc

# Set the working directory
WORKDIR /workspaces/google-sheets-invoice-generator
