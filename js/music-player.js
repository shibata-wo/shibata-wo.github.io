function clockUpdateTime(info, city) {
  let currentColor = "#000";
  switch (info.now.icon) {
    case "100":
      currentColor = "#fdcc45";
      break;
    case "101":
      currentColor = "#fe6976";
      break;
    case "102":
    case "103":
      currentColor = "#fe7f5b";
      break;
    case "104":
    case "150":
    case "151":
    case "152":
    case "153":
    case "154":
    case "800":
    case "801":
    case "802":
    case "803":
    case "804":
    case "805":
    case "806":
    case "807":
      currentColor = "#2152d1";
      break;
    case "300":
    case "301":
    case "305":
    case "306":
    case "307":
    case "308":
    case "309":
    case "310":
    case "311":
    case "312":
    case "313":
    case "314":
    case "315":
    case "316":
    case "317":
    case "318":
    case "350":
    case "351":
    case "399":
      currentColor = "#49b1f5";
      break;
    case "302":
    case "303":
    case "304":
      currentColor = "#fdcc46";
      break;
    case "400":
    case "401":
    case "402":
    case "403":
    case "404":
    case "405":
    case "406":
    case "407":
    case "408":
    case "409":
    case "410":
    case "456":
    case "457":
    case "499":
      currentColor = "#a3c2dc";
      break;
    case "500":
    case "501":
    case "502":
    case "503":
    case "504":
    case "507":
    case "508":
    case "509":
    case "510":
    case "511":
    case "512":
    case "513":
    case "514":
    case "515":
      currentColor = "#97acba";
      break;
    case "900":
    case "999":
      currentColor = "red";
      break;
    case "901":
      currentColor = "#179fff;";
      break;
    default:
      break;
  }
  var clock_box = document.getElementById("hexo_electric_clock");
  clock_box_html = `
  <div class="clock-row">
    <span id="card-clock-clockdate" class="card-clock-clockdate"></span>
    <span class="card-clock-weather"><i class="qi-${info.now.icon}-fill" style="color:${currentColor}"></i> ${info.now.text}<span>${info.now.temp}</span> ℃</span>
    <span class="card-clock-humidity">💧 ${info.now.humidity}%</span>
  </div>
  <div class="clock-row">
    <span id="card-clock-time" class="card-clock-time"></span>
  </div>
  <div class="clock-row">
    <span class="card-clock-windDir"> <i class="qi-gale"></i> ${info.now.windDir}</span>
    <span class="card-clock-location">${city}</span>
    <span id="card-clock-dackorlight" class="card-clock-dackorlight"></span>
  </div>
  `;
  var week = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  var card_clock_loading_dom = document.getElementById("card-clock-loading");
  if (card_clock_loading_dom) {
    card_clock_loading_dom.innerHTML = "";
  }
  clock_box.innerHTML = clock_box_html;
  function updateTime() {
    var cd = new Date();
    var card_clock_time =
      zeroPadding(cd.getHours(), 2) + ":" + zeroPadding(cd.getMinutes(), 2) + ":" + zeroPadding(cd.getSeconds(), 2);
    var card_clock_date =
      zeroPadding(cd.getFullYear(), 4) +
      "-" +
      zeroPadding(cd.getMonth() + 1, 2) +
      "-" +
      zeroPadding(cd.getDate(), 2) +
      " " +
      week[cd.getDay()];
    var card_clock_dackorlight = cd.getHours();
    var card_clock_dackorlight_str;
    if (card_clock_dackorlight > 12) {
      card_clock_dackorlight -= 12;
      card_clock_dackorlight_str = " P M";
    } else {
      card_clock_dackorlight_str = " A M";
    }
    if (document.getElementById("card-clock-time")) {
      var card_clock_time_dom = document.getElementById("card-clock-time");
      var card_clock_date_dom = document.getElementById("card-clock-clockdate");
      var card_clock_dackorlight_dom = document.getElementById("card-clock-dackorlight");
      card_clock_time_dom.innerHTML = card_clock_time;
      card_clock_date_dom.innerHTML = card_clock_date;
      card_clock_dackorlight_dom.innerHTML = card_clock_dackorlight_str;
    }
  }
  function zeroPadding(num, digit) {
    var zero = "";
    for (var i = 0; i < digit; i++) {
      zero += "0";
    }
    return (zero + num).slice(-digit);
  }
  var timerID = setInterval(updateTime, 1000);
  updateTime();
}

