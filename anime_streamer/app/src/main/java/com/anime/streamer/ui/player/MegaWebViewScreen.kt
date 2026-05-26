package com.anime.streamer.ui.player

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.anime.streamer.R
import kotlinx.coroutines.delay

private const val VIDEO_LOG_TAG = "VideoDetector"

// Injected into the WebView's top-level page after load.
// Handles two cases:
//   1. Drive: YouTube player sends postMessage events — we listen and relay to Android.
//   2. MEGA/other: direct HTML5 <video> elements — we observe them via JS.
private val JS_MONITOR = """
(function() {
    var _posMs = 0, _durMs = 0, _ytState = -1;
    var _fullscreenDone = false;

    // ── YouTube player postMessage relay ──────────────────────────────────────
    window.addEventListener('message', function(e) {
        try {
            var d = (typeof e.data === 'string') ? JSON.parse(e.data) : e.data;
            if (!d || !d.event) return;
            if (d.event === 'infoDelivery' && d.info) {
                if (typeof d.info.currentTime === 'number') _posMs = Math.floor(d.info.currentTime * 1000);
                if (typeof d.info.duration    === 'number') _durMs = Math.floor(d.info.duration    * 1000);
                if (typeof d.info.playerState === 'number') notifyState(d.info.playerState);
            }
            if (d.event === 'onStateChange' && typeof d.info === 'number') notifyState(d.info);
        } catch(x) {}
    });

    function notifyState(s) {
        if (s === _ytState) return; _ytState = s;
        if (s === 1) { VideoMonitor.onPlaying(); tryFull(); }
        else if (s === 2) VideoMonitor.onPaused();
        else if (s === 0) VideoMonitor.onEnded();
        else if (s === 3) VideoMonitor.onWaiting();
    }

    // ── Periodic position report ──────────────────────────────────────────────
    setInterval(function() {
        if (_posMs > 0 || _durMs > 0) VideoMonitor.onTimeUpdate(_posMs, _durMs);
    }, 5000);

    // ── Seek ──────────────────────────────────────────────────────────────────
    window._seekWebView = function(targetSecs) {
        document.querySelectorAll('iframe').forEach(function(f) {
            try { f.contentWindow.postMessage(JSON.stringify({event:'command',func:'seekTo',args:[targetSecs,true]}),'*'); } catch(x) {}
        });
        document.querySelectorAll('video').forEach(function(v) {
            try { v.currentTime = targetSecs; } catch(x) {}
        });
    };

    // ── Auto-fullscreen — fires once on the first playing event ──────────────
    function tryFull() {
        if (_fullscreenDone || document.fullscreenElement) return;
        _fullscreenDone = true;
        // 1. Direct <video> fullscreen (works for MEGA — video is on the top-level page)
        var v = document.querySelector('video');
        if (v) {
            try {
                if (v.requestFullscreen)        { v.requestFullscreen(); return; }
                if (v.webkitRequestFullscreen)  { v.webkitRequestFullscreen(); return; }
                if (v.webkitEnterFullscreen)    { v.webkitEnterFullscreen(); return; }
            } catch(e) { _fullscreenDone = false; }
        }
        // 2. Fallback: fullscreen the embed iframe (animeisrael.tv or similar)
        var f = document.querySelector('iframe[allowfullscreen],iframe[allow*="fullscreen"]');
        if (f) {
            try {
                if (f.requestFullscreen)       f.requestFullscreen();
                else if (f.webkitRequestFullscreen) f.webkitRequestFullscreen();
            } catch(e) { _fullscreenDone = false; }
        }
    }

    // ── Direct HTML5 <video> monitoring ───────────────────────────────────────
    var monitored = new Set();
    function monitorVideo(v) {
        if (monitored.has(v)) return; monitored.add(v);
        v.addEventListener('playing', function() { VideoMonitor.onPlaying(); tryFull(); });
        v.addEventListener('pause',   function() { VideoMonitor.onPaused(); });
        v.addEventListener('ended',   function() { VideoMonitor.onEnded(); });
        v.addEventListener('waiting', function() { VideoMonitor.onWaiting(); });
        v.addEventListener('stalled', function() { VideoMonitor.onStalled(); });
        v.addEventListener('error',   function(e) {
            var msg = (v.error ? v.error.message : '') || e.message || 'unknown';
            VideoMonitor.onError(msg);
        });
        if (!v.paused && !v.ended && v.readyState >= 3) { VideoMonitor.onPlaying(); tryFull(); }
        // Autoplay — permitted because mediaPlaybackRequiresUserGesture = false
        v.play().catch(function(){});
    }
    function scan() { document.querySelectorAll('video').forEach(monitorVideo); }
    scan();
    new MutationObserver(scan).observe(document.documentElement, {childList:true, subtree:true});

    // Direct <video> periodic time update
    setInterval(function() {
        document.querySelectorAll('video').forEach(function(v) {
            if (!v.paused && v.currentTime > 0)
                VideoMonitor.onTimeUpdate(Math.floor(v.currentTime*1000), Math.floor((v.duration||0)*1000));
        });
    }, 5000);
})();
""".trimIndent()

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MegaWebViewScreen(
    state: PlayerUiState,
    viewModel: PlayerViewModel? = null,
    onPlayNext: (String) -> Unit,
    onBack: () -> Unit,
    overrideUrl: String? = null,
    referer: String? = null,
) {
    val episode = state.episode ?: return
    val urlToLoad = overrideUrl ?: episode.sourceUrl

    val playbackStatus = remember { mutableStateOf("טוען...") }
    val webViewRef    = remember { mutableStateOf<WebView?>(null) }

    var showSkipIntro  by remember { mutableStateOf(false) }
    var skipIntroDone  by remember { mutableStateOf(false) }
    var showNextOverlay by remember { mutableStateOf(false) }
    var nextCountdown  by remember { mutableIntStateOf(10) }
    var creditsTriggered by remember { mutableStateOf(false) }

    // Current playback position tracked from JS callbacks.
    var currentPositionMs by remember { mutableLongStateOf(0L) }
    var currentDurationMs by remember { mutableLongStateOf(0L) }

    // Flips to true in onPageFinished to trigger seek-resume.
    var pageLoaded by remember { mutableStateOf(false) }

    // Resume saved position — retry 3× because MEGA player needs time to initialize.
    LaunchedEffect(pageLoaded) {
        if (!pageLoaded || state.startPositionMs <= 10_000L) return@LaunchedEffect
        val seekSec = state.startPositionMs / 1000.0
        delay(3_000)
        webViewRef.value?.evaluateJavascript("window._seekWebView($seekSec);", null)
        delay(3_000)
        webViewRef.value?.evaluateJavascript("window._seekWebView($seekSec);", null)
        delay(4_000)
        webViewRef.value?.evaluateJavascript("window._seekWebView($seekSec);", null)
    }

    // Countdown for autoplay next.
    LaunchedEffect(showNextOverlay) {
        if (!showNextOverlay || state.nextEpisode == null) return@LaunchedEffect
        if (!state.autoplayNext) return@LaunchedEffect
        for (i in 10 downTo 1) {
            nextCountdown = i
            delay(1_000)
            if (!showNextOverlay) return@LaunchedEffect
        }
        state.nextEpisode.let { onPlayNext(it.id) }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        var fullscreenContainer: ViewGroup? = null
        var customView: View? = null
        var customViewCallback: WebChromeClient.CustomViewCallback? = null

        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                val root = android.widget.FrameLayout(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                    setBackgroundColor(android.graphics.Color.BLACK)
                }
                fullscreenContainer = root

                CookieManager.getInstance().setAcceptCookie(true)
                val mainHandler = Handler(Looper.getMainLooper())

                val videoMonitor = object {
                    @JavascriptInterface fun onPlaying() {
                        Log.i(VIDEO_LOG_TAG, "VIDEO PLAYING ▶")
                        mainHandler.post { playbackStatus.value = "מנגן ▶" }
                    }
                    @JavascriptInterface fun onPaused() {
                        Log.i(VIDEO_LOG_TAG, "VIDEO PAUSED ⏸")
                        mainHandler.post { playbackStatus.value = "מושהה ⏸" }
                    }
                    @JavascriptInterface fun onEnded() {
                        Log.i(VIDEO_LOG_TAG, "VIDEO ENDED ✓")
                        mainHandler.post {
                            playbackStatus.value = "הסתיים ✓"
                            if (state.nextEpisode != null && !showNextOverlay) {
                                showNextOverlay = true
                            } else if (state.nextEpisode == null) {
                                onBack()
                            }
                        }
                    }
                    @JavascriptInterface fun onWaiting() {
                        Log.i(VIDEO_LOG_TAG, "VIDEO WAITING")
                        mainHandler.post { playbackStatus.value = "מאחסן..." }
                    }
                    @JavascriptInterface fun onStalled() {
                        Log.i(VIDEO_LOG_TAG, "VIDEO STALLED")
                        mainHandler.post { playbackStatus.value = "תקוע..." }
                    }
                    @JavascriptInterface fun onError(msg: String) {
                        Log.e(VIDEO_LOG_TAG, "VIDEO ERROR: $msg")
                        mainHandler.post { playbackStatus.value = "שגיאה ✗" }
                    }
                    @JavascriptInterface fun onTimeUpdate(posMs: Long, durMs: Long) {
                        mainHandler.post {
                            currentPositionMs = posMs
                            if (durMs > 0) currentDurationMs = durMs

                            // Save progress every call (JS debounces to every 5s).
                            if (durMs > 0) viewModel?.saveProgress(posMs, durMs)

                            // Skip intro window.
                            val intro = viewModel?.introWindow()
                            if (!skipIntroDone && intro != null && posMs in intro) {
                                if (state.skipIntroAuto) {
                                    webViewRef.value?.evaluateJavascript(
                                        "window._seekWebView(${intro.last / 1000.0});", null)
                                    skipIntroDone = true
                                    showSkipIntro = false
                                } else {
                                    showSkipIntro = true
                                }
                            } else if (posMs > (intro?.last ?: 0L)) {
                                showSkipIntro = false
                            }

                            // Credits / end-of-episode — trigger at creditsStart or 90% playback.
                            val credits = viewModel?.creditsStart()
                            if (!creditsTriggered && state.nextEpisode != null && !showNextOverlay) {
                                val byCredits = credits != null && posMs >= credits
                                val by90pct = credits == null && durMs > 0 && posMs >= (durMs * 0.9).toLong()
                                if (byCredits || by90pct) {
                                    creditsTriggered = true
                                    showNextOverlay = true
                                }
                            }
                        }
                    }
                }

                val web = WebView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                    setBackgroundColor(android.graphics.Color.BLACK)
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        mediaPlaybackRequiresUserGesture = false
                        mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        cacheMode = WebSettings.LOAD_DEFAULT
                        allowContentAccess = true
                        allowFileAccess = false
                        javaScriptCanOpenWindowsAutomatically = true
                        setSupportMultipleWindows(false)
                    }
                    CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                    addJavascriptInterface(videoMonitor, "VideoMonitor")

                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView?, url: String?) {
                            Log.d(VIDEO_LOG_TAG, "Page loaded: $url")
                            view?.evaluateJavascript(JS_MONITOR, null)
                            mainHandler.post { pageLoaded = true }
                        }
                        override fun shouldInterceptRequest(
                            view: WebView?, request: WebResourceRequest?,
                        ): WebResourceResponse? {
                            val url = request?.url?.toString() ?: return null
                            if (url.contains("googlevideo.com") || url.contains("videoplayback")) {
                                Log.i(VIDEO_LOG_TAG, "VIDEO STREAM DETECTED ▶")
                                mainHandler.post { playbackStatus.value = "מנגן ▶" }
                            }
                            return null
                        }
                    }
                    webChromeClient = object : WebChromeClient() {
                        override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                            if (customView != null) { callback?.onCustomViewHidden(); return }
                            customView = view; customViewCallback = callback
                            view?.let {
                                fullscreenContainer?.addView(it, ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
                            }
                            // Hide status bar + nav bar for true immersive fullscreen
                            (ctx as? Activity)?.window?.decorView?.let { decor ->
                                ViewCompat.getWindowInsetsController(decor)?.let { ctrl ->
                                    ctrl.hide(WindowInsetsCompat.Type.systemBars())
                                    ctrl.systemBarsBehavior =
                                        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                                }
                            }
                        }
                        override fun onHideCustomView() {
                            customView?.let { fullscreenContainer?.removeView(it) }
                            customView = null; customViewCallback?.onCustomViewHidden(); customViewCallback = null
                            // Restore system bars
                            (ctx as? Activity)?.window?.decorView?.let { decor ->
                                ViewCompat.getWindowInsetsController(decor)
                                    ?.show(WindowInsetsCompat.Type.systemBars())
                            }
                        }
                        override fun onConsoleMessage(message: android.webkit.ConsoleMessage): Boolean {
                            Log.d("WebViewPlayer", "${message.messageLevel()}: ${message.message()}")
                            return true
                        }
                    }
                    if (!referer.isNullOrBlank()) loadUrl(urlToLoad, mapOf("Referer" to referer))
                    else loadUrl(urlToLoad)
                }
                webViewRef.value = web
                root.addView(web)
                root
            },
        )

        // ── Native overlays on top of WebView ────────────────────────────────

        // Buttons (top-left)
        Column(
            modifier = Modifier.align(Alignment.TopStart).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedButton(onClick = onBack) { Text(stringResource(R.string.cancel)) }
            state.nextEpisode?.let { next ->
                OutlinedButton(onClick = { onPlayNext(next.id) }) {
                    Text(stringResource(R.string.next_episode))
                }
            }
        }

        // Playback status (top-right)
        val status = playbackStatus.value
        val statusColor = when {
            status.contains("מנגן")  -> Color(0xFF00C853)
            status.contains("שגיאה") || status.contains("תקוע") -> Color(0xFFFF5252)
            status.contains("הסתיים") -> Color(0xFF82B1FF)
            else -> Color(0xFFFFD740)
        }
        Text(
            text = status,
            color = statusColor,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 16.dp, end = 16.dp)
                .background(Color.Black.copy(alpha = 0.6f))
                .padding(horizontal = 8.dp, vertical = 4.dp),
        )

        // Skip intro button (bottom-right)
        if (showSkipIntro) {
            Box(
                modifier = Modifier.fillMaxSize().padding(32.dp),
                contentAlignment = Alignment.BottomEnd,
            ) {
                Button(
                    onClick = {
                        val introEnd = viewModel?.introWindow()?.last ?: 90_000L
                        webViewRef.value?.evaluateJavascript(
                            "window._seekWebView(${introEnd / 1000.0});", null)
                        skipIntroDone = true
                        showSkipIntro = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.9f)),
                ) {
                    Text("דלג אינטרו ⏭", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Next episode overlay (bottom)
        if (showNextOverlay && state.nextEpisode != null) {
            val title = state.nextEpisode.titleHe ?: state.nextEpisode.title
            NextEpisodeOverlay(
                nextTitle = title,
                countdownSec = if (state.autoplayNext) nextCountdown else -1,
                onPlayNow = { onPlayNext(state.nextEpisode.id) },
                onCancel = { showNextOverlay = false },
            )
        }
    }
}
