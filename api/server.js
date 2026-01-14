const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize SQLite database
let db = new sqlite3.Database('./taskmanager.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// Create tables if they don't exist
db.serialize(() => {
    // Tasks table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        parent_id INTEGER,
        status TEXT DEFAULT 'new',
        priority TEXT DEFAULT 'medium',
        assignee TEXT,
        FOREIGN KEY (parent_id) REFERENCES tasks (id)
    )`);

    // History table
    db.run(`CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        user TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id)
    )`);

    // Comments table
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        text TEXT NOT NULL,
        user TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id)
    )`);

    // Team members table
    db.run(`CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    )`);

    // Insert default team members
    const teamMembers = [
        "Алексей Иванов",
        "Мария Петрова", 
        "Сергей Сидоров",
        "Дмитрий Козлов",
        "Елена Васильева",
        "Анна Смирнова",
        "Иван Петров"
    ];

    teamMembers.forEach(name => {
        db.run("INSERT OR IGNORE INTO team_members (name) VALUES (?)", [name]);
    });
});

// API Routes

// Get all tasks
app.get('/api/tasks', (req, res) => {
    const { filter, grouping } = req.query;
    
    let query = `
        SELECT t.*, 
               (SELECT GROUP_CONCAT(child.id) FROM tasks child WHERE child.parent_id = t.id) AS children_list
        FROM tasks t
    `;
    
    let params = [];
    
    if (filter === 'root') {
        query += " WHERE t.parent_id IS NULL";
    } else if (filter === 'subtasks') {
        query += " WHERE t.parent_id IS NOT NULL";
    }
    
    query += " ORDER BY t.created_at DESC";
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Convert children_list string to array
        const tasks = rows.map(row => {
            const task = { ...row };
            if (row.children_list) {
                task.children = row.children_list.split(',').map(id => parseInt(id));
            } else {
                task.children = [];
            }
            return task;
        });
        
        res.json(tasks);
    });
});

// Get a specific task
app.get('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    
    db.get(
        `SELECT *, 
         (SELECT GROUP_CONCAT(child.id) FROM tasks child WHERE child.parent_id = ?) AS children_list
         FROM tasks WHERE id = ?`,
        [id, id], 
        (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (row) {
                if (row.children_list) {
                    row.children = row.children_list.split(',').map(id => parseInt(id));
                } else {
                    row.children = [];
                }
            }
            
            res.json(row);
        }
    );
});

// Create a new task
app.post('/api/tasks', (req, res) => {
    const { title, author, description, parentId, status, priority, assignee } = req.body;
    
    const stmt = db.prepare(`
        INSERT INTO tasks (title, author, description, parent_id, status, priority, assignee)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([title, author, description, parentId, status, priority, assignee], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Add history entry
        const historyStmt = db.prepare(`
            INSERT INTO history (task_id, user, action)
            VALUES (?, ?, ?)
        `);
        historyStmt.run([this.lastID, author, "Создал задачу"], function(err) {
            if (err) {
                console.error(err.message);
            }
        });
        historyStmt.finalize();
        
        // Return the created task
        db.get("SELECT * FROM tasks WHERE id = ?", [this.lastID], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (row.children_list) {
                row.children = row.children_list.split(',').map(id => parseInt(id));
            } else {
                row.children = [];
            }
            
            res.status(201).json(row);
        });
    });
    
    stmt.finalize();
});

// Update a task
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { title, author, description, parentId, status, priority, assignee } = req.body;
    
    const stmt = db.prepare(`
        UPDATE tasks 
        SET title = ?, author = ?, description = ?, parent_id = ?, status = ?, priority = ?, assignee = ?
        WHERE id = ?
    `);
    
    stmt.run([title, author, description, parentId, status, priority, assignee, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        
        // Add history entry
        const historyStmt = db.prepare(`
            INSERT INTO history (task_id, user, action)
            VALUES (?, ?, ?)
        `);
        historyStmt.run([id, author || 'System', "Обновил задачу"], function(err) {
            if (err) {
                console.error(err.message);
            }
        });
        historyStmt.finalize();
        
        // Return the updated task
        db.get("SELECT * FROM tasks WHERE id = ?", [id], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (row.children_list) {
                row.children = row.children_list.split(',').map(childId => parseInt(childId));
            } else {
                row.children = [];
            }
            
            res.json(row);
        });
    });
    
    stmt.finalize();
});

// Delete a task
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    
    // First get the task to include in history
    db.get("SELECT * FROM tasks WHERE id = ?", [id], (err, task) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        
        // Add history entry
        const historyStmt = db.prepare(`
            INSERT INTO history (task_id, user, action)
            VALUES (?, ?, ?)
        `);
        historyStmt.run([id, task.author, "Удалил задачу"], function(err) {
            if (err) {
                console.error(err.message);
            }
        });
        historyStmt.finalize();
        
        // Delete the task
        db.run("DELETE FROM tasks WHERE id = ?", [id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            res.json({ message: 'Task deleted successfully' });
        });
    });
});

// Get task history
app.get('/api/tasks/:id/history', (req, res) => {
    const { id } = req.params;
    
    db.all(
        "SELECT * FROM history WHERE task_id = ? ORDER BY timestamp DESC",
        [id],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Get comments for a task
app.get('/api/tasks/:id/comments', (req, res) => {
    const { id } = req.params;
    
    db.all(
        "SELECT * FROM comments WHERE task_id = ? ORDER BY timestamp ASC",
        [id],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Add a comment to a task
app.post('/api/tasks/:id/comments', (req, res) => {
    const { id } = req.params;
    const { text, user } = req.body;
    
    const stmt = db.prepare(`
        INSERT INTO comments (task_id, text, user)
        VALUES (?, ?, ?)
    `);
    
    stmt.run([id, text, user], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Return the created comment
        db.get("SELECT * FROM comments WHERE id = ?", [this.lastID], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json(row);
        });
    });
    
    stmt.finalize();
});

// Get all team members
app.get('/api/team-members', (req, res) => {
    db.all("SELECT * FROM team_members ORDER BY name", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows.map(row => row.name));
    });
});

// Status options endpoint
app.get('/api/status-options', (req, res) => {
    res.json([
        { value: "new", label: "Новая" },
        { value: "in-progress", label: "В работе" },
        { value: "completed", label: "Завершена" },
        { value: "blocked", label: "Заблокирована" }
    ]);
});

// Priority options endpoint
app.get('/api/priority-options', (req, res) => {
    res.json([
        { value: "low", label: "Низкий" },
        { value: "medium", label: "Средний" },
        { value: "high", label: "Высокий" },
        { value: "critical", label: "Критический" }
    ]);
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});