function getIpInfo() {
  let defaultInfo = { city: "长沙市" };
  // 从配置获取API域名和key
  const qweather_host = typeof qweather_api_host !== "undefined" ? qweather_api_host : "nj6r6pm8pt.re.qweatherapi.com";
  // 高德web服务key（用于IP定位）
  const amapKey = typeof gaud_map_key !== "undefined" ? gaud_map_key : "";
  const isNonEmptyString = (v) => typeof v === "string" && v.length > 0;

  function fetchWeather(location, city) {
    fetch(`https://${qweather_host}/v7/weather/now?location=${location}&key=${qweather_key}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === "200" && document.getElementById("hexo_electric_clock")) {
          clockUpdateTime(data, city);
        }
      })
      .catch((err) => console.error("天气数据获取失败:", err));
  }

  if (clock_default_rectangle_enable === "true") {
    // 使用固定坐标
    fetchWeather(clock_rectangle, defaultInfo.city);
    return;
  }

  if (!amapKey) {
    console.error("高德地图key未配置，回退到默认坐标");
    fetchWeather(clock_rectangle, defaultInfo.city);
    return;
  }

  // 高德免费版IP定位(v3/ip)只支持IPv4，遇到访客走IPv6线路时会返回
  // status:1但city/province/rectangle为空。这里先用几个只返回IPv4的
  // 公共查询服务拿到访客的真实IPv4地址，再显式传给高德，避免它自己按
  // 请求来源IP识别时踩到IPv6的坑。多备几个服务，一个连不上/超时/被墙
  // 就自动换下一个，不强依赖某一个服务的可用性。
  function getPublicIPv4() {
    const ipv4Regex = /\b(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}\b/;
    const providers = [
      "https://4.ipw.cn",
      "https://api-ipv4.ip.sb/ip",
      "https://api4.ipify.org?format=json",
      "https://v4.ident.me",
    ];

    function tryProvider(i) {
      if (i >= providers.length) return Promise.resolve(null);
      return fetch(providers[i], { cache: "no-store" })
        .then((res) => (res.ok ? res.text() : ""))
        .then((text) => {
          const match = typeof text === "string" && text.match(ipv4Regex);
          return match ? match[0] : tryProvider(i + 1);
        })
        .catch(() => tryProvider(i + 1));
    }

    return tryProvider(0);
  }

  getPublicIPv4()
    .then((ipv4) => {
      console.log("IPv4查询结果:", ipv4);
      const amapUrl = ipv4
        ? `https://restapi.amap.com/v3/ip?key=${amapKey}&ip=${ipv4}`
        : `https://restapi.amap.com/v3/ip?key=${amapKey}`;
      console.log("请求高德的URL:", amapUrl);
      return fetch(amapUrl);
    })
    .then((res) => res.json())
    .then((data) => {
      let location = clock_rectangle; // 默认坐标
      let city = defaultInfo.city; // 默认城市

      // 打印原始返回，方便排查高德接口实际返回的数据结构
      console.log("高德IP定位返回:", data);

      // 高德在无法识别IP归属地时（机房IP/海外IP/非法IP/IPv6等），city、province、
      // rectangle 会返回空数组 [] 而不是空字符串 ""，这里统一按"无数据"处理
      if (data.status === "1" && isNonEmptyString(data.rectangle) && data.rectangle.includes(";")) {
        // rectangle格式："左下经度,左下纬度;右上经度,右上纬度"，取中心点作为定位坐标
        const bounds = data.rectangle.split(";");
        if (bounds.length === 2) {
          const [lng1, lat1] = bounds[0].split(",").map(Number);
          const [lng2, lat2] = bounds[1].split(",").map(Number);
          if (![lng1, lat1, lng2, lat2].some(Number.isNaN)) {
            const centerLng = ((lng1 + lng2) / 2).toFixed(6);
            const centerLat = ((lat1 + lat2) / 2).toFixed(6);
            location = `${centerLng},${centerLat}`;
            city = isNonEmptyString(data.city) ? data.city : isNonEmptyString(data.province) ? data.province : defaultInfo.city;
          }
        }
      } else if (data.status !== "1") {
        console.error("高德IP定位失败:", data.info || data);
      } else {
        console.warn("高德无法识别当前IP归属地（可能是机房/海外/非法IP），已使用默认坐标。原始返回:", data);
      }

      fetchWeather(location, city);
    })
    .catch((err) => {
      console.error("高德IP定位请求失败:", err);
      // 失败时使用默认坐标获取天气
      fetchWeather(clock_rectangle, defaultInfo.city);
    });
}

getIpInfo();