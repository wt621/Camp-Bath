let map;
let currentLocationMarker;
let campsiteMarkers = [];

function isCampsite(place) {
  const name = place.name || "";

  const excludeWords = [
    "株式会社",
    "会社",
    "ラボラトリー",
    "オペレーション",
    "小貝川リバーサイドパーク",
    "生牧草専門 中央牧草センター"
  ];

  return !excludeWords.some(word => name.includes(word));
}

function clearCampsiteMarkers() {
  campsiteMarkers.forEach(marker => {
    marker.setMap(null);
  });

  campsiteMarkers = [];
}

function searchCampsites(center) {
  if (!map) {
    console.error("Google Mapsがまだ初期化されていません");
    return;
  }

  const service = new google.maps.places.PlacesService(map);

  const panel = document.getElementById("campsite-panel");
  const panelContent = document.getElementById("campsite-content");

  if (!panel || !panelContent) {
    console.error("キャンプ場パネルが見つかりません");
    return;
  }

  clearCampsiteMarkers();


  service.nearbySearch(
    {
      location: center,
      radius: 50000,
      type: "campground"
    },
    (results, status) => {

      if (
        status !==
        google.maps.places.PlacesServiceStatus.OK
      ) {
        panel.classList.remove("hidden");

        panelContent.innerHTML = `
          <h2>キャンプ場情報</h2>
          <p>キャンプ場が見つかりませんでした</p>
        `;

        return;
      }

      results.forEach(campsite => {

        if (!isCampsite(campsite)) {
          return;
        }

        if (
          !campsite.geometry ||
          !campsite.geometry.location
        ) {
          return;
        }

        const marker = new google.maps.Marker({
          position: campsite.geometry.location,
          map: map,
          title: campsite.name
        });

        campsiteMarkers.push(marker);

        marker.addListener("click", () => {
          openCampsiteDetails(
            campsite,
            service
          );
        });
      });
    }
  );
}

function openCampsiteDetails(
  campsite,
  service
) {

  const panel =
    document.getElementById(
      "campsite-panel"
    );

  const panelContent =
    document.getElementById(
      "campsite-content"
    );

  if (!panel || !panelContent) {
    return;
  }

  const searchContainer =
    document.querySelector(
      ".search-container"
    );

  closeOnsenPanel();
  closeCampsiteImagePanel();
  closeWeatherPanel();

  panel.classList.remove("hidden");

  if (searchContainer) {
    searchContainer.classList.add(
      "campsite-open"
    );

    searchContainer.classList.remove(
      "onsen-open"
    );

    searchContainer.classList.remove(
      "campsite-image-open"
    );
  }

  const closeButton =
    document.getElementById(
      "close-campsite-panel"
    );

  if (closeButton) {
    closeButton.classList.remove(
      "hidden"
    );
  }

  setTimeout(() => {

    if (!map) {
      return;
    }

    const center = map.getCenter();

    google.maps.event.trigger(
      map,
      "resize"
    );

    map.setCenter(center);

  }, 0);

  service.getDetails(
    {
      placeId: campsite.place_id,

      fields: [
        "name",
        "formatted_address",
        "opening_hours",
        "website",
        "geometry",
        "photos",
        "place_id"
      ]
    },

    (place, status) => {

      if (
        status !==
        google.maps.places.PlacesServiceStatus.OK
      ) {

        panelContent.innerHTML = `
          <h2>キャンプ場情報</h2>
          <p>
            キャンプ場の詳細情報が取得できませんでした
          </p>
        `;

        return;
      }

      searchNearbyOnsens(
        place,
        service
      );
    }
  );
}

