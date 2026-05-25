package com.anime.streamer.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

data class AppSettings(
    val autoplayNext: Boolean = true,
    val skipIntroAuto: Boolean = false,
    val skipOutroAuto: Boolean = false,
    val catalogUrl: String = "",
)

class SettingsStore(private val dataStore: DataStore<Preferences>) {

    private object Keys {
        val autoplayNext = booleanPreferencesKey("autoplayNext")
        val skipIntroAuto = booleanPreferencesKey("skipIntroAuto")
        val skipOutroAuto = booleanPreferencesKey("skipOutroAuto")
        val catalogUrl = stringPreferencesKey("catalogUrl")
    }

    val settings: Flow<AppSettings> = dataStore.data.map { prefs ->
        AppSettings(
            autoplayNext = prefs[Keys.autoplayNext] ?: true,
            skipIntroAuto = prefs[Keys.skipIntroAuto] ?: false,
            skipOutroAuto = prefs[Keys.skipOutroAuto] ?: false,
            catalogUrl = prefs[Keys.catalogUrl] ?: "",
        )
    }

    suspend fun setAutoplayNext(value: Boolean) = dataStore.edit { it[Keys.autoplayNext] = value }
    suspend fun setSkipIntroAuto(value: Boolean) = dataStore.edit { it[Keys.skipIntroAuto] = value }
    suspend fun setSkipOutroAuto(value: Boolean) = dataStore.edit { it[Keys.skipOutroAuto] = value }
    suspend fun setCatalogUrl(value: String) = dataStore.edit { it[Keys.catalogUrl] = value }
}
