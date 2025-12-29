(function () {
    'use strict';

    // КОНФИГУРАЦИЯ
    var MYSHOWS_API = 'https://api.myshows.me/v2/';
    // Для работы нужен CORS прокси. Если у вас свой, впишите сюда. 
    // Если пустая строка - запросы пойдут напрямую (может не работать в браузере).
    var CORS_PROXY = 'https://cors-anywhere.herokuapp.com/'; 
    
    // Получите эти данные на https://myshows.me/profile/applications/
    var CLIENT_ID = 'myshows_client_id_here'; 
    var CLIENT_SECRET = 'myshows_client_secret_here';

    var NETWORK = {
        get: function (method, params, success, error) {
            var url = CORS_PROXY + MYSHOWS_API + method;
            var headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            var token = Lampa.Storage.get('myshows_token');
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }

            $.ajax({
                url: url,
                type: 'GET',
                data: params,
                headers: headers,
                dataType: 'json',
                success: success,
                error: error
            });
        },
        post: function (method, data, success, error) {
            var url = CORS_PROXY + 'https://myshows.me/oauth/token'; // OAuth Endpoint
            
            $.ajax({
                url: url,
                type: 'POST',
                data: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' },
                dataType: 'json',
                success: success,
                error: error
            });
        }
    };

    function MyShows() {
        var self = this;

        this.init = function () {
            // 1. Добавляем пункт в настройки
            Lampa.Settings.listener.follow('open', function (e) {
                if (e.name == 'main') {
                    e.body.find('[data-parent="plugins"]').after(self.settingsItem());
                }
            });

            // 2. Добавляем пункт в главное меню
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') {
                    var icon = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 4H3C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H21C22.1046 20 23 19.1046 23 18V6C23 4.89543 22.1046 4 21 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 20V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 20V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 4V2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                    
                    var item = $('<div class="nav__item selector" data-action="myshows"><div class="nav__icon">' + icon + '</div><div class="nav__title">Мои Сериалы</div></div>');
                    
                    item.on('hover:enter', function () {
                        Lampa.Activity.push({
                            url: '',
                            title: 'Мои Сериалы',
                            component: 'myshows_feed',
                            page: 1
                        });
                    });

                    $('.nav__body').find('[data-action="favorite"]').after(item);
                }
            });
        };

        this.settingsItem = function () {
            var item = $('<div class="settings-param selector" data-type="button" data-name="myshows_settings"><div class="settings-param__name">MyShows</div><div class="settings-param__descr">Настройка аккаунта и синхронизация</div></div>');
            
            item.on('hover:enter', function () {
                var items = [];

                // 1.1 Аккаунт / Авторизация
                var token = Lampa.Storage.get('myshows_token');
                if (token) {
                    items.push({
                        title: 'Выйти из аккаунта',
                        descr: 'Текущий статус: Авторизован',
                        id: 'logout'
                    });
                } else {
                    items.push({
                        title: 'Авторизация',
                        descr: 'Войти с помощью логина и пароля',
                        id: 'login'
                    });
                }

                // 1.2 Очистить кэш
                items.push({
                    title: 'Очистить кэш',
                    descr: 'Удалить сохраненные данные списка',
                    id: 'clear_cache'
                });

                Lampa.Select.show({
                    title: 'MyShows',
                    items: items,
                    onSelect: function (a) {
                        Lampa.Controller.toggle('settings_component'); // Вернуть фокус
                        if (a.id == 'login') self.showLogin();
                        if (a.id == 'logout') {
                            Lampa.Storage.set('myshows_token', '');
                            Lampa.Noty.show('Выход выполнен');
                            Lampa.Settings.update(); // Обновить UI
                        }
                        if (a.id == 'clear_cache') {
                            Lampa.Storage.set('myshows_cache', '');
                            Lampa.Noty.show('Кэш очищен');
                        }
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('settings_component');
                    }
                });
            });
            return item;
        };

        this.showLogin = function () {
            Lampa.Input.edit({
                title: 'Логин MyShows',
                value: '',
                free: true,
                nosave: true
            }, function (login) {
                Lampa.Input.edit({
                    title: 'Пароль',
                    value: '',
                    free: true,
                    nosave: true,
                    type: 'password' // Скрываем ввод, если поддерживается
                }, function (password) {
                    Lampa.Loading.start(function () {
                        // Попытка авторизации (Password Grant Type)
                        // В реальной жизни MyShows использует OAuth, это упрощенный пример
                        NETWORK.post('', {
                            grant_type: 'password',
                            client_id: CLIENT_ID,
                            client_secret: CLIENT_SECRET,
                            username: login,
                            password: password
                        }, function (result) {
                            Lampa.Loading.stop();
                            if (result.access_token) {
                                Lampa.Storage.set('myshows_token', result.access_token);
                                Lampa.Noty.show('Успешная авторизация!');
                            } else {
                                Lampa.Noty.show('Ошибка: нет токена');
                            }
                        }, function (e) {
                            Lampa.Loading.stop();
                            Lampa.Noty.show('Ошибка авторизации');
                        });
                    });
                });
            });
        };
    }

    // КОМПОНЕНТ "МОИ СЕРИАЛЫ"
    function MyShowsFeed(object) {
        var comp = new Lampa.Interaction.component(object, object);
        var files = new Lampa.Files(object);
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var items = [];
        var active = 0;

        comp.create = function () {
            this.activity.loader = true;
            return $('<div class="myshows-feed"></div>');
        };

        comp.onEnter = function () {
            // Загрузка данных
            var token = Lampa.Storage.get('myshows_token');
            if (!token) {
                comp.empty('Необходима авторизация в настройках');
                return;
            }

            // Получаем список "Смотрю" (Watching)
            NETWORK.get('rpc/profile.shows', {
                status: 'watching',
                sort: 'watched' // Сортировка по последнему просмотру
            }, function (response) {
                // response должен содержать список сериалов
                // Начинаем маппинг
                comp.processList(response); 
            }, function () {
                comp.empty('Ошибка загрузки данных MyShows');
            });
        };

        comp.processList = function(myShowsList) {
            // Тут самая сложная часть: превратить MyShows ID в Lampa Card
            // Мы будем искать каждый сериал в TMDB
            
            var promises = [];
            
            // Берем первые 20 для теста, чтобы не упереться в лимиты
            var list = myShowsList.slice(0, 20); 

            list.forEach(function(show){
                // Ищем по IMDb ID если есть, это точнее всего
                // Если нет, ищем по названию (show.titleOriginal)
                
                var method = 'search/tv';
                var params = { query: show.titleOriginal || show.title, language: 'ru-RU' };
                
                // В Lampa есть API для TMDB
                // Используем Lampa.Api.search
                
                var p = new Promise(function(resolve){
                   Lampa.Api.search(params, function(json){
                       if(json.results && json.results.length){
                           resolve(json.results[0]); // Берем первый результат
                       } else {
                           resolve(null);
                       }
                   }, function(){
                       resolve(null);
                   });
                });
                promises.push(p);
            });

            Promise.all(promises).then(function(results){
                var clean = results.filter(function(n){ return n; });
                comp.build(clean);
            });
        };

        comp.build = function(data){
            comp.activity.loader = false;
            Lampa.Controller.enable('content');
            
            if(!data.length) comp.empty('Список пуст или не удалось найти совпадения');
            
            var line = $('<div class="items-line"></div>');
            
            data.forEach(function(item){
                var card = Lampa.Template.get('card', {
                    title: item.name,
                    release_date: item.first_air_date,
                    vote_average: item.vote_average,
                    poster_path: item.poster_path,
                    id: item.id,
                    type: 'tv'
                });
                
                card.on('hover:enter', function(){
                     Lampa.Activity.push({
                        url: '',
                        component: 'full',
                        id: item.id,
                        method: 'tv',
                        card: item
                    });
                });
                
                line.append(card);
            });
            
            comp.activity.render().append(scroll.render());
            scroll.append(line);
        };

        comp.empty = function(msg){
             comp.activity.loader = false;
             comp.activity.render().find('.empty').remove();
             comp.activity.render().append('<div class="empty">'+msg+'</div>');
        };

        return comp;
    }

    Lampa.Component.add('myshows_feed', MyShowsFeed);

    if (!window.plugin_myshows) {
        window.plugin_myshows = new MyShows();
        window.plugin_myshows.init();
    }

})();
