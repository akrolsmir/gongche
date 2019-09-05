importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js');

// From https://developers.google.com/web/tools/workbox/guides/get-started
if (workbox) {
  console.log(`Yay! Workbox is loaded 🎉`);
} else {
  console.log(`Boo! Workbox didn't load 😬`);
}

workbox.routing.registerRoute(
  /\.js$/,
  new workbox.strategies.StaleWhileRevalidate(),
);

workbox.routing.registerRoute(
  // Cache pages of the form '.html' and '.html?id=blah'
  /\.html(\?.*)?$/,
  new workbox.strategies.StaleWhileRevalidate(),
);

workbox.routing.registerRoute(
  // Cache Google fonts, Firebase, and other JS libraries
  /.*(?:googleapis|gstatic|unpkg)\.com/,
  new workbox.strategies.StaleWhileRevalidate(),
);

workbox.routing.registerRoute(
  // Cache CSS files.
  /\.css$/,
  // Use cache but update in the background.
  new workbox.strategies.StaleWhileRevalidate({
    // Use a custom cache name.
    cacheName: 'css-cache',
  })
);
