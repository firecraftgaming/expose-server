CREATE TABLE IF NOT EXISTS subdomains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subdomain STRING NOT NULL,
    created_at DATETIME,
    updated_at DATETIME
)
