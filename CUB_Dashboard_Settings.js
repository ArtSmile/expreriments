
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

        // Initialize Settings
        this.init = function () {
            Lampa.SettingsApi.addComponent({
                component: 'cub_dashboard',
                name: 'Главная - CUB',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/></svg>'
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
        };

        // Intercept ContentRows
        this.interceptContentRows = function () {
            var originalCall = Lampa.ContentRows.call;

            Lampa.ContentRows.call = function (name, params, callbacks) {
                if (name === 'main' && params.source === 'cub') {
                    // Wrap callbacks to modify them
                    var wrappedCallbacks = callbacks.map(function (cb) {
                        return function (result) {
                            if (!result) return cb(result);

                            // Try to identify the section using the result URL or other properties
                            // Note: raw result might not have URL if it came from cache without it, but usually it does.
                            // If it's a function (lazy load), we need to wrap the internal call?
                            // No, ContentRows.call expects an array of functions usually, which call 'call(json)'

                            // Wait, callbacks passed to ContentRows.call are the row GENERATORS (functions).
                            // We need to wrap them so when they are executed, we intercept the data they produce.

                            // Actually, ContentRows.call takes (screen, params, parts_data).
                            // parts_data is the array of functions.

                            // So 'callbacks' here IS 'parts_data'.

                            var originalRowGenerator = cb;

                            return function (done) {
                                originalRowGenerator(function (json) {
                                    if (!json) return done(json);

                                    var urlInfo = json.url || '';
                                    var sectionKey = null;

                                    for (var key in sections) {
                                        if (urlInfo.indexOf(key) !== -1) {
                                            sectionKey = key;
                                            break;
                                        }
                                    }

                                    // Special case for 'now' (filtering year) vs 'now_playing'
                                    if (urlInfo.indexOf('sort=now') !== -1 && urlInfo.indexOf('sort=now_playing') === -1) {
                                        sectionKey = 'now';
                                    }


                                    if (sectionKey) {
                                        var show = Lampa.Storage.get('cub_dash_show_' + sectionKey, true);
                                        var style = Lampa.Storage.get('cub_dash_style_' + sectionKey, 'std');

                                        if (!show) {
                                            // Determine if we should count this as empty or just skip.
                                            // The caller usually expects a result. If we return null/empty, it might load next page.
                                            // But for main page rows, it just renders what comes back.
                                            return done(null);
                                        }

                                        if (style === 'wide') {
                                            if (!json.params) json.params = {};
                                            if (!json.params.style) json.params.style = {};
                                            json.params.style.name = 'wide';

                                            // Usually wide needs specific item rendering
                                            if (!json.params.items) json.params.items = {};
                                            json.params.items.view = 3;

                                            // Force wide style on results if needed
                                            if (json.results) {
                                                json.results.forEach(function (card) {
                                                    if (!card.params) card.params = {};
                                                    if (!card.params.style) card.params.style = {};
                                                    card.params.style.name = 'wide';
                                                });
                                            }
                                        } else if (style === 'vert') {
                                            // Vertical usually means removing 'wide' style and maybe setting view count
                                            if (json.params && json.params.style) delete json.params.style.name;
                                            if (json.results) {
                                                json.results.forEach(function (card) {
                                                    if (card.params && card.params.style) delete card.params.style.name;
                                                });
                                            }
                                            if (!json.params) json.params = {};
                                            if (!json.params.items) json.params.items = {};
                                            json.params.items.view = 5;
                                        } else {
                                            // Standard (reset)
                                            if (json.params && json.params.style && json.params.style.name === 'wide') delete json.params.style.name;
                                            if (json.results) {
                                                json.results.forEach(function (card) {
                                                    if (card.params && card.params.style && card.params.style.name === 'wide') delete card.params.style.name;
                                                });
                                            }
                                        }
                                    }

                                    done(json);
                                });
                            };
                        };
                    });

                    // We modify the array in place or return?
                    // ContentRows.call implementation in source:
                    // rows.filter(...).forEach((row)=>{ let result = row.call(params, screen); ... Arrays.insert(calls, ..., result) })
                    // Wait, ContentRows.call is called BY the page component (e.g. cub.js).
                    // Arguments are: call(screen, params, calls)
                    // 'calls' is the array that will be populated or IS populated?

                    // Looking at cub.js: ContentRows.call('main', params, parts_data)
                    // parts_data is passed AS the third argument 'calls'.
                    // ContentRows.call inserts EXTRA rows into 'calls'.
                    // It does NOT execute the rows.

                    // EXCEPT:
                    // The standard ContentRows.call (as seen in source) modifies the 'calls' array by adding extensions.

                    // BUT Lampa.ContentRows.call is also used to EXECUTE the rows? No, cub.js executes them via Api.partNext logic later.

                    // So, if I want to intercept the rows defined in CUB.js, I need to modify the 'calls' array passed to ContentRows.call before it returns or during the call.
                    // But 'calls' is passed by reference.

                    // Wait, the rows in `parts_data` (passed as `calls`) are the functions I want to wrap.
                    // The `calls` array contains the original CUB functions.
                    // So I can iterate over `calls` (aka `callbacks` in my patch) and replace them!

                    // Yes. `callbacks` is the `parts_data` array from cub.js.

                    for (var i = 0; i < callbacks.length; i++) {
                        var originalFunc = callbacks[i];

                        // Create a closure to capture originalFunc
                        (function (orig, index) {
                            callbacks[index] = function (call) {
                                // execute original
                                orig(function (json) {
                                    // Intercept result
                                    if (!json) return call(json);

                                    var urlInfo = json.url || '';
                                    // console.log('CUB Plugin Intercept:', urlInfo, json);

                                    var sectionKey = null;

                                    for (var key in sections) {
                                        if (urlInfo.indexOf(key) !== -1) {
                                            sectionKey = key;
                                            break;
                                        }
                                    }

                                    // Special detection for 'now' vs 'now_playing'
                                    if (urlInfo.indexOf('sort=now') !== -1 && urlInfo.indexOf('sort=now_playing') === -1) {
                                        sectionKey = 'now';
                                    }

                                    // Special detection for Collection (url is like collections/123)
                                    if (urlInfo.indexOf('collections/') !== -1 && urlInfo.indexOf('collections/list') === -1) {
                                        // The list call itself isn't a row, but the items in it are.
                                        // In cub.js: 
                                        // network.silent(... collections/list ..., (data)=>{ data.results.forEach ... parts_data.push(event) })
                                        // The individual events have url 'collections/' + id
                                        sectionKey = 'collections/list'; // Use the generic key
                                    }


                                    if (sectionKey) {
                                        var show = Lampa.Storage.get('cub_dash_show_' + sectionKey, true);
                                        var style = Lampa.Storage.get('cub_dash_style_' + sectionKey, 'std');

                                        if (!show) {
                                            // Skipping
                                            return call(null);
                                        }

                                        // Apply styles
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
                                            // Standard
                                            if (json.params && json.params.style && json.params.style.name === 'wide') delete json.params.style.name;
                                            if (json.results) {
                                                json.results.forEach(function (card) {
                                                    if (card.params && card.params.style && card.params.style.name === 'wide') delete card.params.style.name;
                                                });
                                            }
                                        }
                                    }

                                    call(json);
                                });
                            };
                        })(originalFunc, i);
                    }
                }

                return originalCall.apply(this, arguments);
            };
        };
    }

    if (window.Lampa) {
        new CUB_Dashboard_Settings().init();
    } else {
        // Fallback or wait for Lampa?
        // Usually plugins are loaded after Lampa is ready or during init.
        // We can just rely on the script being executed after app.js
    }

})();
