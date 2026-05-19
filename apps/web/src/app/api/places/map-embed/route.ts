import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Interactive map embed for the mobile app.
 *
 * Returns a tiny self-contained HTML page that renders an interactive
 * Google Map (pan / pinch-zoom / scroll) with:
 *   • the encoded route polyline drawn in gold
 *   • labelled markers A / B / (C)  — passed in via the `markers` query param
 *
 * This is intentionally a server-rendered HTML page so the Google Maps key
 * never has to ship with the mobile bundle. The page is consumed by a
 * react-native-webview on the mobile side and is sized by its container.
 *
 * Query params:
 *   polyline=<encoded>
 *   markers=A:lat,lng;B:lat,lng[;C:lat,lng]
 *
 * The HTML page itself never echoes user-supplied content into the DOM —
 * everything is parsed defensively inside the embedded script — so XSS via
 * query params is not possible.
 */

function resolveMapsKey(): string | undefined {
  const server = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (server) return server;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

export async function GET(_req: NextRequest) {
  const key = resolveMapsKey();
  if (!key) {
    return new Response("<!doctype html><h3>Maps API not configured</h3>", {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const safeKey = encodeURIComponent(key);

  // Query params come through location.search inside the page, NOT injected
  // into the HTML — keeps this endpoint safe regardless of what the client
  // passes.
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <title>Route preview</title>
  <style>
    html, body { height: 100%; margin: 0; padding: 0; background: #eef2f7; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      overflow: hidden;
    }
    #map { position: absolute; inset: 0; }
    .ph {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      color: #94a3b8; font-size: 13px; font-weight: 500;
      padding: 24px; text-align: center;
      pointer-events: none;
      transition: opacity .2s ease;
    }
    .ph.error { color: #b45309; }
    .ph.hidden { opacity: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="ph" class="ph">Loading map…</div>
  <script>
    (function () {
      'use strict';

      function rnLog(payload) {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        } catch (_) {}
      }

      function parseMarkers(raw) {
        var out = [];
        if (!raw) return out;
        var segments = String(raw).split(';');
        for (var i = 0; i < segments.length; i++) {
          var seg = segments[i];
          var idx = seg.indexOf(':');
          if (idx < 0) continue;
          var label = seg.slice(0, idx).trim().toUpperCase();
          var ll = seg.slice(idx + 1).trim().split(',');
          if (ll.length !== 2) continue;
          var lat = parseFloat(ll[0]);
          var lng = parseFloat(ll[1]);
          if (!isFinite(lat) || !isFinite(lng)) continue;
          if (!/^[A-Z]$/.test(label)) continue;
          out.push({ label: label, lat: lat, lng: lng });
        }
        return out;
      }

      /**
       * Build an inline-SVG data URL pin icon with the letter baked in.
       * Using a Data URI keeps the letter 100% reliable across iOS / Android
       * WebView combinations (no dependency on google.maps.Marker label
       * rendering on SymbolPath icons, which can be flaky).
       */
      function buildPinIcon(letter) {
        var svg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">' +
            '<defs>' +
              '<filter id="s" x="-50%" y="-50%" width="200%" height="200%">' +
                '<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.35"/>' +
              '</filter>' +
            '</defs>' +
            '<path filter="url(#s)" fill="#0F172A" stroke="#ffffff" stroke-width="2.5" ' +
                  'd="M22 2 C 11 2, 2 11, 2 22 C 2 35, 22 54, 22 54 C 22 54, 42 35, 42 22 C 42 11, 33 2, 22 2 Z"/>' +
            '<circle cx="22" cy="22" r="13" fill="#ffffff"/>' +
            '<text x="22" y="27" text-anchor="middle" font-family="-apple-system, Segoe UI, Roboto, sans-serif" ' +
                  'font-size="16" font-weight="700" fill="#0F172A">' + letter + '</text>' +
          '</svg>';
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
      }

      var sp = new URLSearchParams(window.location.search);
      var polylineEnc = sp.get('polyline') || '';
      var markers = parseMarkers(sp.get('markers') || '');

      rnLog({ type: 'mapembed/init', markers: markers.length, polyline: polylineEnc.length });

      function setError(msg) {
        var ph = document.getElementById('ph');
        if (ph) { ph.textContent = msg; ph.classList.add('error'); ph.classList.remove('hidden'); }
      }
      function hidePlaceholder() {
        var ph = document.getElementById('ph');
        if (ph) ph.classList.add('hidden');
      }

      window.__initMap = function () {
        try {
          if (typeof google === 'undefined' || !google.maps) {
            setError('Map could not load');
            rnLog({ type: 'mapembed/no-google' });
            return;
          }
          var fallbackCenter = markers.length
            ? { lat: markers[0].lat, lng: markers[0].lng }
            : { lat: 43.6532, lng: -79.3832 };

          var map = new google.maps.Map(document.getElementById('map'), {
            center: fallbackCenter,
            zoom: 11,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
            gestureHandling: 'greedy',
            clickableIcons: false,
            backgroundColor: '#eef2f7',
            styles: [
              { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
              { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
              { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'simplified' }] }
            ]
          });

          var bounds = new google.maps.LatLngBounds();
          var pathLen = 0;

          if (polylineEnc && google.maps.geometry && google.maps.geometry.encoding) {
            try {
              var path = google.maps.geometry.encoding.decodePath(polylineEnc);
              pathLen = path.length;
              new google.maps.Polyline({
                path: path,
                map: map,
                strokeColor: '#C9A063',
                strokeOpacity: 1,
                strokeWeight: 5,
                geodesic: true
              });
              for (var i = 0; i < path.length; i++) bounds.extend(path[i]);
            } catch (err) {
              rnLog({ type: 'mapembed/poly-decode-fail', error: String(err && err.message || err) });
            }
          }

          var placedMarkerLabels = [];
          for (var j = 0; j < markers.length; j++) {
            var m = markers[j];
            var pos = { lat: m.lat, lng: m.lng };
            new google.maps.Marker({
              position: pos,
              map: map,
              icon: {
                url: buildPinIcon(m.label),
                size: new google.maps.Size(44, 56),
                scaledSize: new google.maps.Size(44, 56),
                anchor: new google.maps.Point(22, 54),
                labelOrigin: new google.maps.Point(22, 22)
              },
              zIndex: 100 + j,
              optimized: false,
              title: m.label
            });
            placedMarkerLabels.push(m.label);
            bounds.extend(pos);
          }

          rnLog({ type: 'mapembed/rendered', markers: placedMarkerLabels, polylinePoints: pathLen });

          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { top: 56, right: 48, bottom: 56, left: 48 });
            google.maps.event.addListenerOnce(map, 'idle', function () {
              if (markers.length <= 1 && pathLen === 0) map.setZoom(14);
              // Avoid extreme zoom-in when markers are very close together.
              if (map.getZoom() > 16) map.setZoom(16);
            });
          }
          hidePlaceholder();
        } catch (e) {
          setError('Map unavailable');
          rnLog({ type: 'mapembed/init-error', error: String(e && e.message || e) });
        }
      };

      window.gm_authFailure = function () {
        setError('Maps JavaScript API not enabled');
        rnLog({ type: 'mapembed/auth-failure' });
      };

      var s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?key=${safeKey}&libraries=geometry&callback=__initMap&v=quarterly';
      s.async = true;
      s.defer = true;
      s.onerror = function () {
        setError('Map could not load');
        rnLog({ type: 'mapembed/script-error' });
      };
      document.head.appendChild(s);
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
