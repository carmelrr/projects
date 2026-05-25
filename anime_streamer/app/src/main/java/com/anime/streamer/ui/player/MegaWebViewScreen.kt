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

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                WebView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        mediaPlaybackRequiresUserGesture = false
                        mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                        useWideViewPort = true
                        loadWithOverviewMode = true
                    }
                    webViewClient = WebViewClient()
                    webChromeClient = object : WebChromeClient() {
                        override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                            super.onShowCustomView(view, callback)
                        }
                    }
                    loadUrl(urlToLoad)
                }
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
