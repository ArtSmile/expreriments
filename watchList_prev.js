(function () {
    'use strict';

    function WatchList(object) {
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            step: 250
        });
        var items = [];
        var html = $('<div></div>');
        var body = $('<div class="watchlist-body"></div>');
        var info;

        this.create = function () {
            var _this = this;

            this.activity.loader(true);

            Lampa.Background.change(null);

            info = Lampa.Template.get('info');

            info.find('.info__title').text('Буду смотреть');
            info.find('.info__right').remove();

            html.append(info);
            html.append(scroll.render());

            scroll.append(body);

            this.build();

            this.activity.loader(false);
            this.activity.toggle();
        };

        this.build = function () {
            var raw = Lampa.Storage.get('kinopoisk_movies', []);
            var movies = [];
            var tvs = [];

            // Filter items
            raw.forEach(function (item) {
                if (item.name) tvs.push(item);
                else movies.push(item);
            });

            this.renderLine(movies, 'Фильмы', 'movie');
            this.renderLine(tvs, 'Сериалы', 'tv');

            if (movies.length === 0 && tvs.length === 0) {
                var empty = Lampa.Template.get('empty');
                empty.find('.empty__title').text('Список пуст');
                empty.find('.empty__descr').text('Добавьте фильмы или сериалы в "Буду смотреть" на Кинопоиске');
                body.append(empty);
            }
        };

        this.renderLine = function (data, title, type) {
            if (data.length === 0) return;

            var limit = 20;
            var cut = data.slice(0, limit);
            var more = data.length > limit;

            if (more) {
                cut.push({
                    title: 'Ещё',
                    url: '',
                    ready: true,
                    not_image: true,
                    more: true,
                    type: type // pass type to handle click
                });
            }

            var line = new Lampa.Line({
                title: title,
                card_events: {
                    onHover: function () { },
                    onEnter: function (card, object) {
                        if (object.more) {
                            Lampa.Activity.push({
                                url: '',
                                title: title,
                                component: 'watchlist_view',
                                type: type,
                                page: 1
                            });
                        } else {
                            Lampa.Activity.push({
                                url: object.url,
                                component: 'full',
                                id: object.id,
                                method: object.name ? 'tv' : 'movie',
                                card: object
                            });
                        }
                    }
                },
                items: cut
            });

            line.create();
            body.append(line.render());
        };

        this.destroy = function () {
            scroll.destroy();
            html.remove();
        };
    }

    function WatchListView(object) {
        var comp = new Lampa.InteractionCategory(object);

        comp.create = function () {
            this.build(this.getResults());
        };

        comp.nextPageReuest = function (object, resolve, reject) {
            // No pagination needed strictly if local, but required by interface
            reject();
        };

        comp.getResults = function () {
            var raw = Lampa.Storage.get('kinopoisk_movies', []);
            var data = raw.filter(function (item) {
                if (object.type == 'tv') return item.name;
                return !item.name;
            });

            return {
                results: data,
                page: 1,
                total_pages: 1
            };
        }

        return comp;
    }

    function startPlugin() {
        window.plugin_watchlist_ready = true;

        Lampa.Component.add('watchlist', WatchList);
        Lampa.Component.add('watchlist_view', WatchListView);

        // Add menu item
        Lampa.Listener.follow('menu', function (e) {
            if (e.type == 'start') {
                var html = e.body;
                var item = $('<div class="menu__item selector" data-action="watchlist"><div class="menu__ico"><svg height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="menu__text">Буду смотреть</div></div>');

                item.on('hover:enter', function () {
                    Lampa.Activity.push({
                        url: '',
                        title: 'Буду смотреть',
                        component: 'watchlist',
                        page: 1
                    });
                });

                var main = html.find('[data-action="main"]');
                if (main.length) {
                    main.after(item);
                } else {
                    html.find('.menu__list').eq(0).prepend(item);
                }
            }
        });
    }

    if (!window.plugin_watchlist_ready) {
        startPlugin();
    }

})();
