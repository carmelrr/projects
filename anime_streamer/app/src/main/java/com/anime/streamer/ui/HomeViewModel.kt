package com.anime.streamer.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.anime.streamer.data.EpisodesRepository
import com.anime.streamer.data.WatchStateRepository
import com.anime.streamer.data.model.Episode
import com.anime.streamer.data.model.WatchState
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class HomeUiState(
    val loading: Boolean = true,
    val episodes: List<Episode> = emptyList(),
    val watchByEpisode: Map<String, WatchState> = emptyMap(),
    val continueWatching: List<Pair<Episode, WatchState>> = emptyList(),
    val nextToWatch: Episode? = null,
    val nextToWatchState: WatchState? = null,
    val error: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val episodes: EpisodesRepository,
    private val watch: WatchStateRepository,
) : ViewModel() {

    val state: StateFlow<HomeUiState> = combine(
        episodes.episodes,
        watch.observeAll(),
    ) { eps, states ->
        val sortedEps = eps.sortedWith(compareBy({ it.season }, { it.number }))
        val byId = states.associateBy { it.episodeId }

        val continueList = states
            .filterNot { it.watched }
            .sortedByDescending { it.updatedAt }
            .mapNotNull { ws -> sortedEps.firstOrNull { it.id == ws.episodeId }?.let { it to ws } }
            .take(10)

        // Determine the single "next to watch" episode.
        val lastState = states.maxByOrNull { it.updatedAt }
        val (nextToWatch, nextToWatchState) = when {
            lastState == null -> Pair(sortedEps.firstOrNull(), null)
            !lastState.watched && lastState.positionMs > 10_000 -> {
                // Mid-episode — continue it.
                Pair(sortedEps.firstOrNull { it.id == lastState.episodeId }, lastState)
            }
            else -> {
                // Last was finished — show next in sequence.
                val idx = sortedEps.indexOfFirst { it.id == lastState.episodeId }
                val next = if (idx in 0 until sortedEps.lastIndex) sortedEps[idx + 1] else null
                Pair(next, null)
            }
        }

        HomeUiState(
            loading = false,
            episodes = sortedEps,
            watchByEpisode = byId,
            continueWatching = continueList,
            nextToWatch = nextToWatch,
            nextToWatchState = nextToWatchState,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())

    init {
        viewModelScope.launch {
            runCatching { episodes.ensureSeeded() }
            episodes.refresh()
        }
    }

    fun refresh() {
        viewModelScope.launch { episodes.refresh() }
    }
}
