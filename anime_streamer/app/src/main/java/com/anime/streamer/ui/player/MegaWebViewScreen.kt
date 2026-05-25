package com.anime.streamer.ui.player

import android.annotation.SuppressLint
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.anime.streamer.R

private const val DESKTOP_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MegaWebViewScreen(
    state: PlayerUiState,
    onPlayNext: (String) -> Unit,
    onBack: () -> Unit,
    overrideUrl: String? = null,
) {
    val episode = state.episode ?: return
    val urlToLoad = overrideUrl ?: episode.sourceUrl
    // For Drive /preview URLs, embed in an iframe so Drive's player serves correctly
    // (it expects iframe-embed context and otherwise refuses to autoplay).
    val isDrivePreview = urlToLoad.contains("drive.google.com/file/d/") && urlToLoad.endsWith("/preview")
    val iframeHtml = if (isDrivePreview) {
        """
        <!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
        <style>html,body{margin:0;padding:0;background:#000;width:100%;height:100%;overflow:hidden}
        iframe{border:0;width:100vw;height:100vh;display:block}</style>
        </head><body>
        <iframe src="$urlToLoad" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </body></html>
        """.trimIndent()
    } else null

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        // State holders for HTML5 fullscreen handling.
        var fullscreenContainer: ViewGroup? = null
        var customView: View? = null
        var customViewCallback: WebChromeClient.CustomViewCallback? = null

        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                val root = android.widget.FrameLayout(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                    setBackgroundColor(android.graphics.Color.BLACK)
                }
                fullscreenContainer = root
                val web = WebView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                    setBackgroundColor(android.graphics.Color.BLACK)
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        mediaPlaybackRequiresUserGesture = false
                        mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        cacheMode = WebSettings.LOAD_DEFAULT
                        userAgentString = DESKTOP_UA
                        allowContentAccess = true
                        allowFileAccess = false
                        javaScriptCanOpenWindowsAutomatically = true
                        setSupportMultipleWindows(false)
                    }
                    webViewClient = WebViewClient()
                    webChromeClient = object : WebChromeClient() {
                        override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                            if (customView != null) {
                                callback?.onCustomViewHidden()
                                return
                            }
                            customView = view
                            customViewCallback = callback
                            view?.let {
                                fullscreenContainer?.addView(
                                    it,
                                    ViewGroup.LayoutParams(
                                        ViewGroup.LayoutParams.MATCH_PARENT,
                                        ViewGroup.LayoutParams.MATCH_PARENT,
                                    ),
                                )
                            }
                        }

                        override fun onHideCustomView() {
                            customView?.let { fullscreenContainer?.removeView(it) }
                            customView = null
                            customViewCallback?.onCustomViewHidden()
                            customViewCallback = null
                        }
                    }
                    if (iframeHtml != null) {
                        loadDataWithBaseURL(
                            "https://drive.google.com",
                            iframeHtml,
                            "text/html",
                            "utf-8",
                            null,
                        )
                    } else {
                        loadUrl(urlToLoad)
                    }
                }
                root.addView(web)
                root
            },
        )

        Column(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(text = stringResource(R.string.mega_notice), color = Color.White)
            OutlinedButton(onClick = onBack) { Text(stringResource(R.string.cancel)) }
            state.nextEpisode?.let { next ->
                OutlinedButton(onClick = { onPlayNext(next.id) }) {
                    Text(stringResource(R.string.next_episode))
                }
            }
        }
    }
}