function searchNearbyOnsens(
  campsite,
  service
) {

  const panelContent =
    document.getElementById(
      "campsite-content"
    );

  if (!panelContent) {
    return;
  }

  service.nearbySearch(
    {
      location:
        campsite.geometry.location,

      radius: 10000,

      keyword: "温泉"
    },

    (results, status) => {

      let onsenListHTML = "";
      let topThreeOnsens = [];

      if (
        status ===
          google.maps.places.PlacesServiceStatus.OK &&
        results.length > 0
      ) {

        const resultsWithDistance =
          results.map(onsen => {

            const distanceInMeters =
              google.maps.geometry.spherical
                .computeDistanceBetween(
                  campsite.geometry.location,
                  onsen.geometry.location
                );

            return {
              ...onsen,
              distance: distanceInMeters
            };
          });

        const sortedResults =
          resultsWithDistance.sort(
            (a, b) =>
              a.distance - b.distance
          );

        topThreeOnsens =
          sortedResults.slice(
            0,
            3
          );

        onsenListHTML = `
          <h2>付近の温泉施設情報</h2>

          <div class="onsen-list">
        `;

        topThreeOnsens.forEach(
          onsen => {

            const distanceKm =
              (
                onsen.distance / 1000
              ).toFixed(1);

            onsenListHTML += `
              <div
                class="onsen-item detail-box"
                data-place-id="${onsen.place_id}"
              >

                <h3>
                  ${onsen.name}
                </h3>

                <p>
                  <strong>住所</strong>
                </p>

                <p class="onsen-address">
                  ${
                    onsen.vicinity ||
                    "住所情報なし"
                  }
                </p>

                <p class="onsen-distance">
                  キャンプ場から約 ${distanceKm} km
                </p>

              </div>
            `;
          }
        );

        onsenListHTML += `
          </div>
        `;

      } else {

        onsenListHTML = `
          <h2>付近の温泉施設情報</h2>

          <p>
            近くに温泉が見つかりませんでした
          </p>
        `;
      }

      panelContent.innerHTML = `

        <h2>キャンプ場情報</h2>

        <div class="detail-box">

          <h3>
            ${campsite.name}
          </h3>

          <p>
            <strong>住所</strong>
          </p>

          <p>
            ${
              campsite.formatted_address ||
              "情報なし"
            }
          </p>

          <p>
            <strong>営業時間</strong>
          </p>

          <p>
            ${
              campsite.opening_hours
                ? campsite.opening_hours.weekday_text.join("<br>")
                : "情報なし"
            }
          </p>

          <p>
            <strong>公式サイト</strong>
          </p>

          <p>
            ${
              campsite.website
                ? `<a href="${campsite.website}" target="_blank">ウェブサイトを見る</a>`
                : "情報なし"
            }
          </p>

          <button
            id="campsite-image-open-button"
            type="button"
            class="campsite-image-button"
          >
            キャンプ場の画像を見る
          </button>

          <button
            id="weather-open-button"
            type="button"
            class="campsite-image-button"
          >
            キャンプ場の天気を見る
          </button>

        </div>

        ${onsenListHTML}

      `;

      setupCampsiteImageButton(
        campsite
      );

      setupWeatherButton(
        campsite
      );

      if (
        topThreeOnsens.length > 0
      ) {

        setupOnsenClickEvents(
          topThreeOnsens,
          service
        );
      }
    }
  );
}

function setupCampsiteImageButton(
  campsite
) {

  const button =
    document.getElementById(
      "campsite-image-open-button"
    );

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    () => {

      openCampsiteImagePanel(
        campsite
      );
    }
  );
}

