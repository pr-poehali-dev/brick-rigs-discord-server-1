import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_URLS = {
  auth: 'https://functions.poehali.dev/62fd37d2-dd57-4aff-917e-f6e0383e053a',
  admin: 'https://functions.poehali.dev/c4d39ba1-426b-4d95-a69e-665aab9bb8a5',
  forum: 'https://functions.poehali.dev/02f07658-38aa-47be-a11b-1292bb92d87e'
};

interface User {
  id: number;
  username: string;
  admin_role?: string;
  status?: string;
  rank_level?: number;
  faction_name?: string;
  custom_status?: string;
  avatar_url?: string;
}

interface Faction {
  id: number;
  name: string;
  type: string;
  description: string;
  color: string;
  general_name?: string;
}

interface ForumPost {
  id: number;
  title: string;
  content: string;
  username: string;
  admin_role?: string;
  likes: number;
  category: string;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [factions, setFactions] = useState<Faction[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('russian_town_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    loadFactions();
    loadForumPosts();
  }, []);

  const loadFactions = async () => {
    try {
      const response = await fetch(`${API_URLS.admin}/?action=factions`, {
        headers: { 'X-Admin-Id': '1' }
      });
      const data = await response.json();
      if (data.factions) setFactions(data.factions);
    } catch (error) {
      console.error('Failed to load factions:', error);
    }
  };

  const loadForumPosts = async () => {
    try {
      const response = await fetch(`${API_URLS.forum}/?action=posts`);
      const data = await response.json();
      if (data.posts) setForumPosts(data.posts);
    } catch (error) {
      console.error('Failed to load forum posts:', error);
    }
  };

