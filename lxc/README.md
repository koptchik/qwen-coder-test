# LXC Container Setup for Task Manager System

This directory contains configuration and scripts for deploying the Task Manager System in an LXC container.

## Overview

The LXC setup provides:
- Isolated environment for the application
- Resource allocation control
- Easy backup and restoration
- Network isolation
- Persistent database storage

## Files

- `task-manager-config.yaml`: LXC container configuration template
- `setup-container.sh`: Automated setup script
- `README.md`: This file

## Setup Process

The automated setup process includes:

1. **Environment Preparation**
   - Checks for LXD installation
   - Creates storage pool if needed
   - Sets up network bridge

2. **Container Creation**
   - Creates Ubuntu 22.04 container
   - Allocates 1GB RAM and 2 CPU cores
   - Configures networking

3. **Application Deployment**
   - Copies application files to container
   - Installs Node.js dependencies
   - Sets up systemd service

4. **Database Configuration**
   - Creates persistent volume for SQLite database
   - Mounts database directory to host system

## Deployment

Run the setup script:

```bash
./setup-container.sh
```

## Accessing the Container

After setup, you can manage the container with standard LXC commands:

```bash
# List containers
lxc list

# Access container shell
lxc exec task-manager-sysadmin -- bash

# View container logs
lxc exec task-manager-sysadmin -- journalctl -u task-manager -f

# Stop container
lxc stop task-manager-sysadmin

# Start container
lxc start task-manager-sysadmin

# View container details
lxc info task-manager-sysadmin
```

## Backup and Restore

To backup the container:

```bash
lxc export task-manager-sysadmin task-manager-backup.tar.gz
```

To restore from backup:

```bash
lxc import task-manager-backup.tar.gz task-manager-sysadmin
lxc start task-manager-sysadmin
```

## Maintenance

The database files are stored on the host system at `/var/lib/taskmanager/data` for easy backup and maintenance.

## Security Considerations

- The container runs with limited privileges
- Network access is controlled through the bridge
- Database files are isolated from the host system
- Only necessary ports are exposed