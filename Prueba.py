import sqlite3
import os
import pickle
import hashlib

# FALLA 1: Credenciales "Hardcoded" (quemadas en el código)
DB_USER = "admin_super_secret"
DB_PASS = "P4ssw0rd_12345!"

def login_usuario():
    print("--- Inicio de Sesión ---")
    username = input("Usuario: ")
    password = input("Contraseña: ")

    # FALLA 2: Inyección SQL (Uso de f-strings en queries)
    # Un atacante podría usar: ' OR '1'='1
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    
    conn = sqlite3.connect("usuarios.db")
    cursor = conn.cursor()
    
    print(f"Ejecutando: {query}") # FALLA 3: Logueo de información sensible
    cursor.execute(query)
    user = cursor.fetchone()
    
    if user:
        print(f"Bienvenido, {user[1]}")
        menu_sistema(user)
    else:
        print("Acceso denegado.")

def menu_sistema(user):
    print("\n1. Ver archivos del sistema")
    print("2. Cargar perfil (Backup)")
    opcion = input("Selecciona: ")

    if opcion == "1":
        nombre_archivo = input("Nombre del archivo a leer: ")
        # FALLA 4: Inyección de Comandos (Uso de os.system con input directo)
        # Un atacante podría poner: archivo.txt; rm -rf /
        os.system(f"cat storage/{nombre_archivo}")

    elif opcion == "2":
        datos_binarios = input("Pega aquí el código de tu backup (hex): ")
        # FALLA 5: Deserialización insegura (Uso de pickle con datos del usuario)
        # Esto permite ejecución remota de código (RCE)
        data = pickle.loads(bytes.fromhex(datos_binarios))
        print(f"Perfil cargado: {data}")

def crear_usuario(username, password):
    # FALLA 6: Uso de algoritmos de hashing débiles (MD5)
    hash_password = hashlib.md5(password.encode()).hexdigest()
    
    # Simulación de guardado
    print(f"Usuario {username} creado con hash: {hash_password}")

if __name__ == "__main__":
    login_usuario()