# Task Manager System Architecture

This document describes the architecture of the Task Manager System for system administrators.

## Overview

The Task Manager System is a web-based application designed specifically for system administrators to track and manage operational tasks. It features a React-based frontend, Node.js/Express backend, and SQLite database, all deployed in an LXC container for optimal resource utilization and isolation.

## System Components

### Frontend Layer
- **Technology**: React with Babel for JSX transformation
- **Features**:
  - Interactive task tree visualization
  - Real-time updates
  - Responsive design for desktop and mobile
  - Russian language interface optimized for sysadmins

### Backend Layer
- **Technology**: Node.js with Express framework
- **API Features**:
  - RESTful endpoints for all operations
  - Full CRUD operations for tasks
  - Task hierarchy support (parent-child relationships)
  - Comment and history tracking
  - User assignment and status management

### Data Layer
- **Technology**: SQLite database
- **Tables**:
  - `tasks`: Core task information including title, description, status, priority, assignments
  - `history`: Audit trail of all task changes
  - `comments`: Discussion threads for each task
  - `team_members`: List of authorized users

### Infrastructure Layer
- **Technology**: LXC containerization
- **Benefits**:
  - Resource isolation
  - Easy deployment and scaling
  - Consistent environment
  - Simplified backup and recovery

## Database Schema

### Tasks Table
- `id`: Primary key, auto-incrementing integer
- `title`: Task title (text, not null)
- `author`: Creator of the task (text, not null)
- `created_at`: Timestamp of creation (text, default current timestamp)
- `description`: Detailed task description (text)
- `parent_id`: Foreign key to parent task (integer, nullable)
- `status`: Current status ('new', 'in-progress', 'completed', 'blocked')
- `priority`: Priority level ('low', 'medium', 'high', 'critical')
- `assignee`: Assigned user (text)

### History Table
- `id`: Primary key, auto-incrementing integer
- `task_id`: Foreign key to tasks table (integer)
- `user`: User who made the change (text, not null)
- `action`: Description of the action taken (text, not null)
- `timestamp`: Time of the change (text, default current timestamp)

### Comments Table
- `id`: Primary key, auto-incrementing integer
- `task_id`: Foreign key to tasks table (integer)
- `text`: Comment content (text, not null)
- `user`: Author of the comment (text, not null)
- `timestamp`: Time of the comment (text, default current timestamp)

### Team Members Table
- `id`: Primary key, auto-incrementing integer
- `name`: Team member name (text, unique, not null)

## API Endpoints

### Task Management
- `GET /api/tasks` - Retrieve all tasks (with optional filtering)
- `GET /api/tasks/:id` - Retrieve a specific task
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update an existing task
- `DELETE /api/tasks/:id` - Delete a task

### Task Relationships
- `GET /api/tasks/:id/history` - Get history for a task
- `POST /api/tasks/:id/comments` - Add comment to a task
- `GET /api/tasks/:id/comments` - Get comments for a task

### Reference Data
- `GET /api/team-members` - Get list of team members
- `GET /api/status-options` - Get valid status values
- `GET /api/priority-options` - Get valid priority values

## Deployment Architecture

### Container Configuration
- Base OS: Ubuntu 22.04 LTS
- Memory: 1GB allocated
- CPU: 2 cores allocated
- Network: Bridged networking for external access
- Storage: Persistent volume for database

### Service Configuration
- Web server: Runs on port 3000
- Database: SQLite file stored in persistent volume
- Process management: systemd service with automatic restart

### Security Model
- Container runs with limited privileges
- No direct database access from outside container
- API endpoints validate all inputs
- Authentication can be added as needed

## Development Workflow

1. Code changes made locally
2. Changes tested in development environment
3. Deployed to containerized production environment
4. Database migrations handled through schema versioning

## Scaling Considerations

While this implementation uses SQLite for simplicity, it can be extended to use PostgreSQL or MySQL for larger deployments. The LXC container can be duplicated for load balancing if needed.

## Backup and Recovery

- Database files stored in persistent host directory (`/var/lib/taskmanager/data`)
- Standard LXC container export functionality for full backups
- Database backup scripts can be added for regular automated backups