function openCampsiteImagePanel(campsite) {
  const searchContainer =
    document.querySelector(
      ".search-container"
    );

  const imagePanel =
    document.getElementById(
      "campsite-image-panel"
    );

  const imageContent =
    document.getElementById(
      "campsite-image-content"
    );

  const closeButton =
    document.getElementById(
      "close-campsite-image-panel"
    );

  if (
    !searchContainer ||
    !imagePanel ||
    !imageContent
  ) {
    console.error(
      "キャンプ場画像パネルが見つかりません"
    );

    return;
  }

  closeOnsenPanel();
  closeWeatherPanel();

  imagePanel.classList.remove(
    "hidden"
  );

  searchContainer.classList.add(
    "campsite-image-open"
  );

  searchContainer.classList.remove(
    "onsen-open"
  );

  if (closeButton) {
    closeButton.classList.remove(
      "hidden"
    );
  }

  imageContent.innerHTML = `
    <h2>キャンプ場画像</h2>

    <div class="campsite-image-loading">
      <p>画像を読み込んでいます...</p>
    </div>
  `;

  resizeMap();

  if (
    typeof google === "undefined" ||
    !google.maps ||
    !google.maps.places
  ) {
    console.error(
      "Google Maps Places APIが利用できません"
    );

    imageContent.innerHTML = `
      <h2>キャンプ場画像</h2>

      <p>
        画像を取得できませんでした。
      </p>
    `;

    return;
  }

  const service =
    new google.maps.places.PlacesService(
      map
    );

  service.getDetails(
    {
      placeId: campsite.place_id,

      fields: [
        "name",
        "photos"
      ]
    },

    (place, status) => {
      if (
        status !==
          google.maps.places.PlacesServiceStatus.OK ||
        !place
      ) {
        console.error(
          "キャンプ場の画像情報を取得できませんでした:",
          status
        );

        imageContent.innerHTML = `
          <h2>キャンプ場画像</h2>

          <div class="campsite-image-placeholder">
            <div class="campsite-image-placeholder-icon">
              🏕️
            </div>

            <p>
              ${campsite.name}
            </p>

            <p class="image-placeholder-text">
              画像を取得できませんでした
            </p>
          </div>
        `;

        return;
      }

      if (
        !place.photos ||
        place.photos.length === 0
      ) {
        imageContent.innerHTML = `
          <h2>キャンプ場画像</h2>

          <div class="campsite-image-placeholder">
            <div class="campsite-image-placeholder-icon">
              🏕️
            </div>

            <p>
              ${place.name || campsite.name}
            </p>

            <p class="image-placeholder-text">
              このキャンプ場の画像はありません
            </p>
          </div>
        `;

        return;
      }

      const photo =
        place.photos[0];

      const imageUrl =
        photo.getUrl({
          maxWidth: 800,
          maxHeight: 600
        });

      let attributionHTML = "";

      if (
        photo.html_attributions &&
        photo.html_attributions.length > 0
      ) {
        attributionHTML = `
          <div class="campsite-image-attribution">
            ${photo.html_attributions.join(" ")}
          </div>
        `;
      }

      imageContent.innerHTML = `
        <h2>キャンプ場画像</h2>

        <div class="campsite-image-container">

          <img
            src="${imageUrl}"
            alt="${place.name || campsite.name}"
            class="campsite-image"
          >

          <p class="campsite-image-name">
            ${place.name || campsite.name}
          </p>

          ${attributionHTML}

        </div>
      `;
    }
  );
}

function formatDateLabel(dateString, index) {

  const date = new Date(dateString);

  const dayOfWeek = [
    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土"
  ][date.getDay()];

  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (index === 0) {

    return `昨日${month}/${day}(${dayOfWeek})`;

  } else if (index === 1) {

    return `今日${month}/${day}(${dayOfWeek})`;

  } else if (index === 2) {

    return `明日${month}/${day}(${dayOfWeek})`;

  } else {

    return `${month}/${day}(${dayOfWeek})`;

  }
}

