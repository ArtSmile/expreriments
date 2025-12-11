(function () {
  //(English Only - Clean Version)
  "use strict";

  async function titleOrigin(card) {
    var params = {
      id: card.id,
      url: "https://worker-patient-dream-26d7.bdvburik.workers.dev:8443/https://api.themoviedb.org/3/movie/",
      urlEnd: "&api_key=4ef0d7355d9ffb5151e987764708ce96",
    };

    if (card.first_air_date) {
      params.url = "https://worker-patient-dream-26d7.bdvburik.workers.dev:8443/https://api.themoviedb.org/3/tv/";
      params.urlEnd = "&api_key=4ef0d7355d9ffb5151e987764708ce96";
    }

    var getOptions = {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    };

    // Оставили только одну функцию - получение английского
    async function getEnTitle() {
      var title;
      await fetch(
        params.url + params.id + "?language=en-US" + params.urlEnd,
        getOptions
      )
        .then((response) => response.json())
        .then((e) => (title = e.title || e.name));

      return title;
    }

    var etEnTitle = await getEnTitle();
    _showEnTitle(etEnTitle);

    function _showEnTitle(data) {
      if (data) {
        var render = Lampa.Activity.active().activity.render();
        
        // Убраны все проверки Lampa.Storage и переменная ru
        
        $(".original_title", render)
          .find("> div")
          .eq(0)
          .after(
            `<div id='titleen' style='margin-bottom: 0.6em;'>
                <div style='font-size: 0.9em; color: #a5a5a5; line-height: 1.2;'>
                    ${data} 
                </div>
             </div>`
          );
      }
    }
  }

  function startPlugin() {
    window.title_plugin = true;
    Lampa.Listener.follow("full", function (e) {
      if (e.type == "complite") {
        var render = e.object.activity.render();
        $(".original_title", render).remove();
        
        // Настройки стиля блока-контейнера
        $(".full-start-new__title", render).after(
          '<div class="original_title" style="margin-top:-0.8em; text-align: left;"><div>'
        );
        
        titleOrigin(e.data.movie);
        
        // Коррекция отступов элементов интерфейса Lampa
        $(".full-start-new__rate-line").css("margin-bottom", "0.8em");
        $(".full-start-new__details").css("margin-bottom", "0.8em");
        $(".full-start-new__tagline").css("margin-bottom", "0.4em");
      }
    });
  }
  if (!window.title_plugin) startPlugin();
})();
