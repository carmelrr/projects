package com.anime.streamer.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.anime.streamer.R
import com.anime.streamer.data.model.SourceType

@Composable
fun PlayerScreen(
    episodeId: String,
    isTv: Boolean,
    onFinished: () -> Unit,
    onPlayNext: (String) -> Unit,
    viewModel: PlayerViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(episodeId) { viewModel.load(episodeId) }

    val episode = state.episode
    Box(modifier = Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
        if (!state.ready || episode == null) {
            CircularProgressIndicator(color = Color.White)
            return@Box
        }
        when (episode.sourceType) {
            SourceType.DRIVE, SourceType.DIRECT -> ExoPlayerScreen(
                state = state,
                viewModel = viewModel,
                isTv = isTv,
                onFinished = onFinished,
                onPlayNext = onPlayNext,
            )
            SourceType.MEGA -> MegaWebViewScreen(
                state = state,
                onPlayNext = onPlayNext,
                onBack = onFinished,
            )
        }
    }
}

@Composable
internal fun NextEpisodeOverlay(
    nextTitle: String,
    countdownSec: Int,
    onPlayNow: () -> Unit,
    onCancel: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.55f)),
        contentAlignment = Alignment.BottomEnd,
    ) {
        Box(Modifier.padding(32.dp)) {
            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(text = stringResource(R.string.next_episode) + ": $nextTitle", color = Color.White)
                Text(text = "$countdownSec", color = Color.White)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(onClick = onCancel) { Text(stringResource(R.string.cancel)) }
                    Button(onClick = onPlayNow) { Text(stringResource(R.string.play_now)) }
                }
            }
        }
    }
}

@Composable
internal fun SkipIntroOverlay(onSkip: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.BottomEnd) {
        Button(onClick = onSkip) { Text(stringResource(R.string.skip_intro)) }
    }
}
