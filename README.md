# Seven-Day Sprint — Study Tracker

A 7-day study tracker with per-task timers, CQ/MCQ/Topicwise progress tracking, period alarms (CQ 4:45–8:30am, MCQs 9am–4pm, Topicwise study 5:15–10pm), loud audio alerts, and real system notification banners.

## File structure

```
.
├── index.html
├── manifest.json        ← PWA manifest (lets you "install" the tracker)
├── sw.js                 ← service worker (powers real notification banners + offline cache)
├── css/
│   └── style.css
├── js/
│   └── app.js
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Deploying to GitHub Pages (yourusername.github.io)

1. Create a new repository on GitHub. If you want it at `https://yourusername.github.io/`, the repo must be named exactly `yourusername.github.io`. If you want it at a sub-path instead (`https://yourusername.github.io/study-tracker/`), any repo name works.
2. Upload every file in this folder to the repo, **keeping the same folder structure** (`css/`, `js/`, `icons/` must stay as subfolders, not be flattened).
3. In the repo, go to **Settings → Pages**, set Source to "Deploy from branch", branch `main`, folder `/ (root)`, then save.
4. Wait a minute or two, then visit the URL GitHub gives you.

GitHub Pages serves everything over HTTPS automatically, which is required for notifications and the service worker to work at all.

## Turning on real alerts

Open the deployed site and use the three buttons in the header:

- **Alerts on** — in-page sound (the siren/chime you hear while the tab is open and focused).
- **Enable background alerts** — tap this once and accept the permission prompt. This registers the service worker and lets the browser show a real system notification banner (the kind that appears outside the browser, in your OS notification tray) for period warnings, period-end alarms, and target-reached events — even if you've switched to another tab or app.
- **Test alarm** — plays the full alarm sound right now and fires a test notification, so you can immediately confirm both are working instead of waiting for a real period boundary.

## About the alarm sound

The period-end alarm is now a ~7-second two-tone siren (alternating 880Hz/1318Hz square wave) at a noticeably higher volume than before, plus a vibration pattern on phones that support it. The 5-minute warning and target-reached chimes are shorter and quieter by design, so the period-end alarm stands out as the one that means "stop and switch now."

If you genuinely hear nothing when pressing **Test alarm**: check that your device/browser isn't muted, and that your browser allowed audio to play (some browsers block audio entirely until you've clicked something on the page first — clicking **Test alarm** itself counts).

## Honest limits of "background" notifications

This is a static site with no backend, so there's no way to push a notification to your phone while the browser itself is fully closed or your screen is locked — that requires a server-based push service. What this setup *does* give you:

- Alerts fire and show a system banner as long as the browser process is running, even if the Study Tracker tab isn't the focused/visible one (different tab, different app window, minimized).
- Routing notifications through the service worker (rather than the page directly) is what makes this reliable on Android Chrome in particular, which mostly ignores notifications fired straight from page JavaScript.

For the most reliable experience on a phone: open the site, tap **Enable background alerts**, then leave the browser running in the background rather than closing it or force-stopping it.

## Local testing before deploying

Don't just double-click `index.html` — opening it as a `file://` page will block the service worker and may block notification permission entirely. Instead, run a tiny local server from this folder:

```
python3 -m http.server 8000
```

then open `http://localhost:8000` in your browser.
