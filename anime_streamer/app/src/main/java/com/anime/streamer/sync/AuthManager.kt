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

import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

@Singleton
class AuthManager @Inject constructor(
    private val auth: FirebaseAuth,
    @ApplicationContext private val context: Context,
) {
    private val _signedIn = MutableStateFlow(auth.currentUser != null)
    val signedIn: StateFlow<Boolean> = _signedIn.asStateFlow()

    val currentUser: FirebaseUser? get() = auth.currentUser
    val displayName: String? get() = auth.currentUser?.displayName
    val email: String? get() = auth.currentUser?.email

    init {
        auth.addAuthStateListener { _signedIn.value = it.currentUser != null }
    }

    fun getSignInIntent(): Intent = googleSignInClient().signInIntent

    fun handleSignInResult(data: Intent?, onDone: (success: Boolean) -> Unit) {
        try {
            val account = GoogleSignIn.getSignedInAccountFromIntent(data)
                .getResult(ApiException::class.java)
            val credential = GoogleAuthProvider.getCredential(account.idToken, null)
            auth.signInWithCredential(credential)
                .addOnSuccessListener { onDone(true) }
                .addOnFailureListener { onDone(false) }
        } catch (_: ApiException) {
            onDone(false)
        }
    }

    /**
     * Silent sign-in: works when the user has previously signed in, or when the device
     * (Android TV) has a Google account configured at the OS level.
     */
    fun trySilentSignIn(onDone: (success: Boolean) -> Unit) {
        if (auth.currentUser != null) { onDone(true); return }
        googleSignInClient().silentSignIn()
            .addOnSuccessListener { account ->
                val credential = GoogleAuthProvider.getCredential(account.idToken, null)
                auth.signInWithCredential(credential)
                    .addOnSuccessListener { onDone(true) }
                    .addOnFailureListener { onDone(false) }
            }
            .addOnFailureListener { onDone(false) }
    }

    fun signOut() {
        auth.signOut()
        googleSignInClient().signOut()
    }

    private fun googleSignInClient(): GoogleSignInClient {
        val webClientId = runCatching { context.getString(R.string.default_web_client_id) }
            .getOrDefault("")
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(webClientId)
            .requestEmail()
            .build()
        return GoogleSignIn.getClient(context, gso)
    }
}
