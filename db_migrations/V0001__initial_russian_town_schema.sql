-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    discord_link VARCHAR(255),
    avatar_url VARCHAR(500),
    status VARCHAR(100) DEFAULT 'Новичок',
    custom_status VARCHAR(200),
    experience INT DEFAULT 0,
    rank_level INT DEFAULT 1,
    admin_role VARCHAR(50) CHECK (admin_role IN ('младший администратор', 'администратор', 'старший администратор')),
    faction_id INT,
    is_banned BOOLEAN DEFAULT FALSE,
    is_muted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы фракций
CREATE TABLE IF NOT EXISTS factions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) CHECK (type IN ('открытая', 'закрытая', 'криминальная')) NOT NULL,
    description TEXT,
    general_user_id INT,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы ролей
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7),
    is_custom BOOLEAN DEFAULT FALSE,
    created_by_admin_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы связи пользователей и ролей (многие ко многим)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT REFERENCES users(id),
    role_id INT REFERENCES roles(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- Создание таблицы постов форума
CREATE TABLE IF NOT EXISTS forum_posts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'общее',
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы комментариев к постам
CREATE TABLE IF NOT EXISTS forum_comments (
    id SERIAL PRIMARY KEY,
    post_id INT REFERENCES forum_posts(id),
    user_id INT REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы админ-кодов
CREATE TABLE IF NOT EXISTS admin_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    valid_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы новостей
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author_id INT REFERENCES users(id),
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы галереи
CREATE TABLE IF NOT EXISTS gallery (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    image_url VARCHAR(500) NOT NULL,
    title VARCHAR(200),
    description TEXT,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставка фракций
INSERT INTO factions (name, type, description, color) VALUES
('МВД', 'открытая', 'Министерство внутренних дел', '#1E3A8A'),
('СОБР', 'открытая', 'Специальный отряд быстрого реагирования', '#DC143C'),
('ДПС', 'открытая', 'Дорожно-патрульная служба', '#FFD700'),
('Росгвардия', 'открытая', 'Российская национальная гвардия', '#8B0000'),
('ЦОДД', 'открытая', 'Центр организации дорожного движения', '#FF8C00'),
('Армия', 'открытая', 'Вооружённые силы', '#228B22'),
('ССО', 'закрытая', 'Силы специальных операций', '#000000'),
('СБП', 'закрытая', 'Служба безопасности президента', '#4B0082'),
('ФСБ', 'закрытая', 'Федеральная служба безопасности', '#2F4F4F'),
('ФСО', 'закрытая', 'Федеральная служба охраны', '#191970'),
('ОПГ Тёмного', 'криминальная', 'Криминальная группировка', '#800020'),
('ОПГ Красное', 'криминальная', 'Криминальная группировка', '#8B0000'),
('Тамбовское ОПГ', 'криминальная', 'Криминальная группировка', '#4B0000');

-- Вставка базовых ролей
INSERT INTO roles (name, description, color, is_custom) VALUES
('МВД', 'Сотрудник МВД', '#1E3A8A', FALSE),
('СОБР', 'Боец СОБР', '#DC143C', FALSE),
('ДПС', 'Инспектор ДПС', '#FFD700', FALSE),
('Росгвардия', 'Боец Росгвардии', '#8B0000', FALSE),
('ЦОДД', 'Сотрудник ЦОДД', '#FF8C00', FALSE),
('Армия', 'Военнослужащий', '#228B22', FALSE),
('ССО', 'Боец ССО', '#000000', FALSE),
('СБП', 'Сотрудник СБП', '#4B0082', FALSE),
('ФСБ', 'Офицер ФСБ', '#2F4F4F', FALSE),
('ФСО', 'Сотрудник ФСО', '#191970', FALSE),
('Преступник', 'Член ОПГ', '#800020', FALSE);

-- Вставка первого админ-кода
INSERT INTO admin_codes (code, valid_date) VALUES ('99797', CURRENT_DATE);

-- Создание главного администратора TOURIST_WAGNERA (временный хеш, будет обновлен через backend)
INSERT INTO users (username, password_hash, admin_role, status, faction_id, discord_link) 
VALUES ('TOURIST_WAGNERA', 'temp_hash_will_be_set', 'старший администратор', 'Создатель сервера', 5, 'https://discord.gg/RuBxnxyEV5');

-- Создание других администраторов
INSERT INTO users (username, password_hash, admin_role, status) VALUES
('Pancake', 'temp_hash', 'старший администратор', 'Генерал Армии'),
('Cailon86', 'temp_hash', 'администратор', 'Генерал Полиции'),
('Cj', 'temp_hash', 'младший администратор', 'Модератор'),
('gotnevl', 'temp_hash', 'администратор', 'Модератор');

-- Обновление генералов фракций
UPDATE factions SET general_user_id = (SELECT id FROM users WHERE username = 'TOURIST_WAGNERA') WHERE name = 'ЦОДД';
UPDATE factions SET general_user_id = (SELECT id FROM users WHERE username = 'Cailon86') WHERE name = 'МВД';
UPDATE factions SET general_user_id = (SELECT id FROM users WHERE username = 'Pancake') WHERE name = 'Армия';

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_faction ON users(faction_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON forum_comments(post_id);