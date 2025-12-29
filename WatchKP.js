(function () {
    'use strict';

    function FlcksbrPlugin() {
        var _this = this;

        this.init = function () {
            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    _this.addButton(e.data, e.object);
                }
            });
        };

        this.addButton = function (data, object) {
            // Пытаемся найти ID в разных полях, куда Lampa может его прятать
            var kp_id = (data.movie.kinopoisk_id || data.movie.kp_id || (data.movie.ids && data.movie.ids.kp) || null);

            // Создаем кнопку в любом случае
            var btn = $('<div class="view--btn selector">KP Watch</div>');

            // Логика при нажатии
            btn.on('hover:enter click', function () {
                if (kp_id) {
                    _this.findStream(kp_id, data.movie.title);
                } else {
                    Lampa.Noty.show('Не найден ID Кинопоиска для этого фильма');
                }
            });

            // Ищем панель кнопок. Обычно это класс .view--action
            var action_panel = object.find('.view--action');
            
            if(action_panel.length > 0){
                // Вставляем кнопку
                action_panel.first().append(btn);
            } else {
                // Если стандартная панель не найдена (бывает на мобильных версиях), пробуем другую
                object.find('.view--buttons').append(btn);
            }
        };

        this.findStream = function (id, title) {
            Lampa.Loading.start(); 
            var targetUrl = 'https://flcksbr.top/film/' + id + '/';
            var network_method = Lampa.Network.silent; 
            
            network_method(targetUrl, function (html) {
                // Ищем mp4 или m3u8
                var file_match = html.match(/file\s*:\s*["']([^"']+)["']/);
                var m3u8_match = html.match(/https?:\/\/[^\s"']+\.m3u8/);
                var mp4_match = html.match(/https?:\/\/[^\s"']+\.mp4/);

                var streamUrl = null;

                if (file_match && file_match[1]) streamUrl = file_match[1];
                else if (m3u8_match) streamUrl = m3u8_match[0];
                else if (mp4_match) streamUrl = mp4_match[0];

                Lampa.Loading.stop();

                if (streamUrl) {
                    Lampa.Player.play({
                        url: streamUrl,
                        title: title
                    });
                    Lampa.History.add(streamUrl, { title: title });
                } else {
                    Lampa.Noty.show('Поток не найден. Нужен более сложный парсер.');
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
