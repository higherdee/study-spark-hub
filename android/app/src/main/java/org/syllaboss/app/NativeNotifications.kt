@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import android.net.ConnectivityManager
import androidx.lifecycle.repeatOnLifecycle
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Handler
import android.os.Looper
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Popup
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable internal fun ConnectionStatus(onReconnect:()->Unit) {
    val context=LocalContext.current
    val manager=remember { context.getSystemService(ConnectivityManager::class.java) }
    fun online():Boolean=manager.getNetworkCapabilities(manager.activeNetwork)?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)==true
    var connected by remember { mutableStateOf(online()) }
    var restored by remember { mutableStateOf(false) }
    val latestReconnect by rememberUpdatedState(onReconnect)
    DisposableEffect(manager) {
        val handler=Handler(Looper.getMainLooper())
        val callback=object:ConnectivityManager.NetworkCallback() {
            fun update() { handler.post { val next=online();if(next&&!connected){restored=true;latestReconnect()};connected=next } }
            override fun onAvailable(network:Network){update()}
            override fun onLost(network:Network){update()}
            override fun onCapabilitiesChanged(network:Network, capabilities:NetworkCapabilities){update()}
        }
        manager.registerDefaultNetworkCallback(callback)
        onDispose { manager.unregisterNetworkCallback(callback) }
    }
    LaunchedEffect(restored){if(restored){delay(3500);restored=false}}
    if(!connected||restored) Popup(alignment=Alignment.TopCenter) {
        Surface(Modifier.statusBarsPadding().padding(12.dp),shape=MaterialTheme.shapes.medium,color=MaterialTheme.colorScheme.secondaryContainer,shadowElevation=6.dp) {
            Row(Modifier.padding(14.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(10.dp)) {
                Icon(if(connected) Icons.Outlined.Wifi else Icons.Outlined.WifiOff,null)
                Text(if(connected) "Back online · refreshing your space" else "You're offline · reconnect to sync",style=MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable internal fun NativeNotifications(back:()->Unit) {
    val scope=rememberCoroutineScope()
    val lifecycle=androidx.lifecycle.compose.LocalLifecycleOwner.current.lifecycle
    var notifications by remember {mutableStateOf<List<JSONObject>>(emptyList())}
    var error by remember {mutableStateOf("")}
    var loaded by remember {mutableStateOf(false)}
    var revision by remember {mutableIntStateOf(0)}
    LaunchedEffect(lifecycle,revision) {
        lifecycle.repeatOnLifecycle(androidx.lifecycle.Lifecycle.State.STARTED) {
            while(true) {
                try {notifications=StudyApi.call("notifications").objects("notifications");error="";loaded=true}
                catch(e:Exception){if(e is kotlinx.coroutines.CancellationException)throw e;error=e.message?:"Notifications couldn't load."}
                delay(10000)
            }
        }
    }
    Scaffold(topBar={TopAppBar(title={Text("Notifications")},navigationIcon={IconButton(onClick=back){Icon(Icons.Outlined.ArrowBack,"Back")}})}) {padding->
        LazyColumn(Modifier.fillMaxSize().padding(padding),contentPadding=PaddingValues(22.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
            if(error.isNotBlank()) item {Text(error,color=MaterialTheme.colorScheme.error);TextButton(onClick={revision++}){Text("Try again")}}
            if(!loaded&&error.isBlank()) item{LinearProgressIndicator(Modifier.fillMaxWidth())}
            if(loaded&&notifications.isEmpty()) item{Text("You're all caught up.",style=MaterialTheme.typography.headlineMedium);Text("Rewards, account updates and announcements will appear here.")}
            items(notifications,key={it.getString("id")}) { item ->
                Card(onClick={scope.launch {try{StudyApi.call(body=JSONObject().put("action","read-notification").put("id",item.getString("id")));revision++}catch(e:Exception){if(e is kotlinx.coroutines.CancellationException)throw e;error="Couldn't mark this notification read."}}},colors=CardDefaults.cardColors(containerColor=if(item.optBoolean("read")) MaterialTheme.colorScheme.surfaceContainer else Sage)) {
                    Column(Modifier.fillMaxWidth().padding(18.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {Text(item.optString("title"),style=MaterialTheme.typography.titleMedium);Text(item.optString("message"));Text(item.optString("created_at"),style=MaterialTheme.typography.labelSmall,color=Muted)}
                }
            }
        }
    }
}
