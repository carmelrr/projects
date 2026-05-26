package com.anime.streamer.data

import android.content.Context
import com.anime.streamer.data.local.EpisodeDao
import com.anime.streamer.data.local.EpisodeEntity
import com.anime.streamer.data.local.SettingsStore
import com.anime.streamer.data.model.CatalogDefaults
import com.anime.streamer.data.model.Episode
import com.anime.streamer.data.model.EpisodesCatalog
import com.anime.streamer.data.model.SourceType
import com.anime.streamer.data.remote.EpisodesRemoteSource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json

class EpisodesRepository(
    private val appContext: Context,
    private val remote: EpisodesRemoteSource,
    private val dao: EpisodeDao,
    private val settings: SettingsStore,
    private val json: Json = Json { ignoreUnknownKeys = true; isLenient = true },
) {
    private var cachedDefaults: CatalogDefaults = CatalogDefaults()

    val episodes: Flow<List<Episode>> = dao.observeAll().map { rows -> rows.map { it.toDomain() } }

    suspend fun ensureSeeded() {
        if (dao.count() == 0) {
            val bundled = loadBundled()
            persist(bundled)
        }
    }

    suspend fun refresh(): Result<Unit> = runCatching {
        val url = settings.settings.first().catalogUrl
        if (url.isBlank()) return@runCatching
        val catalog = remote.fetch(url)
        persist(catalog)
    }

    suspend fun findById(id: String): Episode? = dao.get(id)?.toDomain()

    suspend fun findNext(currentId: String): Episode? {
        val current = findById(currentId) ?: return null
        val all = dao.observeAll().first().map { it.toDomain() }
            .sortedWith(compareBy({ it.season }, { it.number }))
        val idx = all.indexOfFirst { it.id == current.id }
        return if (idx in 0 until all.lastIndex) all[idx + 1] else null
    }

    fun defaults(): CatalogDefaults = cachedDefaults

    private suspend fun persist(catalog: EpisodesCatalog) {
        cachedDefaults = catalog.defaults
        dao.upsertAll(catalog.episodes.map { it.toEntity() })
    }

    private fun loadBundled(): EpisodesCatalog {
        val text = appContext.assets.open("episodes.json").bufferedReader().use { it.readText() }
        return json.decodeFromString(EpisodesCatalog.serializer(), text)
    }
}

private fun EpisodeEntity.toDomain() = Episode(
    id = id, season = season, number = number, title = title, titleHe = titleHe, arc = arc,
    sourceUrl = sourceUrl, sourceType = SourceType.valueOf(sourceType),
    introStartMs = introStartMs, introEndMs = introEndMs,
    creditsStartMs = creditsStartMs, durationMs = durationMs, thumbnailUrl = thumbnailUrl,
    postUrl = postUrl,
)

private fun Episode.toEntity() = EpisodeEntity(
    id = id, season = season, number = number, title = title, titleHe = titleHe, arc = arc,
    sourceUrl = sourceUrl, sourceType = sourceType.name,
    introStartMs = introStartMs, introEndMs = introEndMs,
    creditsStartMs = creditsStartMs, durationMs = durationMs, thumbnailUrl = thumbnailUrl,
    postUrl = postUrl,
)
