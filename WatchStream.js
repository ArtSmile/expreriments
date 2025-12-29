(function () {
    'use strict';

    function FlcksbrPlugin() {
        var _this = this;

        this.init = function () {
            // Подписываемся на событие открытия карточки
            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    // Передаем данные. Сам object нам больше не нужен для поиска DOM,
                    // но передадим на всякий случай.
                    _this.addButton(e.data);
                }
            });
        };

        this.addButton = function (data) {
            try {
                // Ищем активную открытую карточку фильма по глобальному классу
                var fullPage = $('.full-start'); 

                // Если карточка почему-то не найдена, выходим, чтобы не было ошибок
                if (fullPage.length === 0) return;

                var movie = data.movie;
                var kp_id = (movie.kinopoisk_id || movie.kp_id || (movie.ids && movie.ids.kp) || null);
                
                // Создаем кнопку
                var btn = $('<div class="view--btn selector">KP Watch</div>');
                var icon_load = '<div class="broadcast__scan"><div></div></div>';
                var is_searching = false;

                // --- ЛОГИКА НАЖАТИЯ ---
                btn.on('hover:enter click', function () {
                    if (kp_id) {
                        _this.findStream(kp_id, movie.title);
                    } else if (is_searching) {
                        Lampa.Noty.show('Идет поиск ID...');
                    } else {
                        Lampa.Noty.show('ID Кинопоиска не найден');
                    }
                });

                // --- ВСТАВКА КНОПКИ ---
                // Ищем панель кнопок ВНУТРИ найденной страницы
                var action_panel = fullPage.find('.view--action');
                
                // Если панели actions нет (мобилка), ищем buttons
                if (action_panel.length === 0) {
                    action_panel = fullPage.find('.view--buttons');
                }

                // Вставляем кнопку
                if (action_panel.length > 0) {
                    // Используем prepend, чтобы встать ПЕРВОЙ кнопкой (до трейлера и MODS)
                    // Это поможет увидеть её сразу
                    action_panel.first().prepend(btn);
                }

                // --- ПОИСК ID (ЕСЛИ НЕТ) ---
                if (!kp_id) {
                    is_searching = true;
                    btn.append(icon_load);
                    
                    _this.findKpIdRemote(movie, function(foundId) {
                        is_searching = false;
                        btn.find('.broadcast__scan').remove();
                        
                        if (foundId) {
                            kp_id = foundId;
                            // Делаем текст зеленым, чтобы показать успех
                            btn.css('color', '#80ffb0'); 
                        } else {
                            btn.css('opacity', '0.5');
                        }
                    });
                }
            } catch (error) {
                console.error('FlcksbrPlugin: Ошибка в addButton', error);
            }
        };

        this.findKpIdRemote = function(movie, callback) {
            var token = '04941a9a3ca3ac16e2b4327347bbc1'; 
            var url = 'https://api.alloha.tv/?token=' + token;

            if (movie.id) url += '&tmdb=' + movie.id;
            else if (movie.imdb_id) url += '&imdb=' + movie.imdb_id;
            else if (movie.original_title) url += '&name=' + encodeURIComponent(movie.original_title);
            else {
                callback(null);
                return;
            }

            Lampa.Network.silent(url, function(json) {
                if (json && json.data && json.data.id_kp) {
                    callback(json.data.id_kp);
                } else {
                    callback(null);
                }
            }, function() {
                callback(null);
            });
        };

        this.findStream = function (id, title) {
            Lampa.Loading.start(); 
            var targetUrl = 'https://flcksbr.top/film/' + id + '/';
            
            Lampa.Network.silent(targetUrl, function (html) {
                var file_match = html.match(/file\s*:\s*["']([^"']+)["']/);
                var m3u8_match = html.match(/https?:\/\/[^\s"']+\.m3u8/);
                var mp4_match = html.match(/https?:\/\/[^\s"']+\.mp4/);
                
                var streamUrl = file_match ? file_match[1] : (m3u8_match ? m3u8_match[0] : (mp4_match ? mp4_match[0] : null));

                Lampa.Loading.stop();

                if (streamUrl) {
                    Lampa.Player.play({ url: streamUrl, title: title });
                    Lampa.History.add(streamUrl, { title: title });
                } else {
                    Lampa.Noty.show('Поток не найден (защита сайта)');
                }
            }, function (a, c) {
                Lampa.Loading.stop();
                Lampa.Noty.show('Ошибка соединения с сайтом');
            });
        };
    }

    if (!window.plugin_flcksbr) {
        window.plugin_flcksbr = new FlcksbrPlugin();
        window.plugin_flcksbr.init();
    }
})();
