package com.anime.streamer.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.anime.streamer.data.EpisodesRepository
import com.anime.streamer.data.WatchStateRepository
import com.anime.streamer.data.local.SettingsStore
import com.anime.streamer.data.model.Episode
import com.anime.streamer.data.model.WatchState
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class PlayerUiState(
    val episode: Episode? = null,
    val nextEpisode: Episode? = null,
    val startPositionMs: Long = 0L,
    val autoplayNext: Boolean = true,
    val skipIntroAuto: Boolean = false,
    val skipOutroAuto: Boolean = false,
    val defaultIntroStartMs: Long? = null,
    val defaultIntroEndMs: Long? = null,
    val defaultCreditsStartMs: Long? = null,
    val ready: Boolean = false,
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val episodes: EpisodesRepository,
    private val watch: WatchStateRepository,
    private val settings: SettingsStore,
) : ViewModel() {

    private val _state = MutableStateFlow(PlayerUiState())
    val state: StateFlow<PlayerUiState> = _state.asStateFlow()

    fun load(episodeId: String) {
        viewModelScope.launch {
            val ep = episodes.findById(episodeId) ?: return@launch
            val next = episodes.findNext(episodeId)
            val ws = watch.get(episodeId)
            val s = settings.settings.first()
            val defaults = episodes.defaults()
            _state.value = PlayerUiState(
                episode = ep,
                nextEpisode = next,
                startPositionMs = ws?.positionMs?.takeIf { (ws.durationMs == 0L) || it < ws.durationMs - 5_000 } ?: 0L,
                autoplayNext = s.autoplayNext,
                skipIntroAuto = s.skipIntroAuto,
                skipOutroAuto = s.skipOutroAuto,
                defaultIntroStartMs = defaults.introStartMs,
                defaultIntroEndMs = defaults.introEndMs,
                defaultCreditsStartMs = defaults.creditsStartMs,
                ready = true,
            )
        }
    }

    fun saveProgress(positionMs: Long, durationMs: Long, watchedOverride: Boolean? = null) {
        val ep = _state.value.episode ?: return
        val creditsStart = ep.creditsStartMs ?: _state.value.defaultCreditsStartMs
        val watched = watchedOverride ?: run {
            val byCredits = creditsStart != null && positionMs >= creditsStart
            val byRatio = durationMs > 0 && positionMs.toFloat() / durationMs >= 0.9f
            byCredits || byRatio
        }
        viewModelScope.launch {
            watch.update(
                WatchState(
                    episodeId = ep.id,
                    positionMs = positionMs,
                    durationMs = durationMs,
                    watched = watched,
                    updatedAt = System.currentTimeMillis(),
                )
            )
        }
    }

    fun introWindow(): LongRange? {
        val ep = _state.value.episode ?: return null
        val start = ep.introStartMs ?: _state.value.defaultIntroStartMs ?: return null
        val end = ep.introEndMs ?: _state.value.defaultIntroEndMs ?: return null
        return if (end > start) start..end else null
    }

    fun creditsStart(): Long? =
        _state.value.episode?.creditsStartMs ?: _state.value.defaultCreditsStartMs
}
