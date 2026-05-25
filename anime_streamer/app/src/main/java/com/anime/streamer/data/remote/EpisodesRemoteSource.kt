package com.anime.streamer.data.remote

import com.anime.streamer.data.model.EpisodesCatalog
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

class EpisodesRemoteSource(
    private val client: HttpClient = defaultClient(),
) {
    suspend fun fetch(url: String): EpisodesCatalog = client.get(url).body()

    companion object {
        fun defaultClient(): HttpClient = HttpClient {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true; isLenient = true })
            }
        }
    }
}
