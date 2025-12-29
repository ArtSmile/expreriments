(function () {
    'use strict';

    function FlcksbrPlugin() {
        var _this = this;

        this.init = function () {
            // Используем try-catch, чтобы ошибка здесь не положила всю Лампу
            try {
                Lampa.Listener.follow('full', function (e) {
                    if (e.type == 'complite') {
                        _this.addButton(e.data, e.object);
                    }
                });
            } catch (error) {
                console.error('FlcksbrPlugin: Ошибка при инициализации', error);
            }
        };

        this.addButton = function (data, object) {
            try {
                // Логируем начало работы функции
                console.log('FlcksbrPlugin: Попытка добавить кнопку для', data.movie.title);

                var movie = data.movie;
                var kp_id = (movie.kinopoisk_id || movie.kp_id || (movie.ids && movie.ids.kp) || null);
                
                // Создаем кнопку
                var btn = $('<div class="view--btn selector">KP Watch</div>');
                var icon_load = '<div class="broadcast__scan"><div></div></div>';
                var is_searching = false;

                // Обработчик нажатия
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
                // Ищем панель действий. 
                var action_panel = object.find('.view--action');
                
                // Если панели actions нет, ищем buttons (для мобильных версий)
                if (action_panel.length === 0) {
                    action_panel = object.find('.view--buttons');
                }

                if (action_panel.length > 0) {
                    // append добавляет В КОНЕЦ. prepend - В НАЧАЛО.
                    // Если MODS затирает кнопки, попробуем встать первыми (prepend)
                    // или просто добавить в конец (append).
                    action_panel.first().append(btn);
                    console.log('FlcksbrPlugin: Кнопка успешно добавлена в DOM');
                } else {
                    console.error('FlcksbrPlugin: Не найдена панель для кнопок (.view--action или .view--buttons)');
                }

                // --- ПОИСК ID (ФОНОВЫЙ) ---
                if (!kp_id) {
                    console.log('FlcksbrPlugin: ID нет, начинаем поиск...');
                    is_searching = true;
                    btn.append(icon_load);
                    
                    _this.findKpIdRemote(movie, function(foundId) {
                        is_searching = false;
                        btn.find('.broadcast__scan').remove();
                        
                        if (foundId) {
                            kp_id = foundId;
                            console.log('FlcksbrPlugin: ID найден:', foundId);
                            // Можно визуально моргнуть кнопкой, что она активна
                            btn.css('color', '#4bffa5'); // Сделать текст зеленоватым
                        } else {
                            console.log('FlcksbrPlugin: ID найти не удалось');
                            btn.css('opacity', '0.5');
                        }
                    });
                }
            } catch (error) {
                console.error('FlcksbrPlugin: Критическая ошибка в addButton', error);
            }
        };

        this.findKpIdRemote = function(movie, callback) {
            // Токен для Alloha
            var token = '04941a9a3ca3ac16e2b4327347bbc1'; 
            var url = 'https://api.alloha.tv/?token=' + token;

            if (movie.id) url += '&tmdb=' + movie.id;
            else if (movie.imdb_id) url += '&imdb=' + movie.imdb_id;
            else if (movie.original_title) url += '&name=' + encodeURIComponent(movie.original_title);
            else {
                callback(null);
                return;
            }

            // Используем network.silent напрямую, без создания экземпляра класса
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
                    Lampa.Noty.show('Поток не найден (защита или iframe)');
                    // Опция: открыть в браузере, если не нашли поток
                    // Lampa.Platform.openWindow(targetUrl);
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
