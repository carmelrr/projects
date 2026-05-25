package com.anime.streamer

import android.app.Application
import com.anime.streamer.sync.FirestoreSyncManager
import com.google.firebase.auth.FirebaseAuth
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class AnimeStreamerApp : Application() {

    @Inject lateinit var syncManager: FirestoreSyncManager

    override fun onCreate() {
        super.onCreate()
        // Start sync immediately if already signed in; restart on any future sign-in.
        FirebaseAuth.getInstance().addAuthStateListener { fbAuth ->
            if (fbAuth.currentUser != null) syncManager.start()
            else syncManager.stop()
        }
    }
}
