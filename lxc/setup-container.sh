#!/bin/bash

# Setup script for Task Manager LXC Container

set -e  # Exit immediately if a command exits with a non-zero status

echo "Setting up Task Manager LXC container..."

# Check if LXD is installed
if ! command -v lxc &> /dev/null; then
    echo "LXD is not installed. Installing..."
    sudo apt update
    sudo apt install -y lxd lxd-client
fi

# Initialize LXD if needed
if ! lxc info task-manager-sysadmin &> /dev/null; then
    echo "Creating LXD storage pool..."
    if ! lxc storage show default &> /dev/null; then
        lxc storage create default dir
    fi
    
    echo "Creating network bridge..."
    if ! lxc network show lxdbr0 &> /dev/null; then
        lxc network create lxdbr0 ipv4.address=10.100.100.1/24 ipv4.nat=true
    fi
fi

# Copy the application files to the container
echo "Copying application files..."
APP_DIR="/tmp/task-manager-app"
mkdir -p $APP_DIR
cp -r /workspace/* $APP_DIR/
rm -rf $APP_DIR/lxc  # Don't copy the lxc directory itself

# Create the container
echo "Creating container..."
cat << EOF | lxc init -
name: task-manager-sysadmin
source:
  type: image
  alias: ubuntu/22.04
profiles:
  - default
EOF

# Configure the container
echo "Configuring container..."
lxc config set task-manager-sysadmin limits.memory 1GB
lxc config set task-manager-sysadmin limits.cpu 2

# Set up networking
lxc network attach lxdbr0 task-manager-sysadmin eth0
lxc config set task-manager-sysadmin devices.eth0.ipv4.address auto

# Create database directory and mount it
sudo mkdir -p /var/lib/taskmanager/data
lxc config device add task-manager-sysadmin task-db disk source=/var/lib/taskmanager/data path=/app/db

# Start the container
echo "Starting container..."
lxc start task-manager-sysadmin

# Wait for container to be ready
sleep 10

# Install dependencies inside the container
echo "Installing application dependencies in container..."
lxc exec task-manager-sysadmin -- apt update
lxc exec task-manager-sysadmin -- apt install -y nodejs npm sqlite3

# Copy application files to container
echo "Copying application to container..."
lxc file push -r $APP_DIR/ task-manager-sysadmin/app/

# Install Node.js packages
lxc exec task-manager-sysadmin -- bash -c "cd /app && npm install"

# Set up the service
cat << 'EOF' | lxc exec task-manager-sysadmin -- tee /etc/systemd/system/task-manager.service
[Unit]
Description=Task Manager for SysAdmin
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/app
ExecStart=/usr/bin/node api/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
lxc exec task-manager-sysadmin -- systemctl daemon-reload
lxc exec task-manager-sysadmin -- systemctl enable task-manager
lxc exec task-manager-sysadmin -- systemctl start task-manager

echo "Container setup complete!"
echo "Access the application at: $(lxc exec task-manager-sysadmin -- hostname -I | awk '{print $1}'):3000"