(function () {
    'use strict';

    function FlcksbrPlugin() {
        var _this = this;

        this.init = function () {
            // Слушаем открытие карточки фильма
            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    _this.addButton(e.data, e.object);
                }
            });
        };

        this.addButton = function (data, object) {
            // Проверяем, есть ли Kinopoisk ID. Без него магии не будет.
            // Lampa обычно хранит его в kinopoisk_id или kp_id
            var kp_id = data.movie.kinopoisk_id || data.movie.kp_id;

            if (kp_id) {
                // Создаем кнопку в стиле Lampa
                var btn = $('<div class="view--btn selector">KP Лайфхак</div>');

                // Логика при нажатии
                btn.on('hover:enter click', function () {
                    _this.findStream(kp_id, data.movie.title);
                });

                // Вставляем кнопку в список действий (обычно после "Трейлер" или "Смотреть")
                object.find('.view--action').first().append(btn);
            }
        };

        this.findStream = function (id, title) {
            Lampa.Loading.start(); // Показываем крутилку загрузки

            var targetUrl = 'https://flcksbr.top/film/' + id + '/';
            
            // Запрос на сайт (используем прокси Lampa, чтобы обойти CORS блокировки браузера)
            var network_method = Lampa.Network.silent; 
            
            // Пытаемся получить код страницы
            network_method(targetUrl, function (html) {
                
                // === ЭТАП ПОИСКА ПОТОКА ===
                // Это самая сложная часть. Мы ищем внутри текста страницы ссылки на .m3u8 или .mp4
                // Часто плееры прячут ссылки в параметре "file": "..."
                
                var file_match = html.match(/file\s*:\s*["']([^"']+)["']/);
                var m3u8_match = html.match(/https?:\/\/[^\s"']+\.m3u8/);
                var mp4_match = html.match(/https?:\/\/[^\s"']+\.mp4/);

                var streamUrl = null;

                if (file_match && file_match[1]) {
                    streamUrl = file_match[1];
                } else if (m3u8_match) {
                    streamUrl = m3u8_match[0];
                } else if (mp4_match) {
                    streamUrl = mp4_match[0];
                }

                Lampa.Loading.stop();

                if (streamUrl) {
                    // Если ссылка найдена, запускаем плеер
                    Lampa.Player.play({
                        url: streamUrl,
                        title: title,
                        subtitles: [] // Можно добавить парсинг субтитров, если нужно
                    });
                    
                    // Добавляем в историю просмотров
                    Lampa.History.add(streamUrl, { title: title });
                } else {
                    // Если не нашли прямую ссылку
                    Lampa.Noty.show('Поток не найден. Возможно, сайт использует защиту или iframe.');
                    
                    // Опционально: Предложить открыть Webview (браузер внутри лампы)
                    // Lampa.Platform.openWindow(targetUrl); 
                }

            }, function (a, c) {
                Lampa.Loading.stop();
                Lampa.Noty.show('Ошибка соединения с ' + targetUrl);
            });
        };
    }

    if (!window.plugin_flcksbr) {
        window.plugin_flcksbr = new FlcksbrPlugin();
        window.plugin_flcksbr.init();
    }

})();
