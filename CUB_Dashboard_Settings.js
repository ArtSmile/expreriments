
(function () {
    'use strict';

    function CUB_Dashboard_Settings() {
        var _this = this;
        var sections = {
            'now_playing': 'now_watch',
            'latest': 'latest',
            'top/fire/movie': 'fire',
            'top/hundred/movie': 'top_100',
            'top/hundred/tv': 'top_100',
            'added': 'trailers',
            'collections/list': 'collections',
            'now': 'new_this_year'
        };

        var extra_sections = {
            'persons': 'Подборки по актёрам',
            'keywords': 'Подборки по темам',
            'genres': 'Подборки по жанрам'
        };

        var inject_sections = {
            'book': 'Избранное',
            'history': 'История просмотров'
        };

        // Initialize Settings
        this.init = function () {
            Lampa.SettingsApi.addComponent({
                component: 'cub_dashboard',
                name: 'Главная - CUB',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="white"/></svg>'
            });

            Lampa.Settings.listener.follow('open', function (e) {
                if (e.name == 'cub_dashboard') {
                    _this.renderSettings();
                }
            });

            this.interceptContentRows();
        };

        // Render Settings Panel
        this.renderSettings = function () {
            var translations = {
                'now_playing': 'Сейчас смотрят',
                'latest': 'Новинки',
                'top/fire/movie': 'Сейчас популярно (Огонь)',
                'top/hundred/movie': 'ТОП 100 Фильмов',
                'top/hundred/tv': 'ТОП 100 Сериалов',
                'added': 'Трейлеры',
                'collections/list': 'Коллекции',
                'now': 'Новинки этого года'
            };

            // Main Sections
            for (var key in sections) {
                (function (k) {
                    var title = translations[k] || k;

                    Lampa.SettingsApi.addParam({
                        component: 'cub_dashboard',
                        param: {
                            name: 'cub_dash_title_' + k,
                            type: 'title'
                        },
                        field: {
                            name: title
                        }
                    });

                    Lampa.SettingsApi.addParam({
                        component: 'cub_dashboard',
                        param: {
                            name: 'cub_dash_show_' + k,
                            type: 'trigger',
                            default: true
                        },
                        field: {
                            name: 'Отображать'
                        }
                    });

                    Lampa.SettingsApi.addParam({
                        component: 'cub_dashboard',
                        param: {
                            name: 'cub_dash_style_' + k,
                            type: 'select',
                            values: {
                                'std': 'Горизонтальные (обычные)',
                                'wide': 'Горизонтальные (большие)',
                                'vert': 'Вертикальные'
                            },
                            default: 'std'
                        },
                        field: {
                            name: 'Стиль карточек'
                        }
                    });
                })(key);
            }

            // Extra Sections
            Lampa.SettingsApi.addParam({
                component: 'cub_dashboard',
                param: {
                    name: 'cub_dash_title_extra',
                    type: 'title'
                },
                field: {
                    name: 'Тематические подборки'
                }
            });

            for (var key in extra_sections) {
                (function (k) {
                    Lampa.SettingsApi.addParam({
                        component: 'cub_dashboard',
                        param: {
                            name: 'cub_dash_show_' + k,
                            type: 'trigger',
                            default: true
                        },
                        field: {
                            name: extra_sections[k]
                        }
                    });
                })(key);
            }

            // Injected Sections
            Lampa.SettingsApi.addParam({
                component: 'cub_dashboard',
                param: {
                    name: 'cub_dash_title_inject',
                    type: 'title'
                },
                field: {
                    name: 'Специальные разделы'
                }
            });

            for (var key in inject_sections) {
                (function (k) {
                    Lampa.SettingsApi.addParam({
                        component: 'cub_dashboard',
                        param: {
                            name: 'cub_dash_show_' + k,
                            type: 'trigger',
                            default: false
                        },
                        field: {
                            name: inject_sections[k] // 'Избранное' or 'История просмотров'
                        }
                    });

                    Lampa.SettingsApi.addParam({
                        component: 'cub_dashboard',
                        param: {
                            name: 'cub_dash_style_' + k,
                            type: 'select',
                            values: {
                                'std': 'Горизонтальные (обычные)',
                                'wide': 'Горизонтальные (большие)',
                                'vert': 'Вертикальные'
                            },
                            default: 'std'
                        },
                        field: {
                            name: 'Стиль карточек'
                        }
                    });
                })(key);
            }
        };

        // Intercept ContentRows
        this.interceptContentRows = function () {
            var originalCall = Lampa.ContentRows.call;

            Lampa.ContentRows.call = function (name, params, callbacks) {
                if (name === 'main' && params.source === 'cub') {
                    // Inject extra rows first
                    var injections = [];
                    for (var key in inject_sections) {
                        if (Lampa.Storage.get('cub_dash_show_' + key, false)) {
                            injections.push(createInjectedRow(key));
                        }
                    }

                    if (injections.length) {
                        for (var i = injections.length - 1; i >= 0; i--) {
                            callbacks.unshift(injections[i]);
                        }
                    }

                    var wrappedCallbacks = callbacks.map(function (cb) {
                        if (cb.isInjectedRow) {
                            return cb;
                        }

                        var originalRowGenerator = cb;

                        return function (call) {
                            originalRowGenerator(function (json) {
                                if (!json) return call(json);

                                var urlInfo = json.url || '';
                                var sectionKey = null;

                                for (var key in sections) {
                                    if (urlInfo.indexOf(key) !== -1) {
                                        sectionKey = key;
                                        break;
                                    }
                                }

                                if (urlInfo.indexOf('sort=now') !== -1 && urlInfo.indexOf('sort=now_playing') === -1) {
                                    sectionKey = 'now';
                                }
                                if (urlInfo.indexOf('collections/') !== -1 && urlInfo.indexOf('collections/list') === -1) {
                                    sectionKey = 'collections/list';
                                }

                                // Extra Sections
                                if (urlInfo.indexOf('person/popular') !== -1 || (json.title && json.params && json.params.module)) {
                                    // Check for person icon heuristic if we want to be sure
                                    if (json.icon_img && json.icon_img.indexOf('profile_path') === -1) {
                                        if (!sectionKey) {
                                            sectionKey = 'persons';
                                        }
                                    }
                                }

                                if (urlInfo.indexOf('discover/movie') !== -1 || urlInfo.indexOf('discover/tv') !== -1) {
                                    if (urlInfo.indexOf('with_keywords') !== -1) {
                                        sectionKey = 'keywords';
                                    }
                                    if (urlInfo.indexOf('with_genres') !== -1) {
                                        sectionKey = 'genres';
                                    }
                                }
                                if (urlInfo.indexOf('genre=') !== -1 && !sectionKey) {
                                    sectionKey = 'genres';
                                }

                                if (sectionKey) {
                                    var show = Lampa.Storage.get('cub_dash_show_' + sectionKey, true);
                                    var style = Lampa.Storage.get('cub_dash_style_' + sectionKey, 'std');

                                    if (!show) {
                                        return call(null);
                                    }

                                    applyStyle(json, style);
                                }

                                call(json);
                            });
                        };
                    });

                    for (var i = 0; i < callbacks.length; i++) {
                        callbacks[i] = wrappedCallbacks[i];
                    }
                }

                return originalCall.apply(this, arguments);
            };
        };

        function createInjectedRow(type) {
            var func = function (call) {
                var results = [];
                if (type === 'book') results = Lampa.Favorite.get({ type: 'book' });
                if (type === 'history') results = Lampa.Favorite.get({ type: 'history' });

                if (results.length > 20) results = results.slice(0, 20);

                if (results.length === 0) return call(null);

                var title = inject_sections[type];

                var json = {
                    title: title,
                    results: results,
                    url: 'injected_' + type
                };

                var style = Lampa.Storage.get('cub_dash_style_' + type, 'std');
                applyStyle(json, style);

                call(json);
            };
            func.isInjectedRow = true;
            return func;
        }

        function applyStyle(json, style) {
            if (style === 'wide') {
                if (!json.params) json.params = {};
                if (!json.params.style) json.params.style = {};
                json.params.style.name = 'wide';

                if (!json.params.items) json.params.items = {};
                json.params.items.view = 3;

                if (json.results) {
                    json.results.forEach(function (card) {
                        if (!card.params) card.params = {};
                        if (!card.params.style) card.params.style = {};
                        card.params.style.name = 'wide';
                    });
                }
            } else if (style === 'vert') {
                if (json.params && json.params.style && json.params.style.name === 'wide') delete json.params.style.name;
                if (json.results) {
                    json.results.forEach(function (card) {
                        if (card.params && card.params.style && card.params.style.name === 'wide') delete card.params.style.name;
                    });
                }
                if (!json.params) json.params = {};
                if (!json.params.items) json.params.items = {};
                json.params.items.view = 5;
            } else {
                if (json.params && json.params.style && json.params.style.name === 'wide') delete json.params.style.name;
                if (json.results) {
                    json.results.forEach(function (card) {
                        if (card.params && card.params.style && card.params.style.name === 'wide') delete card.params.style.name;
                    });
                }
            }
        }
    }

    if (window.Lampa) {
        new CUB_Dashboard_Settings().init();
    } else {

    }

})();
