package com.anime.streamer.ui.phone

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.anime.streamer.R
import com.anime.streamer.ui.HomeViewModel
import com.anime.streamer.ui.common.EpisodeCard

@Composable
fun PhoneHomeScreen(
    onPlay: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    if (state.loading) {
        androidx.compose.foundation.layout.Box(Modifier.fillMaxSize(), Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 180.dp),
        contentPadding = PaddingValues(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        if (state.continueWatching.isNotEmpty()) {
            item(span = { GridItemSpanMax() }) {
                Column {
                    Text(
                        text = stringResource(R.string.continue_watching),
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(vertical = 8.dp),
                    )
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(state.continueWatching, key = { it.first.id }) { (ep, ws) ->
                            androidx.compose.foundation.layout.Box(Modifier.width(220.dp)) {
                                EpisodeCard(episode = ep, watchState = ws, onClick = { onPlay(ep.id) })
                            }
                        }
                    }
                }
            }
            item(span = { GridItemSpanMax() }) {
                Text(
                    text = stringResource(R.string.episodes),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 12.dp),
                )
            }
        }
        gridItems(state.episodes, key = { it.id }) { ep ->
            EpisodeCard(
                episode = ep,
                watchState = state.watchByEpisode[ep.id],
                onClick = { onPlay(ep.id) },
            )
        }
    }
}

@Suppress("FunctionName")
private fun androidx.compose.foundation.lazy.grid.LazyGridItemSpanScope.GridItemSpanMax() =
    androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan)