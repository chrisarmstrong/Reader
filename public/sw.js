if(!self.define){let e,s={};const a=(a,i)=>(a=new URL(a+".js",i).href,s[a]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=a,e.onload=s,document.head.appendChild(e)}else e=a,importScripts(a),s()})).then((()=>{let e=s[a];if(!e)throw new Error(`Module ${a} didn’t register its module`);return e})));self.define=(i,n)=>{const c=e||("document"in self?document.currentScript.src:"")||location.href;if(s[c])return;let t={};const f=e=>a(e,c),o={module:{uri:c},exports:t,require:f};s[c]=Promise.all(i.map((e=>o[e]||f(e)))).then((e=>(n(...e),t)))}}define(["./workbox-588899ac"],(function(e){"use strict";importScripts(),self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"/_next/static/VLM-fwfsqHHcYGW2CYKOf/_buildManifest.js",revision:"e28de42b33302e7f0bfbf0c680902fd4"},{url:"/_next/static/VLM-fwfsqHHcYGW2CYKOf/_ssgManifest.js",revision:"b6652df95db52feb4daf4eca35380933"},{url:"/_next/static/chunks/10-6579f429bb59e82e.js",revision:"6579f429bb59e82e"},{url:"/_next/static/chunks/framework-2c79e2a64abdb08b.js",revision:"2c79e2a64abdb08b"},{url:"/_next/static/chunks/main-c256fb04ba725c1e.js",revision:"c256fb04ba725c1e"},{url:"/_next/static/chunks/pages/%5Bslug%5D-e074720e8c2dde09.js",revision:"e074720e8c2dde09"},{url:"/_next/static/chunks/pages/_app-3b8ffc248a027017.js",revision:"3b8ffc248a027017"},{url:"/_next/static/chunks/pages/_error-54de1933a164a1ff.js",revision:"54de1933a164a1ff"},{url:"/_next/static/chunks/pages/index-57b86dee57bf10a4.js",revision:"57b86dee57bf10a4"},{url:"/_next/static/chunks/pages/kjv/%5Bslug%5D-4018444af00624c2.js",revision:"4018444af00624c2"},{url:"/_next/static/chunks/polyfills-c67a75d1b6f99dc8.js",revision:"837c0df77fd5009c9e46d446188ecfd0"},{url:"/_next/static/chunks/webpack-d38be8d96a62f950.js",revision:"d38be8d96a62f950"},{url:"/_next/static/css/e5fd7dda72fbe257.css",revision:"e5fd7dda72fbe257"},{url:"/_next/static/media/3f2b71c1465cefd2-s.p.woff2",revision:"e9cdeee2666007c934ce74e87fe92a17"},{url:"/_next/static/media/5a1e164989c48870-s.p.woff2",revision:"a25c1d5475d6d7d02125ab0c936f355a"},{url:"/_next/static/media/8e588027012121be-s.p.woff2",revision:"44740b6ded64c9f4dbf68a64a7416ca6"},{url:"/_next/static/media/8eda525afb03a54a-s.p.woff2",revision:"11752c3c1b937d831718f582188fa0b2"},{url:"/_next/static/media/975ed55bf715ac2d-s.p.woff2",revision:"7d3d26e374170f25941378543efee365"},{url:"/_next/static/media/e9aedc743594e3cd-s.p.woff2",revision:"5e21681d1cbcaae0462f922b1f6b4166"},{url:"/apple-touch-icon.png",revision:"d238ca7212bc8252b8e2f27a288d0386"},{url:"/favicon.ico",revision:"c30c7d42707a47a3f4591831641e50dc"},{url:"/fonts/family-black-italic.woff2",revision:"a3c1c8c41b1d6bc5ee6f7310acc14dd5"},{url:"/fonts/family-black.woff2",revision:"014be2fec526e66f69c5d3a8ed89f1f6"},{url:"/fonts/family-bold-italic.woff2",revision:"e9cdeee2666007c934ce74e87fe92a17"},{url:"/fonts/family-bold.woff2",revision:"44740b6ded64c9f4dbf68a64a7416ca6"},{url:"/fonts/family-heavy-italic.woff2",revision:"f89db64bf9c6f16bdafc3b03df85bca0"},{url:"/fonts/family-heavy.woff2",revision:"36e7bdae7d40da132821ad3949fa0bb4"},{url:"/fonts/family-italic.woff2",revision:"7d3d26e374170f25941378543efee365"},{url:"/fonts/family-light-italic.woff2",revision:"5e21681d1cbcaae0462f922b1f6b4166"},{url:"/fonts/family-light.woff2",revision:"a25c1d5475d6d7d02125ab0c936f355a"},{url:"/fonts/family-medium-italic.woff2",revision:"12d2b79ff406829a1220e65562595549"},{url:"/fonts/family-medium.woff2",revision:"be2810dc71125398c19f057fac27a97f"},{url:"/fonts/family-regular.woff2",revision:"11752c3c1b937d831718f582188fa0b2"},{url:"/icon.png",revision:"efe78d07279c5b123604677f97cf7769"},{url:"/manifest.json",revision:"55308cb0c01e65238f9262307b4da841"},{url:"/next.svg",revision:"8e061864f388b47f33a1c3780831193e"},{url:"/thirteen.svg",revision:"53f96b8290673ef9d2895908e69b2f92"},{url:"/vercel.svg",revision:"61c6b19abff40ea7acd577be818f3976"}],{ignoreURLParametersMatching:[]}),e.cleanupOutdatedCaches(),e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url",plugins:[{cacheWillUpdate:async({request:e,response:s,event:a,state:i})=>s&&"opaqueredirect"===s.type?new Response(s.body,{status:200,statusText:"OK",headers:s.headers}):s}]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,new e.CacheFirst({cacheName:"google-fonts-webfonts",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:31536e3})]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,new e.StaleWhileRevalidate({cacheName:"google-fonts-stylesheets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,new e.StaleWhileRevalidate({cacheName:"static-font-assets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,new e.StaleWhileRevalidate({cacheName:"static-image-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/image\?url=.+$/i,new e.StaleWhileRevalidate({cacheName:"next-image",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp3|wav|ogg)$/i,new e.CacheFirst({cacheName:"static-audio-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp4)$/i,new e.CacheFirst({cacheName:"static-video-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:js)$/i,new e.StaleWhileRevalidate({cacheName:"static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:css|less)$/i,new e.StaleWhileRevalidate({cacheName:"static-style-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/data\/.+\/.+\.json$/i,new e.StaleWhileRevalidate({cacheName:"next-data",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:json|xml|csv)$/i,new e.NetworkFirst({cacheName:"static-data-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute((({url:e})=>{if(!(self.origin===e.origin))return!1;const s=e.pathname;return!s.startsWith("/api/auth/")&&!!s.startsWith("/api/")}),new e.NetworkFirst({cacheName:"apis",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:16,maxAgeSeconds:86400})]}),"GET"),e.registerRoute((({url:e})=>{if(!(self.origin===e.origin))return!1;return!e.pathname.startsWith("/api/")}),new e.NetworkFirst({cacheName:"others",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute((({url:e})=>!(self.origin===e.origin)),new e.NetworkFirst({cacheName:"cross-origin",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:3600})]}),"GET")}));