function getWeatherDescription(weatherCode) {

  const weatherDescriptions = {

    0: {
      description: "快晴",
      icon: "☀️"
    },

    1: {
      description: "晴れ",
      icon: "🌤️"
    },

    2: {
      description: "一部曇り",
      icon: "⛅"
    },

    3: {
      description: "曇り",
      icon: "☁️"
    },

    45: {
      description: "霧",
      icon: "🌫️"
    },

    48: {
      description: "霧",
      icon: "🌫️"
    },

    51: {
      description: "弱い霧雨",
      icon: "🌦️"
    },

    53: {
      description: "霧雨",
      icon: "🌦️"
    },

    55: {
      description: "強い霧雨",
      icon: "🌧️"
    },

    61: {
      description: "弱い雨",
      icon: "🌧️"
    },

    63: {
      description: "雨",
      icon: "🌧️"
    },

    65: {
      description: "強い雨",
      icon: "🌧️"
    },

    71: {
      description: "弱い雪",
      icon: "🌨️"
    },

    73: {
      description: "雪",
      icon: "❄️"
    },

    75: {
      description: "強い雪",
      icon: "❄️"
    },

    80: {
      description: "弱いにわか雨",
      icon: "🌦️"
    },

    81: {
      description: "にわか雨",
      icon: "🌧️"
    },

    82: {
      description: "強いにわか雨",
      icon: "🌧️"
    },

    85: {
      description: "弱いにわか雪",
      icon: "🌨️"
    },

    86: {
      description: "強いにわか雪",
      icon: "❄️"
    },

    95: {
      description: "雷雨",
      icon: "⛈️"
    },

    96: {
      description: "雷雨・ひょう",
      icon: "⛈️"
    },

    99: {
      description: "強い雷雨・ひょう",
      icon: "⛈️"
    }

  };

  return (
    weatherDescriptions[weatherCode] || {
      description: "天気情報なし",
      icon: "❓"
    }
  );
}

function setupWeatherButton(campsite) {

  const button =
    document.getElementById(
      "weather-open-button"
    );

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    () => {

      openWeatherPanel(
        campsite
      );

    }
  );
}


function openWeatherPanel(campsite) {

  const searchContainer =
    document.querySelector(
      ".search-container"
    );

  const weatherPanel =
    document.getElementById(
      "weather-panel"
    );

  const weatherContent =
    document.getElementById(
      "weather-content"
    );

  const closeButton =
    document.getElementById(
      "close-weather-panel"
    );

  if (
    !searchContainer ||
    !weatherPanel ||
    !weatherContent
  ) {

    console.error(
      "天気パネルが見つかりません"
    );

    return;
  }

  closeOnsenPanel();
  closeCampsiteImagePanel();
  closeWeatherPanel();

  weatherPanel.classList.remove(
    "hidden"
  );

  searchContainer.classList.add(
    "weather-open"
  );

  fetchWeatherForecast(
    campsite
  );

  searchContainer.classList.remove(
    "onsen-open"
  );

  searchContainer.classList.remove(
    "campsite-image-open"
  );

  if (closeButton) {

    closeButton.classList.remove(
      "hidden"
    );
  }

  resizeMap();
}

