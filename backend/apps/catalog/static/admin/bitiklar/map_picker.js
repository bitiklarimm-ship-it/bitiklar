/* BITIKLAR admin: joylashuvni xaritadan belgilash.
 *
 * #id_latitude va #id_longitude maydonlari bor har qanday admin sahifasida (Obida, Bitik) ishlaydi:
 *  - xaritaga bosing yoki belgini suring — koordinatalar maydonlarga yoziladi;
 *  - "Mening joylashuvim" — obida yonida turgan bo'lsangiz, telefon GPS'idan oladi;
 *  - qidiruv — manzil yoki obida nomi bo'yicha (OpenStreetMap Nominatim);
 *  - Bitik sahifasida obidaning o'zi kulrang belgi bilan ko'rsatiladi.
 */
(function () {
  "use strict";

  var LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  var LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  var UZ_CENTER = [41.3, 64.6];

  function loadLeaflet(cb) {
    if (window.L) return cb();
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = LEAFLET_CSS;
    document.head.appendChild(css);
    var js = document.createElement("script");
    js.src = LEAFLET_JS;
    js.onload = cb;
    js.onerror = function () {
      var w = document.getElementById("bitiklar-map-msg");
      if (w) w.textContent = "Xarita yuklanmadi (internet aloqasini tekshiring). Koordinatalarni qo'lda kiritishingiz mumkin.";
    };
    document.head.appendChild(js);
  }

  function num(input) {
    var v = parseFloat(String(input.value).replace(",", "."));
    return isNaN(v) ? null : v;
  }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  function init() {
    var latIn = document.getElementById("id_latitude");
    var lngIn = document.getElementById("id_longitude");
    if (!latIn || !lngIn) return;
    var monumentSel = document.getElementById("id_monument"); // faqat Bitik sahifasida
    var isInscription = !!monumentSel;

    // --- Interfeys ---
    var wrap = el("div", { class: "bitiklar-map" });
    var bar = el("div", { class: "bitiklar-map-bar" });
    var search = el("input", { type: "search", placeholder: "Manzil yoki obida nomi… (Enter)", class: "vTextField" });
    var btnGeo = el("button", { type: "button", class: "button" }, "📍 Mening joylashuvim");
    var btnMon = el("button", { type: "button", class: "button" }, "🕌 Obida joyiga");
    var btnClear = el("button", { type: "button", class: "button" }, "✕ Tozalash");
    bar.appendChild(search);
    bar.appendChild(btnGeo);
    if (isInscription) { bar.appendChild(btnMon); bar.appendChild(btnClear); }
    var results = el("div", { class: "bitiklar-map-results" });
    var mapDiv = el("div", { class: "bitiklar-map-canvas" });
    var msg = el("div", { class: "bitiklar-map-msg help", id: "bitiklar-map-msg" },
      isInscription
        ? "Xaritaga bosing — bitikning aniq joyi belgilanadi (peshtoq, minora va h.k.). Bo'sh qoldirilsa, obida koordinatasi ishlatiladi. Sun'iy yo'ldosh ko'rinishiga o'ting — binoning qismlari yaxshi ko'rinadi."
        : "Xaritaga bosing yoki belgini suring — obida koordinatalari avtomatik yoziladi.");
    wrap.appendChild(bar);
    wrap.appendChild(results);
    wrap.appendChild(mapDiv);
    wrap.appendChild(msg);

    // Koordinatalar turgan bo'lim (oddiy admin, Unfold yoki tab ichida) oxiriga qo'shiladi
    var container = latIn.closest("fieldset") || latIn.closest(".module") || latIn.closest("[role=tabpanel]");
    if (container) container.appendChild(wrap);
    else {
      var row = latIn.closest(".form-row") || latIn.parentNode;
      row.parentNode.insertBefore(wrap, row.nextSibling);
    }
    // Yopiq (collapse) bo'limni ochib qo'yamiz
    var details = wrap.closest("details");
    if (details) details.open = true;

    loadLeaflet(function () {
      var L = window.L;
      // Standart: sun'iy yo'ldosh + joy nomlari (gibrid) — binoning qaysi qismida ekanini aniq ko'rish uchun
      var opts = { maxZoom: 21, maxNativeZoom: 19 };
      var esri = "https://server.arcgisonline.com/ArcGIS/rest/services/";
      var sat = L.tileLayer(esri + "World_Imagery/MapServer/tile/{z}/{y}/{x}", Object.assign({ attribution: "Tasvirlar &copy; Esri, Maxar" }, opts));
      var places = L.tileLayer(esri + "Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", opts);
      var roads = L.tileLayer(esri + "Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", Object.assign({ opacity: 0.7 }, opts));
      var hybrid = L.layerGroup([sat, roads, places]);
      var satOnly = L.tileLayer(esri + "World_Imagery/MapServer/tile/{z}/{y}/{x}", Object.assign({ attribution: "Tasvirlar &copy; Esri, Maxar" }, opts));
      var street = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 21, maxNativeZoom: 20, subdomains: "abcd",
        attribution: "&copy; OpenStreetMap &copy; CARTO",
      });
      var map = L.map(mapDiv, { layers: [hybrid], maxZoom: 21 }).setView(UZ_CENTER, 6);
      L.control.layers({ "Sun'iy yo'ldosh (gibrid)": hybrid, "Sun'iy yo'ldosh": satOnly, "Xarita": street }).addTo(map);

      var marker = null;
      var monumentMarker = null;
      var accuracy = null;
      var monumentPos = null;

      function setInputs(lat, lng) {
        latIn.value = lat.toFixed(6);
        lngIn.value = lng.toFixed(6);
        latIn.dispatchEvent(new Event("change", { bubbles: true }));
      }

      function place(lat, lng, opts) {
        opts = opts || {};
        if (!marker) {
          marker = L.marker([lat, lng], { draggable: true, title: "Belgini suring" }).addTo(map);
          marker.on("dragend", function () {
            var p = marker.getLatLng();
            setInputs(p.lat, p.lng);
          });
        } else {
          marker.setLatLng([lat, lng]);
        }
        if (opts.write !== false) setInputs(lat, lng);
        if (opts.fly) map.setView([lat, lng], Math.max(map.getZoom(), opts.zoom || 18));
      }

      map.on("click", function (e) { place(e.latlng.lat, e.latlng.lng); });

      function fromInputs(fly) {
        var lat = num(latIn), lng = num(lngIn);
        if (lat !== null && lng !== null) {
          place(lat, lng, { write: false, fly: fly, zoom: 17 });
          return true;
        }
        return false;
      }
      latIn.addEventListener("input", function () { fromInputs(false); });
      lngIn.addEventListener("input", function () { fromInputs(false); });

      // --- Obida (Bitik sahifasi uchun) ---
      var monuments = null;
      function showMonument(fly) {
        if (!monumentSel || !monuments) return;
        var id = String(monumentSel.value || "");
        var f = monuments[id];
        if (monumentMarker) { map.removeLayer(monumentMarker); monumentMarker = null; }
        monumentPos = null;
        if (!f) return;
        monumentPos = [f.geometry.coordinates[1], f.geometry.coordinates[0]];
        monumentMarker = L.circleMarker(monumentPos, {
          radius: 9, color: "#555", weight: 2, fillColor: "#bbb", fillOpacity: 0.8,
        }).addTo(map).bindTooltip("Obida: " + f.properties.name_uz);
        if (fly && !marker) map.setView(monumentPos, 17);
      }
      if (isInscription) {
        fetch("/api/monuments/geojson/", { credentials: "same-origin" })
          .then(function (r) { return r.json(); })
          .then(function (geo) {
            monuments = {};
            (geo.features || []).forEach(function (f) { monuments[String(f.properties.id)] = f; });
            showMonument(!fromInputs(false));
          })
          .catch(function () {});
        monumentSel.addEventListener("change", function () { showMonument(true); });
        if (window.django && window.django.jQuery) {
          window.django.jQuery(monumentSel).on("change", function () { showMonument(true); });
        }
        btnMon.addEventListener("click", function () {
          if (monumentPos) place(monumentPos[0], monumentPos[1], { fly: true });
          else msg.textContent = "Avval obidani tanlang.";
        });
        btnClear.addEventListener("click", function () {
          latIn.value = ""; lngIn.value = "";
          if (marker) { map.removeLayer(marker); marker = null; }
          msg.textContent = "Aniq joy o'chirildi — obida koordinatasi ishlatiladi.";
        });
      }

      if (!fromInputs(true) && !isInscription) map.setView(UZ_CENTER, 6);

      // --- Mening joylashuvim ---
      btnGeo.addEventListener("click", function () {
        if (!navigator.geolocation) { msg.textContent = "Brauzeringiz joylashuvni aniqlashni qo'llab-quvvatlamaydi."; return; }
        msg.textContent = "Joylashuv aniqlanmoqda…";
        navigator.geolocation.getCurrentPosition(function (pos) {
          var c = pos.coords;
          place(c.latitude, c.longitude, { fly: true, zoom: 18 });
          if (accuracy) map.removeLayer(accuracy);
          accuracy = L.circle([c.latitude, c.longitude], { radius: c.accuracy, color: "#1f8a8a", weight: 1, fillOpacity: 0.1 }).addTo(map);
          msg.textContent = "Joylashuvingiz olindi (aniqlik ±" + Math.round(c.accuracy) + " m). Kerak bo'lsa belgini suring.";
        }, function (err) {
          msg.textContent = err.code === 1
            ? "Joylashuvga ruxsat berilmadi. Brauzer sozlamalarida ruxsat bering (sayt HTTPS orqali ochilgan bo'lishi kerak)."
            : "Joylashuv aniqlanmadi: " + err.message;
        }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      });

      // --- Qidiruv (Nominatim) ---
      search.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault(); // admin formani yubormasin
        var q = search.value.trim();
        if (!q) return;
        results.innerHTML = "Qidirilmoqda…";
        fetch("https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=uz,ru,en&countrycodes=uz,tj,kz,kg,tm&q=" + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (list) {
            results.innerHTML = "";
            if (!list.length) { results.textContent = "Hech narsa topilmadi."; return; }
            list.forEach(function (it) {
              var a = el("a", { href: "#" }, it.display_name);
              a.addEventListener("click", function (ev) {
                ev.preventDefault();
                map.setView([+it.lat, +it.lon], 17);
                results.innerHTML = "";
                msg.textContent = "Xaritada aniq joyni bosing.";
              });
              results.appendChild(a);
            });
          })
          .catch(function () { results.textContent = "Qidiruv ishlamadi."; });
      });

      setTimeout(function () { map.invalidateSize(); }, 300);
      // Xarita yashirin tabda yaratilgan bo'lsa, tab ochilganda o'lchamini qayta hisoblaymiz
      if (window.ResizeObserver) {
        new ResizeObserver(function () { map.invalidateSize(); }).observe(mapDiv);
      }
      if (details) details.addEventListener("toggle", function () { map.invalidateSize(); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
