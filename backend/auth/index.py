'''API для авторизации и управления пользователями Russian Town'''
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_urlsafe(32)

def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Token'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        path = event.get('queryStringParameters', {}).get('action', '')
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Регистрация
        if path == 'register' and method == 'POST':
            username = body.get('username')
            password = body.get('password')
            
            if not username or not password:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Username and password required'}),
                    'isBase64Encoded': False
                }
            
            password_hash = hash_password(password)
            
            try:
                cur.execute(
                    "INSERT INTO users (username, password_hash) VALUES (%s, %s) RETURNING id, username, status, rank_level",
                    (username, password_hash)
                )
                user = cur.fetchone()
                conn.commit()
                
                token = generate_token()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'user': dict(user),
                        'token': token
                    }),
                    'isBase64Encoded': False
                }
            except psycopg2.IntegrityError:
                conn.rollback()
                return {
                    'statusCode': 409,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Username already exists'}),
                    'isBase64Encoded': False
                }
        
        # Вход
        elif path == 'login' and method == 'POST':
            username = body.get('username')
            password = body.get('password')
            
            password_hash = hash_password(password)
            
            cur.execute(
                "SELECT id, username, admin_role, status, rank_level, faction_id, avatar_url, custom_status, is_banned FROM users WHERE username = %s AND password_hash = %s",
                (username, password_hash)
            )
            user = cur.fetchone()
            
            if not user:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid credentials'}),
                    'isBase64Encoded': False
                }
            
            if user['is_banned']:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Account is banned'}),
                    'isBase64Encoded': False
                }
            
            token = generate_token()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'user': dict(user),
                    'token': token
                }),
                'isBase64Encoded': False
            }
        
        # Получение профиля
        elif path == 'profile' and method == 'GET':
            user_id = event.get('queryStringParameters', {}).get('userId')
            
            cur.execute("""
                SELECT u.id, u.username, u.admin_role, u.status, u.custom_status, 
                       u.rank_level, u.experience, u.avatar_url, u.discord_link,
                       f.name as faction_name, f.color as faction_color
                FROM users u
                LEFT JOIN factions f ON u.faction_id = f.id
                WHERE u.id = %s
            """, (user_id,))
            
            user = cur.fetchone()
            
            if not user:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User not found'}),
                    'isBase64Encoded': False
                }
            
            # Получение ролей пользователя
            cur.execute("""
                SELECT r.name, r.color 
                FROM roles r
                JOIN user_roles ur ON r.id = ur.role_id
                WHERE ur.user_id = %s
            """, (user_id,))
            roles = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'user': dict(user),
                    'roles': [dict(r) for r in roles]
                }),
                'isBase64Encoded': False
            }
        
        # Обновление профиля
        elif path == 'update-profile' and method == 'PUT':
            user_id = body.get('userId')
            custom_status = body.get('customStatus')
            avatar_url = body.get('avatarUrl')
            
            updates = []
            params = []
            
            if custom_status is not None:
                updates.append("custom_status = %s")
                params.append(custom_status)
            
            if avatar_url is not None:
                updates.append("avatar_url = %s")
                params.append(avatar_url)
            
            if updates:
                params.append(user_id)
                cur.execute(
                    f"UPDATE users SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *",
                    params
                )
                user = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'user': dict(user)}),
                    'isBase64Encoded': False
                }
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Endpoint not found'}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
