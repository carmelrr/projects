package com.anime.streamer.sync

import com.anime.streamer.data.WatchStateRepository
import com.anime.streamer.data.model.WatchState
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

@OptIn(FlowPreview::class)
@Singleton
class FirestoreSyncManager @Inject constructor(
    private val watch: WatchStateRepository,
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var sessionJob: Job? = null

    /** Call whenever Firebase auth state changes to (re-)activate sync. */
    fun start() {
        val uid = auth.currentUser?.uid ?: return
        if (sessionJob?.isActive == true) return
        val col = firestore.collection("users").document(uid).collection("watchState")
        sessionJob = scope.launch {
            runCatching {
                val snap = col.get().await()
                snap.documents.forEach { doc ->
                    val ws = doc.toWatchState() ?: return@forEach
                    val local = watch.get(ws.episodeId)
                    if (local == null || local.updatedAt < ws.updatedAt) watch.update(ws)
                }
            }
            watch.observeAll().debounce(30_000).collectLatest { states ->
                states.forEach { ws ->
                    runCatching {
                        col.document(ws.episodeId).set(
                            mapOf(
                                "episodeId" to ws.episodeId,
                                "positionMs" to ws.positionMs,
                                "durationMs" to ws.durationMs,
                                "watched" to ws.watched,
                                "updatedAt" to ws.updatedAt,
                            )
                        ).await()
                    }
                }
            }
        }
    }

    fun stop() {
        sessionJob?.cancel()
        sessionJob = null
    }

    private fun com.google.firebase.firestore.DocumentSnapshot.toWatchState(): WatchState? {
        val id = getString("episodeId") ?: id
        val position = getLong("positionMs") ?: return null
        val duration = getLong("durationMs") ?: 0L
        val watched = getBoolean("watched") ?: false
        val updatedAt = getLong("updatedAt") ?: 0L
        return WatchState(id, position, duration, watched, updatedAt)
    }
}
