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

            this.renderSettings();


            this.interceptContentRows();
            this.monkeyPatchApi();
        };


        // Render Settings Panel
        this.renderSettings = function () {
            Lampa.SettingsApi.removeParams('cub_dashboard');

            if (_this.currentPage === 'order') {
                _this.renderOrderSettings();
            } else if (_this.currentPage === 'display') {
                _this.renderDisplaySettings();
            } else {
                _this.renderMainSettings();
            }

            // Force update UI if open
            // We use a trick: if settings are open, we might need to close and reopen or update triggers
            // But Lampa's Settings component reads params on start.
            // If we are already open, we might need to signal update.
            // Since we rely on user clicking a button which triggers this, we can try to re-open settings.
        };

        this.renderMainSettings = function () {
            Lampa.SettingsApi.addParam({
                component: 'cub_dashboard',
                param: {
                    name: 'cub_dash_nav_order',
                    type: 'button'
                },
                field: {
                    name: 'Порядок'
                },
                onChange: function () {
                    _this.currentPage = 'order';
                    _this.reopenSettings();
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'cub_dashboard',
                param: {
                    name: 'cub_dash_nav_display',
                    type: 'button'
                },
                field: {
                    name: 'Отображение'
                },
                onChange: function () {
                    _this.currentPage = 'display';
                    _this.reopenSettings();
                }
            });
        };

        this.renderOrderSettings = function () {
            Lampa.SettingsApi.addParam({
                component: 'cub_dashboard',
                param: {
                    name: 'cub_dash_back',
                    type: 'button'
                },
                field: {
                    name: 'Назад'
                },
                onChange: function () {
                    _this.currentPage = 'main';
                    _this.reopenSettings();
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'cub_dashboard',
                param: {
                    name: 'cub_dash_title_order',
                    type: 'title'
                },
                field: {
                    name: 'Порядок отображения'
                }
            });

            var order = Lampa.Storage.get('cub_dash_order', _this.getDefaultOrder());
            var translations = {
                'now_playing': 'Сейчас смотрят',
                'latest': 'Новинки',
                'top/fire/movie': 'Сейчас популярно (Огонь)',
                'top/hundred/movie': 'ТОП 100 Фильмов',
                'top/hundred/tv': 'ТОП 100 Сериалов',
                'added': 'Трейлеры',
                'collections/list': 'Коллекции',
                'now': 'Новинки этого года',
                'persons': 'Подборки по актёрам',
                'keywords': 'Подборки по темам',
                'genres': 'Подборки по жанрам',
                'book': 'Избранное',
                'history': 'История просмотров'
            };

            order.forEach(function (key, index) {
                var title = translations[key] || key;

                Lampa.SettingsApi.addParam({
                    component: 'cub_dashboard',
                    param: {
                        name: 'cub_order_' + key,
                        type: 'static'
                    },
                    field: {
                        name: title
                    },
                    onRender: function (item) {
                        item.empty();
                        item.addClass('settings-param');

                        var line = $('<div class="settings-param__name" style="text-align:left">' + title + '</div>');
                        var controls = $('<div class="settings-param__status" style="width: auto; height: auto; right: 0.8em; left: auto; top: 1.5em; background: transparent; display: flex; gap: 1em;"></div>');

                        var up = $('<div class="settings-cmd" style="cursor: pointer;">&uarr;</div>');
                        var down = $('<div class="settings-cmd" style="cursor: pointer;">&darr;</div>');

                        // Chevron Icons
                        var icon_up = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.6569 16.2427L19.0711 14.8285L12.0001 7.75739L4.92896 14.8285L6.34317 16.2427L12.0001 10.5858L17.6569 16.2427Z" fill="currentColor"/></svg>';
                        var icon_down = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.34317 7.75732L4.92896 9.17154L12.0001 16.2426L19.0711 9.17157L17.6569 7.75736L12.0001 13.4142L6.34317 7.75732Z" fill="currentColor"/></svg>';

                        up.html(icon_up);
                        down.html(icon_down);

                        if (index === 0) up.css('opacity', '0.3');
                        if (index === order.length - 1) down.css('opacity', '0.3');

                        up.on('click', function (e) {
                            e.stopPropagation();
                            if (index > 0) {
                                _this.moveItem(key, -1);
                            }
                        });

                        down.on('click', function (e) {
                            e.stopPropagation();
                            if (index < order.length - 1) {
                                _this.moveItem(key, 1);
                            }
                        });


                        controls.append(up).append(down);
                        item.append(line).append(controls);
                    }
                });
            });
        };

        this.moveItem = function (key, dir) {
            var order = Lampa.Storage.get('cub_dash_order', _this.getDefaultOrder());
            var index = order.indexOf(key);
            if (index === -1) return;

            var newIndex = index + dir;
            if (newIndex < 0 || newIndex >= order.length) return;

            // Swap
            var temp = order[index];
            order[index] = order[newIndex];
            order[newIndex] = temp;

            Lampa.Storage.set('cub_dash_order', order);
            _this.renderSettings();
            _this.updateValidSettings();
        };

        // Helper to refresh settings UI
        this.reopenSettings = function () {
            _this.renderSettings();
            // Close and Reopen to refresh params
            // Note: This causes a flicker, but it's the reliable way without deeper access
            if (Lampa.Settings.main && Lampa.Settings.main().update) {
                // Try update if available (unlikely standard API)
            }
            // Trigger Back, then Open again?
            Lampa.Settings.main().render(); // Re-render logic?

            // The cleanest way is to trigger a redraw of the component.
            // We can hack it by finding the component and calling start() again, but that's complex.
            // Let's rely on updateValidSettings which re-renders ONLY if we implement it.
            _this.updateValidSettings();
        };

        this.updateValidSettings = function () {
            var component = Lampa.Settings.get('cub_dashboard'); // Custom helper needed? No.
            // We can find the active component in DOM?
            var active = $('.settings__content').find('.settings-component[data-component="cub_dashboard"]');
            // Actually, Lampa Settings destroys/creates components on navigation.

            // If we are currently IN cub_dashboard, we want to re-render it.
            // We can use Controller to toggle back and forth?
            // No, that animates.

            // Best bet: Use Lampa internal method to refresh current component.
            // Not exposed.

            // Fallback: Close and Open.
            Lampa.Controller.toggle('settings_component'); // Close
            setTimeout(function () {
                Lampa.Settings.open('cub_dashboard'); // Open
            }, 10);
        };

        this.renderDisplaySettings = function () {
            Lampa.SettingsApi.addParam({
                component: 'cub_dashboard',
                param: {
                    name: 'cub_dash_back',
                    type: 'button'
                },
                field: {
                    name: 'Назад'
                },
                onChange: function () {
                    setTimeout(function () {
                        _this.currentPage = 'main';
                        _this.reopenSettings();
                    }, 10);
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'cub_dashboard',
                param: {
                    name: 'cub_dash_title_display',
                    type: 'title'
                },
                field: {
                    name: 'Настройки отображения'
                }
            });

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




        // Intercept ContentRows (Only for Injection)
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
                }
                return originalCall.apply(this, arguments);
            };
        };

        // Monkey Patch API for Dynamic Rows
        this.monkeyPatchApi = function () {
            // Patch partKeyword to tag keyword rows
            if (Lampa.Api.partKeyword) {
                var originalPartKeyword = Lampa.Api.partKeyword;
                Lampa.Api.partKeyword = function () {
                    var func = originalPartKeyword.apply(this, arguments);
                    if (typeof func === 'function') {
                        func._cub_settings_type = 'keywords';
                    }
                    return func;
                };
            }

            // Patch partPersons to tag person rows
            if (Lampa.Api.partPersons) {
                var originalPartPersons = Lampa.Api.partPersons;
                Lampa.Api.partPersons = function () {
                    var func = originalPartPersons.apply(this, arguments);
                    if (typeof func === 'function') {
                        func._cub_settings_type = 'persons';
                    }
                    return func;
                };
            }

            // Patch partNext to intercept execution of all rows
            if (Lampa.Api.partNext) {
                var originalPartNext = Lampa.Api.partNext;
                Lampa.Api.partNext = function (parts, limit, onLoaded, onEmpty) {
                    // Identify and Sort parts
                    var order = Lampa.Storage.get('cub_dash_order', _this.getDefaultOrder());

                    parts.forEach(function (part) {
                        if (typeof part !== 'function') return;
                        if (part._cub_settings_type) return; // Already tagged

                        var str = part.toString();

                        // Check main sections (URL based)
                        for (var key in sections) {
                            if (str.indexOf(key) !== -1) {
                                part._cub_settings_type = key;
                                break;
                            }
                        }

                        if (!part._cub_settings_type) {
                            if (str.indexOf('sort=now') !== -1 && str.indexOf('sort=now_playing') === -1) part._cub_settings_type = 'now';
                            if (str.indexOf('collections/') !== -1 && str.indexOf('collections/list') === -1) part._cub_settings_type = 'collections/list';
                            if (str.indexOf('genre=') !== -1) part._cub_settings_type = 'genres';
                            // Injected rows are tagged in createInjectedRow, but if not:
                            if (str.indexOf('injected_book') !== -1) part._cub_settings_type = 'book';
                            if (str.indexOf('injected_history') !== -1) part._cub_settings_type = 'history';
                        }
                    });

                    // Sort parts
                    parts.sort(function (a, b) {
                        var aKey = a._cub_settings_type || 'unknown';
                        var bKey = b._cub_settings_type || 'unknown';

                        var aIndex = order.indexOf(aKey);
                        var bIndex = order.indexOf(bKey);

                        if (aIndex === -1 && bIndex === -1) return 0;
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;

                        return aIndex - bIndex;
                    });

                    // Wrap all unwrapped functions in parts
                    for (var i = 0; i < parts.length; i++) {
                        if (typeof parts[i] === 'function' && !parts[i]._cub_wrapped) {
                            parts[i] = _this.wrapRowGenerator(parts[i]);
                        }
                    }
                    return originalPartNext.apply(this, arguments);
                };
            }
        };

        this.getDefaultOrder = function () {
            var keys = [];
            for (var k in sections) keys.push(k);
            for (var k in extra_sections) keys.push(k);
            for (var k in inject_sections) keys.push(k);
            return keys;
        };

        this.wrapRowGenerator = function (originalFunc) {
            var wrapper = function (call) {
                originalFunc(function (json) {
                    // Intecept Result
                    if (!json) return call(json);

                    var urlInfo = json.url || '';
                    var sectionKey = null;

                    // 1. Tag-based detection (from patched partKeyword)
                    if (originalFunc._cub_settings_type) {
                        sectionKey = originalFunc._cub_settings_type;
                    }

                    // 2. URL-based detection
                    if (!sectionKey) {
                        for (var key in sections) {
                            if (urlInfo.indexOf(key) !== -1) {
                                sectionKey = key;
                                break;
                            }
                        }
                        if (urlInfo.indexOf('sort=now') !== -1 && urlInfo.indexOf('sort=now_playing') === -1) sectionKey = 'now';
                        if (urlInfo.indexOf('collections/') !== -1 && urlInfo.indexOf('collections/list') === -1) sectionKey = 'collections/list';
                        if (urlInfo.indexOf('genre=') !== -1) sectionKey = 'genres';

                        // Keywords might have url if not tagged (backup)
                        if (urlInfo.indexOf('discover/movie') !== -1 || urlInfo.indexOf('discover/tv') !== -1) {
                            if (urlInfo.indexOf('with_keywords') !== -1) sectionKey = 'keywords';
                            if (urlInfo.indexOf('with_genres') !== -1) sectionKey = 'genres';
                        }
                    }

                    // 3. Heuristic detection (Persons)
                    // Persons row usually has no URL, but has icon_img.
                    if (!sectionKey && !urlInfo && json.icon_img && json.results && json.results.length > 0) {
                        // Double check it's not our injected row
                        if (json.url !== 'injected_book' && json.url !== 'injected_history') {
                            sectionKey = 'persons';
                        }
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
            wrapper._cub_wrapped = true;
            wrapper._cub_settings_type = originalFunc._cub_settings_type; // Preserve tag
            return wrapper;
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
            func._cub_wrapped = true; // Mark as wrapped so partNext doesn't re-wrap logic (though wrapRowGenerator handles logic too)
            // But wait, createInjectedRow ALREADY applies style and checks existence.
            // partNext wrapper will wrap it again if I don't mark it.
            // My wrapper checks for sectionKey.
            // If I let it wrap, it won't find sectionKey for 'injected_...' unless I add it to heuristic or map.
            // But I handled injected logic inside the createInjectedRow function (it only exists if enabled).
            // So I should mark it as wrapped to avoid double processing or accidental hiding.
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
