package com.anime.streamer.ui.tv

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
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
    var searchQuery by remember { mutableStateOf("") }
    val focusManager = LocalFocusManager.current

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

        val filteredEps = remember(searchQuery, state.episodes) {
            val q = searchQuery.trim()
            if (q.isBlank()) state.episodes
            else state.episodes.filter { ep ->
                ep.number.toString().startsWith(q) ||
                (ep.titleHe ?: ep.title).contains(q, ignoreCase = true)
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            // ── Top row: title + search ───────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                val label = if (searchQuery.isBlank())
                    stringResource(R.string.episodes) + " (${state.episodes.size})"
                else
                    "${filteredEps.size} תוצאות"
                Text(label, style = MaterialTheme.typography.headlineSmall, color = Color.White)

                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.width(300.dp),
                    placeholder = { androidx.compose.material3.Text("חפש פרק…", color = Color.Gray) },
                    leadingIcon = { Icon(Icons.Default.Search, null, tint = Color.Gray) },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = ""; focusManager.clearFocus() }) {
                                Icon(Icons.Default.Clear, null, tint = Color.Gray)
                            }
                        }
                    },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Search,
                    ),
                    keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF00C853),
                        unfocusedBorderColor = Color.DarkGray,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        cursorColor = Color(0xFF00C853),
                    ),
                    shape = RoundedCornerShape(8.dp),
                )
            }

            // ── Continue watching (hidden when searching) ─────────────────────
            if (searchQuery.isBlank() && state.continueWatching.isNotEmpty()) {
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

            // ── Episode grid ──────────────────────────────────────────────────
            LazyVerticalGrid(
                columns = GridCells.Fixed(5),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                gridItems(items = filteredEps, key = { it.id }) { ep ->
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
