(function() {
    'use strict';
    var network = new Lampa.Reguest();

    // Генератор SVG для карточки-разделителя года
    function getYearPoster(year) {
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" fill="none"><rect width="300" height="450" fill="#2a2a2a"/><line x1="0" y1="225" x2="300" y2="225" stroke="#f0f0f0" stroke-width="2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="60" fill="#ffffff" font-weight="bold">' + year + '</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="#aaaaaa">------------</text></svg>';
        return 'data:image/svg+xml;base64,' + btoa(svg);
    }

    // --- Блок авторизации и получения данных (Оставлен как в оригинале с небольшими правками для сохранения типа) ---
    
    function calculateProgress(total, current) {
        if(total == current) {
            Lampa.Noty.show('Обновление списка "Буду смотреть" завершено (' + String(total) + ')');
        }
    }

    function processKinopoiskData(data) {
        if(data && data.data.userProfile && data.data.userProfile.userData && data.data.userProfile.userData.plannedToWatch) {
            var kinopoiskMovies = Lampa.Storage.get('kinopoisk_movies', []);
            var receivedMovies = data.data.userProfile.userData.plannedToWatch.movies.items;
            var receivedMoviesCount = receivedMovies.length;
            
            if(receivedMoviesCount == 0) {
                Lampa.Noty.show('В списке "Буду смотреть" Кинопоиска нет записей');
            }
            const receivedMovieIds = new Set(receivedMovies.map(m => String(m.movie.id)));
            
            // Удаляем из кэша то, чего больше нет в списке
            kinopoiskMovies = kinopoiskMovies.filter(movie => receivedMovieIds.has(String(movie.kinopoisk_id)));
            Lampa.Storage.set('kinopoisk_movies', JSON.stringify(kinopoiskMovies));
            
            let processedItems = 1;
            receivedMovies.forEach(m => {
                const existsInLocalStorage = kinopoiskMovies.some(km => km.kinopoisk_id === String(m.movie.id));
                if (!existsInLocalStorage) {
                    var title = m.movie.title.localized || m.movie.title.original;
                    // Используем прокси alloha
                    network.silent('https://api.alloha.tv/?token=04941a9a3ca3ac16e2b4327347bbc1&kp=' + String(m.movie.id), function(data) {
                        if (data && data.data) {
                            var movieTMDBid = data.data.id_tmdb ? data.data.id_tmdb : null;
                            var movieTitle = data.data.original_name ? data.data.original_name : data.data.name;
                            
                            // Определяем тип (1 - фильм, 2 - сериал)
                            var movieType = (data.data.category == 1) ? 'movie' : 'tv';
                            var movieYear = data.data.year;
                            var url = '';

                            if (movieTMDBid) {
                                url = Lampa.Utils.protocol() + 'tmdb.'+ Lampa.Manifest.cub_domain +'/3/' + movieType + '/' + String(movieTMDBid) + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=ru';
                            } else {
                                url = Lampa.Utils.protocol() + 'tmdb.'+ Lampa.Manifest.cub_domain +'/3/search/' + movieType + '?query=' + encodeURIComponent(movieTitle) + '&api_key=4ef0d7355d9ffb5151e987764708ce96&year=' + String(movieYear) + '&language=ru';
                            }

                            network.silent(url, function(data) {
                                var movieItem = null;
                                if(data) {
                                    if (movieTMDBid) movieItem = data;
                                    else if (data.results && data.results[0]) movieItem = data.results[0];
                                    
                                    if(movieItem) {
                                        var movieDateStr = movieItem.release_date || movieItem.first_air_date;
                                        
                                        // ВАЖНО: Принудительно сохраняем тип контента для фильтрации
                                        movieItem.media_type = movieType; 
                                        movieItem.kinopoisk_id = String(m.movie.id);
                                        movieItem.source = "tmdb";

                                        kinopoiskMovies = Lampa.Storage.get('kinopoisk_movies', []);
                                        kinopoiskMovies.unshift(movieItem);
                                        Lampa.Storage.set('kinopoisk_movies', JSON.stringify(kinopoiskMovies));
                                    }
                                }
                                calculateProgress(receivedMoviesCount, processedItems++);
                            }, function() { calculateProgress(receivedMoviesCount, processedItems++); });
                        } else {
                            calculateProgress(receivedMoviesCount, processedItems++);
                        }
                    }, function() { calculateProgress(receivedMoviesCount, processedItems++); });
                } else {
                    calculateProgress(receivedMoviesCount, processedItems++);
                }
            })
        } else {
            Lampa.Noty.show('Ошибка получения данных от Кинопоиска');
        }
    }

    function getKinopoiskData() {
        var oauth = Lampa.Storage.get('kinopoisk_access_token');
        if(!oauth) return;
        network.silent('https://script.google.com/macros/s/AKfycbwQhxl9xQPv46uChWJ1UDg6BjSmefbSlTRUoSZz5f1rZDRvdhAGTi6RHyXwcSeyBtPr/exec?oauth=' + oauth, function(data) {
            processKinopoiskData(data);
        }, function(data) {
            console.log('Kinopoisk', 'Error google script', data);
        });
    }

    // --- Логика отображения СЕРИАЛОВ ---

    function full(params, oncomplete, onerror) {
        var oauth = Lampa.Storage.get('kinopoisk_access_token');
        
        // Запускаем обновление данных в фоне
        if(oauth) getKinopoiskData();

        var allItems = Lampa.Storage.get('kinopoisk_movies', []);
        
        // 1. ФИЛЬТРАЦИЯ: Оставляем только сериалы
        // Критерий: media_type == 'tv' ИЛИ наличие first_air_date (свойство TMDB только для сериалов)
        var series = allItems.filter(function(item) {
            return item.media_type === 'tv' || item.first_air_date !== undefined;
        });

        // 2. СОРТИРОВКА: По году (новейшие сверху)
        series.sort(function(a, b) {
            var dateA = new Date(a.first_air_date || a.release_date || '1970-01-01');
            var dateB = new Date(b.first_air_date || b.release_date || '1970-01-01');
            return dateB - dateA;
        });

        // 3. ГРУППИРОВКА: Вставляем карточки-разделители
        var results = [];
        var lastYear = null;

        series.forEach(function(item) {
            var dateStr = item.first_air_date || item.release_date;
            var year = dateStr ? new Date(dateStr).getFullYear() : 'Без даты';

            if (year !== lastYear) {
                // Добавляем фейковую карточку-разделитель
                results.push({
                    id: 'sep_' + year,
                    title: year + ' -----------', // Текст для списка
                    poster: getYearPoster(year), // SVG заглушка
                    background_image: '',
                    type: 'static_year', // Чтобы не открывалось как фильм
                    vote_average: 0,
                    is_separator: true
                });
                lastYear = year;
            }
            results.push(item);
        });

        oncomplete({
            "secuses": true,
            "page": 1,
            "results": results
        });
    }

    function clear() {
        network.clear();
    }

    var Api = {
        full: full,
        clear: clear
    };

    function component(object) {
        var comp = new Lampa.InteractionCategory(object);
        comp.create = function() {
            Api.full(object, this.build.bind(this), this.empty.bind(this));
        };
        comp.nextPageReuest = function(object, resolve, reject) {
            Api.full(object, resolve.bind(comp), reject.bind(comp));
        };
        // Блокируем клик на разделителе
        comp.onItemSelect = function(item) {
            if (item.is_separator) return; // Ничего не делать при клике на год
            Lampa.Activity.push({
                url: '',
                component: 'full',
                id: item.id,
                method: item.source === 'tmdb' ? 'tv' : 'movie', // Форсируем открытие как TV
                card: item
            });
        }
        return comp;
    }

    // --- Авторизация (копируется стандартная, чтобы работало автономно) ---
    
    function getToken(device_code, refresh) {
        var client_id = 'b8b9c7a09b79452094e12f6990009934';
        var token_data = {
            'grant_type': refresh ? 'refresh_token' : 'device_code',
            'code': refresh ? undefined : device_code,
            'refresh_token': refresh ? device_code : undefined,
            'client_id': client_id,
            'client_secret': '0e7001e272944c05ae5a0df16e3ea8bd'
        };

        network.silent('https://oauth.yandex.ru/token', function(data) {
            if(data.access_token) {
                Lampa.Storage.set('kinopoisk_access_token', data.access_token);
                Lampa.Storage.set('kinopoisk_refresh_token', data.refresh_token);
                Lampa.Storage.set('kinopoisk_token_expires', data.expires_in * 1000 + Date.now());
                Lampa.Modal.close();
                getKinopoiskData();
            } else {
                Lampa.Noty.show('Не удалось получить token');
            }
        }, function(data) {
            Lampa.Noty.show('Ошибка авторизации');
        }, token_data);
    }

    function getDeviceCode() {
        const uuid4 = () => { /* ... (сокращено для краткости, стандартный UUID) ... */ 
             return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        Lampa.Storage.set('kinopoisk_deviceid', uuid4());
        network.silent('https://oauth.yandex.ru/device/code', function(data) {
            if(data.user_code) {
                let modal = $('<div><div class="about">Перейдите на https://ya.ru/device<br>Код: <b>' + data.user_code + '</b></div><div class="broadcast__device selector" style="text-align:center; margin-top:20px">Готово</div></div>');
                Lampa.Modal.open({
                    title: 'Авторизация',
                    html: modal,
                    onSelect: () => { getToken(data.device_code, false); }
                });
            }
        }, function() {}, { 'client_id': 'b8b9c7a09b79452094e12f6990009934', 'device_id': Lampa.Storage.get('kinopoisk_deviceid') });
    }

    function startPlugin() {
        var manifest = {
            type: 'video',
            version: '1.0.0',
            name: 'КП: Сериалы', // Имя кнопки в меню
            component: 'kinopoisk_series'
        };
        Lampa.Manifest.plugins = manifest;
        Lampa.Component.add('kinopoisk_series', component);

        // Обновление токена если нужно
        if(Lampa.Storage.get('kinopoisk_access_token', '') !== '' && Lampa.Storage.get('kinopoisk_token_expires', 0) < Date.now()) {
            getToken(Lampa.Storage.get('kinopoisk_refresh_token', ''), true);
        }

        // Добавляем кнопку в меню
        function add() {
            var button = $("<li class=\"menu__item selector\">\n<div class=\"menu__ico\">\n<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M2 6H22V18H2V6ZM4 8V16H20V8H4ZM6 10H10V14H6V10Z\" /></svg>\n</div>\n<div class=\"menu__text\">" + manifest.name + "</div>\n</li>");
            
            button.on('hover:enter', function() {
                if(Lampa.Storage.get('kinopoisk_access_token', '') == '') getDeviceCode();
                Lampa.Activity.push({ url: '', title: 'Буду смотреть: Сериалы', component: 'kinopoisk_series', page: 1 });
            });
            $('.menu .menu__list').eq(0).append(button);
        }
        if(window.appready) add();
        else Lampa.Listener.follow('app', function(e) { if(e.type == 'ready') add(); });
    }

    if(!window.kinopoisk_series_ready) {
        startPlugin();
        window.kinopoisk_series_ready = true;
    }
})();
