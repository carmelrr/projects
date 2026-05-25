package com.anime.streamer.data

import com.anime.streamer.data.local.WatchStateDao
import com.anime.streamer.data.local.WatchStateEntity
import com.anime.streamer.data.model.WatchState
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class WatchStateRepository(private val dao: WatchStateDao) {

    fun observeAll(): Flow<List<WatchState>> = dao.observeAll().map { it.map(::toDomain) }
    fun observeContinueWatching(): Flow<List<WatchState>> =
        dao.observeContinueWatching().map { it.map(::toDomain) }

    fun observe(id: String): Flow<WatchState?> = dao.observe(id).map { it?.let(::toDomain) }
    suspend fun get(id: String): WatchState? = dao.get(id)?.let(::toDomain)

    suspend fun update(state: WatchState) {
        dao.upsert(
            WatchStateEntity(
                episodeId = state.episodeId,
                positionMs = state.positionMs,
                durationMs = state.durationMs,
                watched = state.watched,
                updatedAt = state.updatedAt,
            )
        )
    }

    private fun toDomain(e: WatchStateEntity) = WatchState(
        episodeId = e.episodeId,
        positionMs = e.positionMs,
        durationMs = e.durationMs,
        watched = e.watched,
        updatedAt = e.updatedAt,
    )
}
