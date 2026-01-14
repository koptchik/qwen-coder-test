# Installation Guide for Task Manager System

This guide explains how to install and deploy the Task Manager System in an LXC container with SQLite database.

## Prerequisites

- Ubuntu/Debian system
- LXD/LXC installed and configured
- Sufficient system resources (at least 2GB RAM recommended)

## Quick Setup

The easiest way to deploy the system is using the provided setup script:

```bash
./lxc/setup-container.sh
```

This script will:
1. Install LXD if not present
2. Create an LXC container named `task-manager-sysadmin`
3. Configure resources and networking
4. Install Node.js and other dependencies
5. Deploy the application
6. Set up the service to run automatically

## Manual Setup

If you prefer to set up manually, follow these steps:

### 1. Install Dependencies

```bash
sudo apt update
sudo apt install -y lxd nodejs npm sqlite3
```

### 2. Initialize LXD

```bash
# If this is the first time using LXD
newgrp lxd
lxd init --minimal
```

### 3. Create the Container

```bash
lxc launch ubuntu:22.04 task-manager-sysadmin
lxc config set task-manager-sysadmin limits.memory 1GB
lxc config set task-manager-sysadmin limits.cpu 2
```

### 4. Deploy Application Files

```bash
# Copy the application to the container
lxc file push -r . task-manager-sysadmin/app/

# Install Node.js dependencies
lxc exec task-manager-sysadmin -- bash -c "cd /app && npm install"
```

### 5. Start the Service

```bash
lxc exec task-manager-sysadmin -- bash -c "cd /app && node api/server.js"
```

## Accessing the Application

Once the container is running and the service is started, you can access the application through:

```bash
# Get the container IP address
lxc exec task-manager-sysadmin -- hostname -I

# Access the web interface at http://[IP_ADDRESS]:3000
```

## Database Configuration

The application uses SQLite which is stored in the container at `/app/taskmanager.db`. The database is automatically created on first run with the following tables:

- `tasks`: Stores all task information
- `history`: Tracks changes to tasks
- `comments`: Stores task comments
- `team_members`: Stores team member names

For persistence, the database is mounted to `/var/lib/taskmanager/data` on the host system.

## Configuration

All configuration is handled through environment variables:

- `PORT`: Port to run the server on (default: 3000)

## Troubleshooting

### Container won't start
Check if LXD is properly installed and initialized:
```bash
lxc version
lxc list
```

### Application fails to start
Check the logs inside the container:
```bash
lxc exec task-manager-sysadmin -- journalctl -u task-manager -f
```

### Can't access the web interface
Verify the container's IP address and ensure port 3000 is accessible:
```bash
lxc exec task-manager-sysadmin -- netstat -tlnp | grep 3000
```