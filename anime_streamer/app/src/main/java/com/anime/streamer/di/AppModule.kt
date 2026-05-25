package com.anime.streamer.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStoreFile
import androidx.room.Room
import com.anime.streamer.data.EpisodesRepository
import com.anime.streamer.data.WatchStateRepository
import com.anime.streamer.data.local.AppDatabase
import com.anime.streamer.data.local.EpisodeDao
import com.anime.streamer.data.local.SettingsStore
import com.anime.streamer.data.local.WatchStateDao
import com.anime.streamer.data.remote.EpisodesRemoteSource
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "anime_streamer.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun provideWatchStateDao(db: AppDatabase): WatchStateDao = db.watchStateDao()
    @Provides fun provideEpisodeDao(db: AppDatabase): EpisodeDao = db.episodeDao()

    @Provides @Singleton
    fun providePrefs(@ApplicationContext context: Context): DataStore<Preferences> =
        PreferenceDataStoreFactory.create(produceFile = { context.preferencesDataStoreFile("settings") })

    @Provides @Singleton
    fun provideSettingsStore(prefs: DataStore<Preferences>): SettingsStore = SettingsStore(prefs)

    @Provides @Singleton
    fun provideEpisodesRemoteSource(): EpisodesRemoteSource = EpisodesRemoteSource()

    @Provides @Singleton
    fun provideEpisodesRepository(
        @ApplicationContext context: Context,
        remote: EpisodesRemoteSource,
        dao: EpisodeDao,
        settings: SettingsStore,
    ): EpisodesRepository = EpisodesRepository(context, remote, dao, settings)

    @Provides @Singleton
    fun provideWatchStateRepository(dao: WatchStateDao): WatchStateRepository = WatchStateRepository(dao)
}
