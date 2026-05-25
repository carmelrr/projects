package com.anime.streamer.ui.player

import android.view.ViewGroup
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

@Composable
fun ExoPlayerScreen(
    state: PlayerUiState,
    viewModel: PlayerViewModel,
    isTv: Boolean,
    onFinished: () -> Unit,
    onPlayNext: (String) -> Unit,
) {
    val context = LocalContext.current
    val ep = state.episode ?: return
    val mediaUrl = remember(ep.id) { DriveUrlResolver.resolve(ep.sourceType, ep.sourceUrl) }

    val player = remember {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(mediaUrl))
            seekTo(state.startPositionMs)
            playWhenReady = true
            prepare()
        }
    }

    var showSkipIntro by remember { mutableStateOf(false) }
    var skipIntroDone by remember { mutableStateOf(false) }
    var showNextOverlay by remember { mutableStateOf(false) }
    var nextCountdown by remember { mutableIntStateOf(10) }
    var creditsTriggered by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    // Periodic position observer.
    LaunchedEffect(player) {
        while (isActive) {
            val pos = player.currentPosition
            val dur = player.duration.coerceAtLeast(0L)
            val intro = viewModel.introWindow()
            if (!skipIntroDone && intro != null && pos in intro) {
                if (state.skipIntroAuto) {
                    player.seekTo(intro.last)
                    skipIntroDone = true
                    showSkipIntro = false
                } else {
                    showSkipIntro = true
                }
            } else if (showSkipIntro) {
                showSkipIntro = false
            }

            val credits = viewModel.creditsStart()
            if (!creditsTriggered && credits != null && pos >= credits) {
                creditsTriggered = true
                if (state.nextEpisode != null) {
                    if (state.autoplayNext) {
                        showNextOverlay = true
                        scope.launch {
                            for (i in 10 downTo 1) {
                                nextCountdown = i
                                delay(1_000)
                                if (!showNextOverlay) return@launch
                            }
                            state.nextEpisode.let { onPlayNext(it.id) }
                        }
                    } else {
                        showNextOverlay = true
                    }
                }
            }

            // Save progress every ~5s.
            if (dur > 0) viewModel.saveProgress(pos, dur)
            delay(5_000)
        }
    }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    val dur = player.duration.coerceAtLeast(0L)
                    viewModel.saveProgress(dur, dur, watchedOverride = true)
                    val next = state.nextEpisode
                    if (next != null && state.autoplayNext) onPlayNext(next.id) else onFinished()
                }
            }
        }
        player.addListener(listener)
        onDispose {
            val pos = player.currentPosition
            val dur = player.duration.coerceAtLeast(0L)
            if (dur > 0) viewModel.saveProgress(pos, dur)
            player.removeListener(listener)
            player.release()
        }
    }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            PlayerView(ctx).apply {
                this.player = player
                useController = true
                setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING)
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                // TV: keep controller accessible to D-pad without auto-hide annoyance.
                if (isTv) controllerShowTimeoutMs = 4_000
            }
        },
    )

    if (showSkipIntro) {
        SkipIntroOverlay(onSkip = {
            viewModel.introWindow()?.let { player.seekTo(it.last) }
            skipIntroDone = true
            showSkipIntro = false
        })
    }

    if (showNextOverlay && state.nextEpisode != null) {
        val title = state.nextEpisode.titleHe ?: state.nextEpisode.title
        NextEpisodeOverlay(
            nextTitle = title,
            countdownSec = nextCountdown,
            onPlayNow = { onPlayNext(state.nextEpisode.id) },
            onCancel = { showNextOverlay = false },
        )
    }
}
