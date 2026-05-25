package com.anime.streamer.sync

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

@Singleton
class AuthManager @Inject constructor(
    private val auth: FirebaseAuth,
) {
    private val _signedIn = MutableStateFlow(auth.currentUser != null)
    val signedIn: StateFlow<Boolean> = _signedIn.asStateFlow()

    val currentUser: FirebaseUser? get() = auth.currentUser
    val email: String? get() = auth.currentUser?.email

    init {
        auth.addAuthStateListener { _signedIn.value = it.currentUser != null }
    }

    fun signIn(
        email: String,
        password: String,
        onResult: (success: Boolean, error: String?) -> Unit,
    ) {
        auth.signInWithEmailAndPassword(email, password)
            .addOnSuccessListener { onResult(true, null) }
            .addOnFailureListener { onResult(false, it.message) }
    }

    fun register(
        email: String,
        password: String,
        onResult: (success: Boolean, error: String?) -> Unit,
    ) {
        auth.createUserWithEmailAndPassword(email, password)
            .addOnSuccessListener { onResult(true, null) }
            .addOnFailureListener { onResult(false, it.message) }
    }

    fun signOut() {
        auth.signOut()
    }
}