async function fetchWeatherForecast(campsite) {

  const weatherContent =
    document.getElementById(
      "weather-content"
    );

  if (!weatherContent) {
    return;
  }

  if (
    !campsite.geometry ||
    !campsite.geometry.location
  ) {

    weatherContent.innerHTML = `
      <h2>キャンプ場の天気</h2>

      <p>
        キャンプ場の位置情報を取得できませんでした。
      </p>
    `;

    return;
  }

  const latitude =
    campsite.geometry.location.lat();

  const longitude =
    campsite.geometry.location.lng();

  weatherContent.innerHTML = `
    <h2>キャンプ場の天気</h2>

    <div class="weather-loading">
      <p>天気情報を取得中です。</p>
    </div>
  `;

  try {

    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&timezone=Asia%2FTokyo" +
      "&past_days=1" +
      "&forecast_days=7";

    const response =
      await fetch(url);

    if (!response.ok) {

      throw new Error(
        `Open-Meteo API error: ${response.status}`
      );

    }

    const data =
      await response.json();

    if (
      !data.daily ||
      !data.daily.time ||
      data.daily.time.length === 0
    ) {

      throw new Error(
        "天気予報データが取得できませんでした"
      );

    }

    let weatherListHTML = "";

    data.daily.time.forEach(
      (date, index) => {

        const weatherCode =
          data.daily.weather_code[index];

        const maxTemperature =
          data.daily.temperature_2m_max[index];

        const minTemperature =
          data.daily.temperature_2m_min[index];

        const precipitationProbability =
          data.daily.precipitation_probability_max[index];

        const weather =
          getWeatherDescription(
            weatherCode
          );

        weatherListHTML += `
          <div class="detail-box">
            <h3>
              ${formatDateLabel(date, index)}
            </h3>

            <p>
              <strong>天気</strong>
            </p>

            <p>
              ${weather.icon}
              ${weather.description}
            </p>

            <p>
              <strong>最高気温</strong>
            </p>

            <p>
              ${
                maxTemperature !== null &&
                maxTemperature !== undefined
                  ? `${maxTemperature}℃`
                  : "情報なし"
              }
            </p>

            <p>
              <strong>最低気温</strong>
            </p>

            <p>
              ${
                minTemperature !== null &&
                minTemperature !== undefined
                  ? `${minTemperature}℃`
                  : "情報なし"
              }
            </p>

            <p>
              <strong>降水確率</strong>
            </p>

            <p>
              ${
                precipitationProbability !== null &&
                precipitationProbability !== undefined
                  ? `${precipitationProbability}%`
                  : "情報なし"
              }
            </p>

          </div>

        `;
      }
    );

    weatherContent.innerHTML = `

      <h2>キャンプ場の天気</h2>

      <div class="detail-box">

        <h3>
          ${campsite.name}
        </h3>

        <p>
          前日と１週間分の天気情報です。
        </p>

      </div>

      ${weatherListHTML}

    `;

  } catch (error) {

    console.error(
      "天気予報の取得に失敗しました:",
      error
    );

    weatherContent.innerHTML = `

      <h2>キャンプ場の天気</h2>

      <div class="detail-box">

        <h3>
          ${campsite.name}
        </h3>

        <p>
          天気予報を取得できませんでした。
        </p>

        <p>
          時間をおいてもう一度お試しください。
        </p>

      </div>

    `;
  }
}

function closeCampsiteImagePanel() {

  const searchContainer =
    document.querySelector(
      ".search-container"
    );

  const imagePanel =
    document.getElementById(
      "campsite-image-panel"
    );

  const imageContent =
    document.getElementById(
      "campsite-image-content"
    );

  const closeButton =
    document.getElementById(
      "close-campsite-image-panel"
    );


  if (searchContainer) {

    searchContainer.classList.remove(
      "campsite-image-open"
    );
  }


  if (imagePanel) {

    imagePanel.classList.add(
      "hidden"
    );
  }


  if (closeButton) {

    closeButton.classList.add(
      "hidden"
    );
  }


  if (imageContent) {

    imageContent.innerHTML = `
      <h2>キャンプ場画像</h2>
      <p>画像を表示するにはボタンを押してください</p>
    `;
  }


  resizeMap();
}

function closeWeatherPanel() {

  const searchContainer =
    document.querySelector(
      ".search-container"
    );

  const weatherPanel =
    document.getElementById(
      "weather-panel"
    );

  const weatherContent =
    document.getElementById(
      "weather-content"
    );

  const closeButton =
    document.getElementById(
      "close-weather-panel"
    );

  if (searchContainer) {

    searchContainer.classList.remove(
      "weather-open"
    );

  }

  if (weatherPanel) {

    weatherPanel.classList.add(
      "hidden"
    );

  }

  if (closeButton) {

    closeButton.classList.add(
      "hidden"
    );

  }

  if (weatherContent) {

    weatherContent.innerHTML = `

      <h2>
        キャンプ場の天気
      </h2>

      <p>
        天気予報を表示するには
        ボタンを押してください
      </p>

    `;

  }

  resizeMap();
}