  const handleAuth = async () => {
    try {
      const action = isLogin ? 'login' : 'register';
      const response = await fetch(`${API_URLS.auth}/?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.user) {
        setUser(data.user);
        localStorage.setItem('russian_town_user', JSON.stringify(data.user));
        localStorage.setItem('russian_town_token', data.token);
        setShowAuth(false);
        toast({ title: `Добро пожаловать, ${data.user.username}!` });
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка подключения', variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('russian_town_user');
    localStorage.removeItem('russian_town_token');
    toast({ title: 'Вы вышли из аккаунта' });
  };

  const handleCreatePost = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_URLS.forum}/?action=create-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: postTitle,
          content: postContent,
          category: 'общее'
        })
      });
      
      if (response.ok) {
        toast({ title: 'Пост создан!' });
        setShowCreatePost(false);
        setPostTitle('');
        setPostContent('');
        loadForumPosts();
      }
    } catch (error) {
      toast({ title: 'Ошибка создания поста', variant: 'destructive' });
    }
  };

  const loadAllUsers = async () => {
    if (!user?.admin_role) return;
    
    try {
      const response = await fetch(`${API_URLS.admin}/?action=users`, {
        headers: { 
          'X-Admin-Id': user.id.toString(),
          'X-Admin-Code': adminCode
        }
      });
      const data = await response.json();
      if (data.users) setAllUsers(data.users);
    } catch (error) {
      toast({ title: 'Ошибка загрузки пользователей', variant: 'destructive' });
    }
  };

  const openFactionsByType = factions.filter(f => f.type === 'открытая');
  const closedFactions = factions.filter(f => f.type === 'закрытая');
  const criminalFactions = factions.filter(f => f.type === 'криминальная');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Castle" className="text-primary-foreground" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Russian Town</h1>
              <p className="text-sm text-muted-foreground">Brick Rigs RP сервер</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href="https://discord.gg/RuBxnxyEV5" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition-colors"
            >
              <Icon name="MessageSquare" size={20} />
              <span className="font-medium">Discord</span>
            </a>
            
            {user ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowProfile(true)}>
                  <Icon name="User" size={18} className="mr-2" />
                  {user.username}
                </Button>
                {user.admin_role && (
                  <Button onClick={() => setShowAdminPanel(true)} className="bg-accent text-accent-foreground">
                    <Icon name="Shield" size={18} className="mr-2" />
                    Админ-панель
                  </Button>
                )}
                <Button variant="ghost" onClick={handleLogout}>
                  <Icon name="LogOut" size={18} />
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowAuth(true)} className="bg-primary text-primary-foreground">
                <Icon name="LogIn" size={18} className="mr-2" />
                Войти
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Добро пожаловать в Russian Town
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Лучший ролевой сервер Brick Rigs. Выбери свою фракцию и начни карьеру!
          </p>
        </div>

        <Tabs defaultValue="factions" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="factions">
              <Icon name="Users" size={18} className="mr-2" />
              Фракции
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Icon name="ScrollText" size={18} className="mr-2" />
              Правила
            </TabsTrigger>
            <TabsTrigger value="news">
              <Icon name="Newspaper" size={18} className="mr-2" />
              Новости
            </TabsTrigger>
            <TabsTrigger value="forum">
              <Icon name="MessagesSquare" size={18} className="mr-2" />
              Форум
            </TabsTrigger>
          </TabsList>

          <TabsContent value="factions" className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Building2" className="text-secondary" />
                Открытые фракции
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openFactionsByType.map(faction => (
                  <Card key={faction.id} className="p-5 hover:shadow-lg transition-shadow border-l-4" style={{ borderLeftColor: faction.color }}>
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-xl font-bold" style={{ color: faction.color }}>{faction.name}</h4>
                      <Badge variant="outline" className="bg-secondary/20">Открыто</Badge>
                    </div>
                    <p className="text-muted-foreground mb-3">{faction.description}</p>
                    {faction.general_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Icon name="Crown" size={16} className="text-accent" />
                        <span>Генерал: <strong>{faction.general_name}</strong></span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Lock" className="text-muted-foreground" />
                Закрытые фракции
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {closedFactions.map(faction => (
                  <Card key={faction.id} className="p-5 hover:shadow-lg transition-shadow border-l-4 opacity-80" style={{ borderLeftColor: faction.color }}>
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-xl font-bold" style={{ color: faction.color }}>{faction.name}</h4>
                      <Badge variant="secondary">Закрыто</Badge>
                    </div>
                    <p className="text-muted-foreground">{faction.description}</p>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Skull" className="text-destructive" />
                Криминальные структуры
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {criminalFactions.map(faction => (
                  <Card key={faction.id} className="p-5 hover:shadow-lg transition-shadow border-l-4 bg-destructive/5" style={{ borderLeftColor: faction.color }}>
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-xl font-bold" style={{ color: faction.color }}>{faction.name}</h4>
                      <Badge variant="destructive">Криминал</Badge>
                    </div>
                    <p className="text-muted-foreground">{faction.description}</p>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rules">
            <Card className="p-8">
              <h3 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Icon name="ScrollText" className="text-primary" size={32} />
                Правила сервера Russian Town
              </h3>
              <div className="space-y-4 text-foreground">
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">1</Badge>
                  <p>Уважайте других игроков. Запрещены оскорбления, угрозы и дискриминация.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">2</Badge>
                  <p>Играйте в соответствии с ролью вашей фракции. RDM/VDM строго запрещены.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">3</Badge>
                  <p>Запрещено использование читов, эксплойтов и багов игры.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">4</Badge>
                  <p>Слушайте администрацию сервера. Их решения окончательны.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">5</Badge>
                  <p>Запрещено спамить в чате и использовать капс.</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="news">
            <div className="space-y-6">
              <Card className="p-6 border-l-4 border-l-primary">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-2xl font-bold">🎉 Сервер Russian Town запущен!</h3>
                  <Badge>Новое</Badge>
                </div>
                <p className="text-muted-foreground mb-4">
                  Приветствуем всех игроков на нашем новом RP сервере! Мы создали уникальный игровой опыт с реалистичными фракциями, 
                  системой рангов и увлекательным геймплеем.
                </p>
                <p className="text-sm text-muted-foreground">Опубликовано: Сегодня</p>
              </Card>

              <Card className="p-6">
                <h3 className="text-2xl font-bold mb-3">📋 Набор в фракции открыт</h3>
                <p className="text-muted-foreground mb-4">
                  Все открытые фракции ведут активный набор новых бойцов. Подайте заявку через Discord или на форуме!
                </p>
                <p className="text-sm text-muted-foreground">Опубликовано: Сегодня</p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="forum">
            <div className="space-y-6">
              {user && (
                <div className="flex justify-end">
                  <Button onClick={() => setShowCreatePost(true)} className="bg-primary">
                    <Icon name="Plus" size={18} className="mr-2" />
                    Создать пост
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {forumPosts.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Icon name="MessageSquare" size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Пока нет постов. Будь первым!</p>
                  </Card>
                ) : (
                  forumPosts.map(post => (
                    <Card key={post.id} className="p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold">{post.title}</h3>
                        <Badge variant="outline">{post.category}</Badge>
                      </div>
                      <p className="text-foreground mb-4">{post.content}</p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Icon name="User" size={16} />
                          <span>{post.username}</span>
                          {post.admin_role && (
                            <Badge variant="secondary" className="text-xs">{post.admin_role}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <button className="flex items-center gap-1 hover:text-primary transition-colors">
                            <Icon name="Heart" size={16} />
                            <span>{post.likes}</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-primary transition-colors">
                            <Icon name="MessageCircle" size={16} />
                            <span>Ответить</span>
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isLogin ? 'Вход' : 'Регистрация'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Имя пользователя</Label>
              <Input 
                id="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите ваш никнейм"
              />
            </div>
            <div>
              <Label htmlFor="password">Пароль</Label>
              <Input 
                id="password" 
                type="password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
              />
            </div>
            <Button onClick={handleAuth} className="w-full bg-primary">
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </Button>
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новый пост</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="postTitle">Заголовок</Label>
              <Input 
                id="postTitle" 
                value={postTitle} 
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="О чём ваш пост?"
              />
            </div>
            <div>
              <Label htmlFor="postContent">Содержание</Label>
              <Textarea 
                id="postContent" 
                value={postContent} 
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Расскажите подробнее..."
                rows={6}
              />
            </div>
            <Button onClick={handleCreatePost} className="w-full bg-primary">
              <Icon name="Send" size={18} className="mr-2" />
              Опубликовать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Профиль</DialogTitle>
          </DialogHeader>
          {user && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <Icon name="User" size={32} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{user.username}</h3>
                  <p className="text-sm text-muted-foreground">{user.status || 'Игрок'}</p>
                </div>
              </div>
              {user.admin_role && (
                <Badge variant="secondary" className="w-fit">
                  <Icon name="Shield" size={14} className="mr-1" />
                  {user.admin_role}
                </Badge>
              )}
              {user.faction_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Users" size={16} />
                  <span>Фракция: <strong>{user.faction_name}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Icon name="Star" size={16} className="text-accent" />
                <span>Ранг: <strong>{user.rank_level || 1}</strong></span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminPanel} onOpenChange={setShowAdminPanel}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Shield" className="text-accent" />
              Админ-панель Russian Town
            </DialogTitle>
          </DialogHeader>
          {user?.admin_role && (
            <div className="space-y-4">
              {user.username !== 'TOURIST_WAGNERA' && (
                <div>
                  <Label htmlFor="adminCode">Админ-код (обновляется ежедневно)</Label>
                  <Input 
                    id="adminCode" 
                    value={adminCode} 
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="Введите сегодняшний админ-код"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Первый код: 99797</p>
                </div>
              )}
              
              <Button onClick={loadAllUsers} className="w-full">
                <Icon name="RefreshCw" size={18} className="mr-2" />
                Загрузить пользователей
              </Button>

              {allUsers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Все пользователи ({allUsers.length})</h4>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {allUsers.map(u => (
                      <Card key={u.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{u.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {u.admin_role ? `🛡️ ${u.admin_role}` : u.status}
                              {u.faction_name && ` • ${u.faction_name}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {u.is_banned ? (
                              <Badge variant="destructive">Забанен</Badge>
                            ) : u.is_muted ? (
                              <Badge variant="secondary">Мут</Badge>
                            ) : (
                              <Badge variant="outline">Активен</Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Администрация сервера</h4>
                <div className="space-y-2">
                  <Card className="p-3 bg-accent/10">
                    <p className="font-medium">👑 TOURIST_WAGNERA</p>
                    <p className="text-xs text-muted-foreground">Старший администратор • Генерал ЦОДД</p>
                  </Card>
                  <Card className="p-3 bg-accent/10">
                    <p className="font-medium">🛡️ Pancake</p>
                    <p className="text-xs text-muted-foreground">Старший администратор • Генерал Армии</p>
                  </Card>
                  <Card className="p-3">
                    <p className="font-medium">⭐ gotnevl</p>
                    <p className="text-xs text-muted-foreground">Администратор</p>
                  </Card>
                  <Card className="p-3">
                    <p className="font-medium">📋 Cj</p>
                    <p className="text-xs text-muted-foreground">Младший администратор</p>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <footer className="border-t border-border mt-16 py-8 bg-card/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="mb-2">© 2026 Russian Town RP • Brick Rigs</p>
          <p className="text-sm">Лучший ролевой сервер с реалистичными фракциями</p>
        </div>
      </footer>
    </div>
  );
}
