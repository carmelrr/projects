package com.anime.streamer.ui.tv

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.anime.streamer.R
import com.anime.streamer.ui.HomeViewModel
import com.anime.streamer.ui.common.EpisodeCard

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvHomeScreen(
    onPlay: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0A0A))
            .padding(horizontal = 32.dp, vertical = 24.dp)
    ) {
        if (state.loading) {
            Text(
                stringResource(R.string.loading),
                modifier = Modifier.align(Alignment.Center),
                color = Color.White,
            )
            return@Box
        }

        Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
            if (state.continueWatching.isNotEmpty()) {
                Text(
                    stringResource(R.string.continue_watching),
                    style = MaterialTheme.typography.headlineSmall,
                    color = Color.White,
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    items(state.continueWatching, key = { it.first.id }) { (ep, ws) ->
                        Box(Modifier.width(280.dp)) {
                            EpisodeCard(episode = ep, watchState = ws, onClick = { onPlay(ep.id) })
                        }
                    }
                }
            }

            Text(
                stringResource(R.string.episodes),
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White,
            )
            LazyVerticalGrid(
                columns = GridCells.Fixed(5),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                val list = state.episodes
                gridItems(count = list.size, key = { idx -> list[idx].id }) { idx ->
                    val ep = list[idx]
                    EpisodeCard(
                        episode = ep,
                        watchState = state.watchByEpisode[ep.id],
                        onClick = { onPlay(ep.id) },
                    )
                }
            }
        }
    }
}
