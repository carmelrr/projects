package com.anime.streamer.ui.phone

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.anime.streamer.data.model.Episode
import com.anime.streamer.data.model.WatchState
import com.anime.streamer.ui.HomeViewModel
import com.anime.streamer.ui.common.EpisodeCard

@Composable
fun PhoneHomeScreen(
    onPlay: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var searchQuery by remember { mutableStateOf("") }
    val focusManager = LocalFocusManager.current

    if (state.loading) {
        Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
        return
    }

    val filteredEps = remember(searchQuery, state.episodes) {
        val q = searchQuery.trim()
        if (q.isBlank()) state.episodes
        else state.episodes.filter { ep ->
            ep.number.toString().startsWith(q) ||
            (ep.titleHe ?: ep.title).contains(q, ignoreCase = true)
        }
    }
    val episodeRows = remember(filteredEps) { filteredEps.chunked(2) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // ── Banner + continue watching — hidden during active search ──────────
        if (searchQuery.isBlank()) {
            state.nextToWatch?.let { ep ->
                item(key = "banner") {
                    NextEpisodeBanner(
                        episode = ep,
                        watchState = state.nextToWatchState,
                        onPlay = { onPlay(ep.id) },
                    )
                }
            }

            val others = state.continueWatching.filter { it.first.id != state.nextToWatch?.id }
            if (others.isNotEmpty()) {
                item(key = "continue_label") {
                    Text("ממשיך לצפות", style = MaterialTheme.typography.titleMedium, color = Color.White)
                }
                item(key = "continue_row") {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(others, key = { it.first.id }) { (ep, ws) ->
                            Box(Modifier.width(180.dp)) {
                                EpisodeCard(episode = ep, watchState = ws, onClick = { onPlay(ep.id) })
                            }
                        }
                    }
                }
            }
        }

        // ── Search bar ────────────────────────────────────────────────────────
        item(key = "search") {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = {
                    Text(
                        if (searchQuery.isBlank()) "חפש פרק (מספר או שם)…" else "",
                        color = Color.Gray,
                    )
                },
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
                shape = RoundedCornerShape(12.dp),
            )
        }

        // ── Episode count label ───────────────────────────────────────────────
        item(key = "ep_count") {
            val label = if (searchQuery.isBlank())
                "כל הפרקים (${state.episodes.size})"
            else
                "${filteredEps.size} תוצאות"
            Text(label, style = MaterialTheme.typography.labelMedium, color = Color.Gray)
        }

        // ── Episodes — 2-column rows via LazyColumn (avoids nested-scrollable) ─
        items(episodeRows, key = { it.first().id }) { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                for (i in 0..1) {
                    Box(Modifier.weight(1f)) {
                        val ep = row.getOrNull(i)
                        if (ep != null) {
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
    }
}

@Composable
private fun NextEpisodeBanner(
    episode: Episode,
    watchState: WatchState?,
    onPlay: () -> Unit,
) {
    val inProgress = watchState != null && watchState.positionMs > 10_000
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF1A1A2E), RoundedCornerShape(16.dp))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = if (inProgress) "המשך לצפות" else "הפרק הבא",
            color = Color(0xFF00C853),
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = episode.titleHe ?: episode.title,
            color = Color.White,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
        )
        Text("פרק ${episode.number}", color = Color.Gray, fontSize = 14.sp)

        if (inProgress && watchState!!.durationMs > 0) {
            val progress = watchState.positionMs.toFloat() / watchState.durationMs
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF00C853),
                trackColor = Color.DarkGray,
            )
            val remainSec = ((watchState.durationMs - watchState.positionMs) / 1000).toInt()
            Text(
                "נשאר ${remainSec / 60}:${(remainSec % 60).toString().padStart(2, '0')}",
                color = Color.Gray,
                fontSize = 12.sp,
            )
        }

        Button(
            onClick = onPlay,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C853)),
        ) {
            Text(
                text = if (inProgress) "▶  המשך" else "▶  נגן",
                color = Color.Black,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
            )
        }
    }
}