function setupOnsenClickEvents(
  onsens,
  service
) {

  const onsenItems =
    document.querySelectorAll(
      ".onsen-item"
    );

  onsenItems.forEach(item => {

    item.addEventListener(
      "click",
      () => {

        const placeId =
          item.getAttribute(
            "data-place-id"
          );

        const selectedOnsen =
          onsens.find(
            onsen =>
              onsen.place_id ===
              placeId
          );

        if (!selectedOnsen) {
          return;
        }


        service.getDetails(
          {
            placeId:
              selectedOnsen.place_id,

            fields: [
              "name",
              "formatted_address",
              "opening_hours",
              "website",
              "photos"
            ]
          },

          (place, status) => {

            if (
              status !==
              google.maps.places.PlacesServiceStatus.OK
            ) {

              console.error(
                "温泉の詳細情報が取得できませんでした"
              );

              return;
            }


            const searchContainer =
              document.querySelector(
                ".search-container"
              );

            const onsenPanel =
              document.getElementById(
                "onsen-panel"
              );

            const onsenContent =
              document.getElementById(
                "onsen-content"
              );


            if (
              !onsenPanel ||
              !onsenContent
            ) {
              return;
            }

            closeCampsiteImagePanel();
            closeWeatherPanel();


            onsenPanel.classList.remove(
              "hidden"
            );


            if (searchContainer) {

              searchContainer.classList.add(
                "onsen-open"
              );

              searchContainer.classList.remove(
                "campsite-image-open"
              );
            }


            const closeOnsenButton =
              document.getElementById(
                "close-onsen-panel"
              );


            if (closeOnsenButton) {

              closeOnsenButton.classList.remove(
                "hidden"
              );
            }


            setTimeout(() => {

              if (!map) {
                return;
              }

              const center =
                map.getCenter();

              google.maps.event.trigger(
                map,
                "resize"
              );

              map.setCenter(center);

            }, 0);


            onsenContent.innerHTML = `

              <h2>
                温泉施設情報
              </h2>

              <div class="detail-box">

                <h3>
                  ${place.name}
                </h3>

                <p>
                  <strong>住所</strong>
                </p>

                <p>
                  ${
                    place.formatted_address ||
                    "情報なし"
                  }
                </p>

                <p>
                  <strong>営業時間</strong>
                </p>

                <p>
                  ${
                    place.opening_hours
                      ? place.opening_hours.weekday_text.join("<br>")
                      : "情報なし"
                  }
                </p>

                <p>
                  <strong>公式サイト</strong>
                </p>

                <p>
                  ${
                    place.website
                      ? `<a href="${place.website}" target="_blank">ウェブサイトを見る</a>`
                      : "情報なし"
                  }
                </p>

              </div>

            `;
          }
        );
      }
    );
  });
}

function resizeMap() {

  setTimeout(() => {

    if (!map) {
      return;
    }

    const center =
      map.getCenter();

    google.maps.event.trigger(
      map,
      "resize"
    );

    map.setCenter(
      center
    );

  }, 0);
}

function initMap() {

  const center =
    window.searchCenter || {
      lat: 35.681236,
      lng: 139.767125
    };


  const mapElement =
    document.getElementById(
      "map"
    );


  if (
    !mapElement ||
    typeof google === "undefined" ||
    !google.maps
  ) {

    console.error(
      "map element not found or Google Maps API not loaded"
    );

    return;
  }


  map =
    new google.maps.Map(
      mapElement,
      {
        zoom: 8,
        center: center
      }
    );


  searchCampsites(
    center
  );
}

