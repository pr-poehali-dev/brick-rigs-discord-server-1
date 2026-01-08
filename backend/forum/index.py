'''API для форума с постами и комментариями'''
import json
import os
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        path = event.get('queryStringParameters', {}).get('action', '')
        
        # Получить все посты
        if path == 'posts' and method == 'GET':
            category = event.get('queryStringParameters', {}).get('category')
            
            if category:
                cur.execute("""
                    SELECT p.id, p.user_id, p.title, p.content, p.category, p.likes,
                           u.username, u.avatar_url, u.admin_role
                    FROM forum_posts p
                    JOIN users u ON p.user_id = u.id
                    WHERE p.category = %s
                    ORDER BY p.created_at DESC
                """, (category,))
            else:
                cur.execute("""
                    SELECT p.id, p.user_id, p.title, p.content, p.category, p.likes,
                           u.username, u.avatar_url, u.admin_role
                    FROM forum_posts p
                    JOIN users u ON p.user_id = u.id
                    ORDER BY p.created_at DESC
                """)
            
            posts = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'posts': [dict(p) for p in posts]}),
                'isBase64Encoded': False
            }
        
        # Создать пост
        elif path == 'create-post' and method == 'POST':
            user_id = body.get('userId')
            title = body.get('title')
            content = body.get('content')
            category = body.get('category', 'общее')
            
            cur.execute(
                "INSERT INTO forum_posts (user_id, title, content, category) VALUES (%s, %s, %s, %s) RETURNING id, user_id, title, content, category, likes",
                (user_id, title, content, category)
            )
            post = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'post': dict(post)}),
                'isBase64Encoded': False
            }
        
        # Получить комментарии к посту
        elif path == 'comments' and method == 'GET':
            post_id = event.get('queryStringParameters', {}).get('postId')
            
            cur.execute("""
                SELECT c.id, c.post_id, c.user_id, c.content,
                       u.username, u.avatar_url
                FROM forum_comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = %s
                ORDER BY c.created_at ASC
            """, (post_id,))
            
            comments = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'comments': [dict(c) for c in comments]}),
                'isBase64Encoded': False
            }
        
        # Добавить комментарий
        elif path == 'add-comment' and method == 'POST':
            user_id = body.get('userId')
            post_id = body.get('postId')
            content = body.get('content')
            
            cur.execute(
                "INSERT INTO forum_comments (post_id, user_id, content) VALUES (%s, %s, %s) RETURNING id, post_id, user_id, content",
                (post_id, user_id, content)
            )
            comment = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'comment': dict(comment)}),
                'isBase64Encoded': False
            }
        
        # Лайк поста
        elif path == 'like-post' and method == 'POST':
            post_id = body.get('postId')
            
            cur.execute("UPDATE forum_posts SET likes = likes + 1 WHERE id = %s RETURNING likes", (post_id,))
            result = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'likes': result['likes']}),
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