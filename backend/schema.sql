-- SQLite business records. usage.sqlite3 remains a separate quota database.
CREATE TABLE IF NOT EXISTS record_collections (
    owner_hash TEXT NOT NULL CHECK(length(owner_hash) = 64),
    domain TEXT NOT NULL CHECK(domain IN ('ledger', 'pollution', 'experience')),
    revision INTEGER NOT NULL CHECK(revision > 0),
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (owner_hash, domain)
);

CREATE TABLE IF NOT EXISTS record_entries (
    owner_hash TEXT NOT NULL,
    domain TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK(position >= 0),
    payload TEXT NOT NULL,
    PRIMARY KEY (owner_hash, domain, entry_id),
    UNIQUE (owner_hash, domain, position),
    FOREIGN KEY (owner_hash, domain) REFERENCES record_collections(owner_hash, domain) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS record_collections_expiry ON record_collections(updated_at);