function setupCloseButtons() {

  const closeButton =
    document.getElementById(
      "close-campsite-panel"
    );


  if (closeButton) {

    closeButton.replaceWith(
      closeButton.cloneNode(true)
    );


    const newCloseButton =
      document.getElementById(
        "close-campsite-panel"
      );


    newCloseButton.addEventListener(
      "click",
      () => {

        const searchContainer =
          document.querySelector(
            ".search-container"
          );


        if (searchContainer) {

          searchContainer.classList.remove(
            "campsite-open"
          );

          searchContainer.classList.remove(
            "onsen-open"
          );

          searchContainer.classList.remove(
            "campsite-image-open"
          );
        }


        const campsitePanel =
          document.getElementById(
            "campsite-panel"
          );


        if (campsitePanel) {

          campsitePanel.classList.add(
            "hidden"
          );
        }


        newCloseButton.classList.add(
          "hidden"
        );


        closeOnsenPanel();
        closeCampsiteImagePanel();
        closeWeatherPanel();


        const panelContent =
          document.getElementById(
            "campsite-content"
          );


        if (panelContent) {

          panelContent.innerHTML = `
            <h2>キャンプ場情報</h2>
            <p>キャンプ場を選択してください</p>
          `;
        }


        resizeMap();
      }
    );
  }

  const closeOnsenButton =
    document.getElementById(
      "close-onsen-panel"
    );


  if (closeOnsenButton) {

    closeOnsenButton.replaceWith(
      closeOnsenButton.cloneNode(true)
    );


    const newCloseOnsenButton =
      document.getElementById(
        "close-onsen-panel"
      );


    newCloseOnsenButton.addEventListener(
      "click",
      () => {

        closeOnsenPanel();
        closeWeatherPanel();
      }
    );
  }

  const closeImageButton =
    document.getElementById(
      "close-campsite-image-panel"
    );


  if (closeImageButton) {

    closeImageButton.replaceWith(
      closeImageButton.cloneNode(true)
    );


    const newCloseImageButton =
      document.getElementById(
        "close-campsite-image-panel"
      );


    newCloseImageButton.addEventListener(
      "click",
      () => {

        closeCampsiteImagePanel();
        closeWeatherPanel();
      }
    );
    const closeWeatherButton =
      document.getElementById(
        "close-weather-panel"
      );

    if (closeWeatherButton) {

      closeWeatherButton.replaceWith(
        closeWeatherButton.cloneNode(true)
      );

      const newCloseWeatherButton =
        document.getElementById(
          "close-weather-panel"
        );

      newCloseWeatherButton.addEventListener(
        "click",
        () => {

          closeWeatherPanel();
        }
      );
    }
  }
}

function closeOnsenPanel() {

  const searchContainer =
    document.querySelector(
      ".search-container"
    );

  const onsenPanel =
    document.getElementById(
      "onsen-panel"
    );

  const onsenContent =
    document.getElementById(
      "onsen-content"
    );

  const closeOnsenButton =
    document.getElementById(
      "close-onsen-panel"
    );


  if (searchContainer) {

    searchContainer.classList.remove(
      "onsen-open"
    );
  }


  if (onsenPanel) {

    onsenPanel.classList.add(
      "hidden"
    );
  }


  if (closeOnsenButton) {

    closeOnsenButton.classList.add(
      "hidden"
    );
  }


  if (onsenContent) {

    onsenContent.innerHTML = `
      <h2>温泉施設情報</h2>
      <p>温泉を選択してください</p>
    `;
  }
}

