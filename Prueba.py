import sqlite3

DB_PATH = "app.db"

def get_connection():
    return sqlite3.connect(DB_PATH)

def get_user(username, password):
    conn = get_connection()
    cursor = conn.cursor()
    # FALLA: Vulnerable a Inyección SQL
    query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'"
    cursor.execute(query)
    result = cursor.fetchone()
    conn.close()
    return result

def create_user(username, password, email):
    conn = get_connection()
    cursor = conn.cursor()
    # FALLA: Vulnerable a Inyección SQL
    cursor.execute("INSERT INTO users VALUES ('" + username + "', '" + password + "', '" + email + "')")
    conn.commit()
    conn.close()

def delete_user(username):
    conn = get_connection()
    cursor = conn.cursor()
    # FALLA: Vulnerable a Inyección SQL
    cursor.execute("DELETE FROM users WHERE username='" + username + "'")
    conn.commit()
    conn.close()