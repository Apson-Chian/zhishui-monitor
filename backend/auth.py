"""Password accounts and revocable, hashed sessions; no plaintext credentials stored."""
import hashlib
import hmac
import re
import secrets
import time
from contextlib import closing
import records

SESSION_SECONDS = 7 * 86400
SCHEMA = '''
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (identity TEXT NOT NULL, at INTEGER NOT NULL);
'''

class AuthError(ValueError):
    pass


def connect():
    db = records.connect()
    db.executescript(SCHEMA)
    return db


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def resolve(token):
    with closing(connect()) as db:
        row = db.execute('SELECT users.id, username FROM sessions JOIN users ON users.id=user_id '
                         'WHERE token_hash=? AND expires>?', (digest(token), int(time.time()))).fetchone()
    if not row:
        raise AuthError('登录已过期，请重新登录。')
    return row


def sign_in(username, password, register, client):
    if not isinstance(username, str) or not re.fullmatch(r'[A-Za-z0-9_-]{3,32}', username):
        raise AuthError('用户名需为 3–32 位字母、数字、下划线或短横线。')
    if not isinstance(password, str) or not 10 <= len(password) <= 128:
        raise AuthError('密码需为 10–128 个字符。')
    username = username.lower()
    now = int(time.time())
    with closing(connect()) as db, db:
        db.execute('BEGIN IMMEDIATE')
        db.execute('DELETE FROM login_attempts WHERE at<?', (now-900,))
        if db.execute('SELECT COUNT(*) FROM login_attempts WHERE identity=?', (digest(client),)).fetchone()[0] >= 15:
            raise AuthError('尝试过于频繁，请 15 分钟后再试。')
        db.execute('INSERT INTO login_attempts VALUES (?,?)', (digest(client), now))
    with closing(connect()) as db, db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT id,salt,password_hash FROM users WHERE username=?', (username,)).fetchone()
        salt = row[1] if row else secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 600000).hex()
        if register:
            if row:
                raise AuthError('无法注册此用户名，请更换用户名或登录。')
            user_id = secrets.token_hex(32)
            db.execute('INSERT INTO users VALUES (?,?,?,?)', (user_id, username, salt, hashed))
        else:
            if not row or not hmac.compare_digest(row[2], hashed):
                raise AuthError('用户名或密码不正确。')
            user_id = row[0]
        token = secrets.token_urlsafe(32)
        db.execute('DELETE FROM sessions WHERE expires<=?', (now,))
        db.execute('INSERT INTO sessions VALUES (?,?,?)', (digest(token), user_id, now+SESSION_SECONDS))
        return token


def revoke(token):
    with closing(connect()) as db, db:
        db.execute('DELETE FROM sessions WHERE token_hash=?', (digest(token),))
