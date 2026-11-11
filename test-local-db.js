const { execSync } = require('child_process');
execSync('sqlite3 cookwiki.db "SELECT * FROM sqlite_master WHERE type=\'table\'"');