function setupCurrentLocationButton() {

  const button =
    document.getElementById(
      "current-location-button"
    );


  if (!button) {
    return;
  }


  button.replaceWith(
    button.cloneNode(true)
  );


  const newButton =
    document.getElementById(
      "current-location-button"
    );


  newButton.addEventListener(
    "click",
    () => {

      if (!navigator.geolocation) {

        alert(
          "このブラウザでは現在地を取得できません。"
        );

        return;
      }


      newButton.disabled = true;
      
      navigator.geolocation.getCurrentPosition(

        position => {

          const currentLocation = {
            lat:
              position.coords.latitude,

            lng:
              position.coords.longitude
          };


          const accuracy =
            position.coords.accuracy;

          if (accuracy > 5000) {

            alert(
              `現在地の取得精度が低いため、正確な位置ではない可能性があります。\n` +
              `推定誤差：約${Math.round(
                accuracy / 1000
              )}km`
            );
          }


          if (!map) {

            console.error(
              "Google Mapsがまだ初期化されていません"
            );

            newButton.disabled = false;

            return;
          }


          map.setCenter(
            currentLocation
          );


          map.setZoom(
            15
          );


          if (currentLocationMarker) {

            currentLocationMarker.setMap(
              null
            );
          }


          currentLocationMarker =
            new google.maps.Marker({
              position:
                currentLocation,

              map:
                map,

              title:
                "現在地"
            });

          searchCampsites(
            currentLocation
          );

          const searchContainer =
            document.querySelector(
              ".search-container"
            );


          if (searchContainer) {

            searchContainer.classList.remove(
              "campsite-open"
            );

            searchContainer.classList.remove(
              "onsen-open"
            );

            searchContainer.classList.remove(
              "campsite-image-open"
            );

            searchContainer.classList.remove(
              "weather-open"
            );
          }


          const campsitePanel =
            document.getElementById(
              "campsite-panel"
            );


          if (campsitePanel) {

            campsitePanel.classList.add(
              "hidden"
            );
          }


          const onsenPanel =
            document.getElementById(
              "onsen-panel"
            );


          if (onsenPanel) {

            onsenPanel.classList.add(
              "hidden"
            );
          }


          const imagePanel =
            document.getElementById(
              "campsite-image-panel"
            );


          if (imagePanel) {

            imagePanel.classList.add(
              "hidden"
            );
          }

          const weatherPanel =
            document.getElementById(
              "weather-panel"
            );

          if (weatherPanel) {

            weatherPanel.classList.add(
              "hidden"
            );
          }

          const closeCampsiteButton =
            document.getElementById(
              "close-campsite-panel"
            );


          if (closeCampsiteButton) {

            closeCampsiteButton.classList.add(
              "hidden"
            );
          }


          const closeOnsenButton =
            document.getElementById(
              "close-onsen-panel"
            );


          if (closeOnsenButton) {

            closeOnsenButton.classList.add(
              "hidden"
            );
          }


          const closeImageButton =
            document.getElementById(
              "close-campsite-image-panel"
            );


          if (closeImageButton) {

            closeImageButton.classList.add(
              "hidden"
            );
          }

          const closeWeatherButton =
            document.getElementById(
              "close-weather-panel"
            );

          if (closeWeatherButton) {

            closeWeatherButton.classList.add(
              "hidden"
            );
          }

          newButton.disabled = false;
        },


        error => {

          console.error(
            "現在地を取得できませんでした:",
            error
          );


          let message =
            "現在地を取得できませんでした。";


          switch (error.code) {

            case error.PERMISSION_DENIED:

              message =
                "位置情報の使用が拒否されています。ブラウザの位置情報設定を確認してください。";

              break;


            case error.POSITION_UNAVAILABLE:

              message =
                "現在地を取得できませんでした。GPSや位置情報サービスを確認してください。";

              break;


            case error.TIMEOUT:

              message =
                "現在地の取得がタイムアウトしました。もう一度お試しください。";

              break;
          }


          alert(
            message
          );


          newButton.disabled = false;
        },


        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  );
}

function setupMapPage() {

  const mapElement =
    document.getElementById(
      "map"
    );


  if (!mapElement) {
    return;
  }


  if (
    typeof google !== "undefined" &&
    google.maps
  ) {

    initMap();

  } else {

    const checkGoogleMaps =
      setInterval(
        () => {

          if (
            typeof google !== "undefined" &&
            google.maps
          ) {

            clearInterval(
              checkGoogleMaps
            );

            initMap();
          }

        },
        100
      );
  }


  setupCloseButtons();

  setupCurrentLocationButton();
}

document.addEventListener(
  "turbo:load",
  () => {
    setupMapPage();
  }
);

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupMapPage();
  }
);
