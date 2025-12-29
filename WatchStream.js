(function () {
    'use strict';

    function FlcksbrPlugin() {
        var _this = this;
        var network = new Lampa.Reguest();

        this.init = function () {
            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    _this.addButton(e.data, e.object);
                }
            });
        };

        this.addButton = function (data, object) {
            var movie = data.movie;
            // 1. Ищем ID локально (вдруг уже есть)
            var kp_id = (movie.kinopoisk_id || movie.kp_id || (movie.ids && movie.ids.kp) || null);
            
            var btn = $('<div class="view--btn selector">KP Watch</div>');
            var icon_load = '<div class="broadcast__scan"><div></div></div>'; // Анимация загрузки
            
            // Если ID нет, мы его поищем, а пока поставим флаг
            var is_searching = false;

            // Логика нажатия
            btn.on('hover:enter click', function () {
                if (kp_id) {
                    _this.findStream(kp_id, movie.title);
                } else if (is_searching) {
                    Lampa.Noty.show('Идет поиск ID Кинопоиска, подождите...');
                } else {
                    Lampa.Noty.show('Не удалось найти ID Кинопоиска для этого фильма');
                }
            });

            // Добавляем кнопку на экран
            var action_panel = object.find('.view--action');
            if(action_panel.length > 0) action_panel.first().append(btn);
            else object.find('.view--buttons').append(btn);

            // === МАГИЯ: ЕСЛИ ID НЕТ, ИЩЕМ ЕГО ЧЕРЕЗ ALLOHA ===
            if (!kp_id) {
                is_searching = true;
                btn.append(icon_load); // Показываем крутилку прямо в кнопке
                
                _this.findKpIdRemote(movie, function(foundId) {
                    is_searching = false;
                    btn.find('.broadcast__scan').remove(); // Убираем крутилку
                    
                    if (foundId) {
                        kp_id = foundId;
                        console.log('KP Plugin:', 'ID найден удаленно:', foundId);
                        Lampa.Noty.show('ID Кинопоиска найден!'); // Опционально, чтобы ты знал, что сработало
                    } else {
                        console.log('KP Plugin:', 'ID не найден нигде');
                        btn.css('opacity', '0.5'); // Делаем кнопку тусклой, если не нашли
                    }
                });
            }
        };

        // Функция поиска ID через API (взято из логики твоего файла)
        this.findKpIdRemote = function(movie, callback) {
            var token = '04941a9a3ca3ac16e2b4327347bbc1'; // Токен из твоего файла kpseries.js
            var url = 'https://api.alloha.tv/?token=' + token;

            // Приоритет поиска: TMDB ID -> IMDB ID -> Название
            if (movie.id) url += '&tmdb=' + movie.id;
            else if (movie.imdb_id) url += '&imdb=' + movie.imdb_id;
            else if (movie.original_title) url += '&name=' + encodeURIComponent(movie.original_title);
            else {
                callback(null);
                return;
            }

            network.silent(url, function(json) {
                if (json && json.data && json.data.id_kp) {
                    // Alloha вернула ID Кинопоиска!
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
            
            network.silent(targetUrl, function (html) {
                var file_match = html.match(/file\s*:\s*["']([^"']+)["']/);
                var m3u8_match = html.match(/https?:\/\/[^\s"']+\.m3u8/);
                var mp4_match = html.match(/https?:\/\/[^\s"']+\.mp4/);
                var streamUrl = file_match ? file_match[1] : (m3u8_match ? m3u8_match[0] : (mp4_match ? mp4_match[0] : null));

                Lampa.Loading.stop();

                if (streamUrl) {
                    Lampa.Player.play({ url: streamUrl, title: title });
                    Lampa.History.add(streamUrl, { title: title });
                } else {
                    Lampa.Noty.show('Поток не найден (защита сайта).');
                }
            }, function (a, c) {
                Lampa.Loading.stop();
                Lampa.Noty.show('Ошибка соединения с flcksbr.top');
            });
        };
    }

    if (!window.plugin_flcksbr) {
        window.plugin_flcksbr = new FlcksbrPlugin();
        window.plugin_flcksbr.init();
    }
})();
