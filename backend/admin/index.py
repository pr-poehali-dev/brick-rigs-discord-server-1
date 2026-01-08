'''Админ-панель для управления пользователями, ролями и фракциями'''
import json
import os
import hashlib
from datetime import datetime, date
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def verify_admin(user_id: int, conn) -> dict:
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT id, username, admin_role FROM users WHERE id = %s AND admin_role IS NOT NULL", (user_id,))
    admin = cur.fetchone()
    cur.close()
    return dict(admin) if admin else None

def verify_admin_code(code: str, conn) -> bool:
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM admin_codes WHERE code = %s AND valid_date >= %s", (code, date.today()))
    result = cur.fetchone()
    cur.close()
    return result is not None

def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Id, X-Admin-Code'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        conn = get_db_connection()
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        headers = event.get('headers', {})
        path = event.get('queryStringParameters', {}).get('action', '')
        
        admin_id = headers.get('x-admin-id') or headers.get('X-Admin-Id')
        admin_code = headers.get('x-admin-code') or headers.get('X-Admin-Code')
        
        # Проверка прав администратора
        if not admin_id:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Admin ID required'}),
                'isBase64Encoded': False
            }
        
        admin = verify_admin(int(admin_id), conn)
        if not admin:
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Not authorized'}),
                'isBase64Encoded': False
            }
        
        # Проверка админ-кода (кроме главного админа TOURIST_WAGNERA)
        if admin['username'] != 'TOURIST_WAGNERA':
            if not admin_code or not verify_admin_code(admin_code, conn):
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid or expired admin code'}),
                    'isBase64Encoded': False
                }
        
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Получение всех пользователей
        if path == 'users' and method == 'GET':
            cur.execute("""
                SELECT u.id, u.username, u.admin_role, u.status, u.rank_level, 
                       u.is_banned, u.is_muted, f.name as faction_name
                FROM users u
                LEFT JOIN factions f ON u.faction_id = f.id
                ORDER BY u.created_at DESC
            """)
            users = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'users': [dict(u) for u in users]}),
                'isBase64Encoded': False
            }
        
        # Бан пользователя
        elif path == 'ban' and method == 'POST':
            user_id = body.get('userId')
            cur.execute("UPDATE users SET is_banned = TRUE WHERE id = %s", (user_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'User banned'}),
                'isBase64Encoded': False
            }
        
        # Мут пользователя
        elif path == 'mute' and method == 'POST':
            user_id = body.get('userId')
            cur.execute("UPDATE users SET is_muted = TRUE WHERE id = %s", (user_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'User muted'}),
                'isBase64Encoded': False
            }
        
        # Создание кастомной роли
        elif path == 'create-role' and method == 'POST':
            name = body.get('name')
            description = body.get('description', '')
            color = body.get('color', '#FFFFFF')
            
            cur.execute(
                "INSERT INTO roles (name, description, color, is_custom, created_by_admin_id) VALUES (%s, %s, %s, TRUE, %s) RETURNING *",
                (name, description, color, admin_id)
            )
            role = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'role': dict(role)}),
                'isBase64Encoded': False
            }
        
        # Выдача роли пользователю
        elif path == 'assign-role' and method == 'POST':
            user_id = body.get('userId')
            role_id = body.get('roleId')
            
            cur.execute(
                "INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (user_id, role_id)
            )
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Role assigned'}),
                'isBase64Encoded': False
            }
        
        # Получение всех ролей
        elif path == 'roles' and method == 'GET':
            cur.execute("SELECT * FROM roles ORDER BY is_custom, name")
            roles = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'roles': [dict(r) for r in roles]}),
                'isBase64Encoded': False
            }
        
        # Получение всех фракций
        elif path == 'factions' and method == 'GET':
            cur.execute("""
                SELECT f.*, u.username as general_name 
                FROM factions f
                LEFT JOIN users u ON f.general_user_id = u.id
                ORDER BY 
                    CASE f.type 
                        WHEN 'открытая' THEN 1 
                        WHEN 'закрытая' THEN 2 
                        WHEN 'криминальная' THEN 3 
                    END, f.name
            """)
            factions = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'factions': [dict(f) for f in factions]}),
                'isBase64Encoded': False
            }
        
        # Обновление статуса пользователя
        elif path == 'update-status' and method == 'PUT':
            user_id = body.get('userId')
            status = body.get('status')
            
            cur.execute("UPDATE users SET status = %s WHERE id = %s", (status, user_id))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Status updated'}),
                'isBase64Encoded': False
            }
        
        # Назначить пользователя в фракцию
        elif path == 'assign-faction' and method == 'POST':
            user_id = body.get('userId')
            faction_id = body.get('factionId')
            
            cur.execute("UPDATE users SET faction_id = %s WHERE id = %s", (faction_id, user_id))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Faction assigned'}),
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
