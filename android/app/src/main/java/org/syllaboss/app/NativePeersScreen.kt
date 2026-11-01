@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URLEncoder

@Composable internal fun NativePeersScreen(back: () -> Unit, onChatOpen: (Boolean) -> Unit) {
    val scope = rememberCoroutineScope()
    var groups by rememberSaveable { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf("") }
    var peers by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var conversations by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var active by remember { mutableStateOf<JSONObject?>(null) }
    var messages by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var draft by rememberSaveable { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var refresh by remember { mutableIntStateOf(0) }
    fun array(result: JSONObject, key: String): List<JSONObject> { val a = result.optJSONArray(key) ?: return emptyList(); return (0 until a.length()).map { a.getJSONObject(it) } }
    LaunchedEffect(active?.optString("id")) { onChatOpen(active != null) }
    DisposableEffect(Unit) { onDispose { onChatOpen(false) } }
    LaunchedEffect(query, refresh, active?.optString("id"), groups) {
        if (groups) return@LaunchedEffect
        loading = true; error = ""
        try {
            if (active != null) messages = array(StudyApi.call("direct-messages&thread=" + URLEncoder.encode(active!!.getString("id"), "UTF-8")), "messages")
            else if (query.trim().isNotEmpty()) { delay(350); peers = array(StudyApi.call("peers&q=" + URLEncoder.encode(query.trim(), "UTF-8")), "peers") }
            else conversations = array(StudyApi.call("direct-conversations"), "conversations")
        } catch (e: Exception) { if (e is kotlinx.coroutines.CancellationException) throw e; error = e.message ?: "This conversation could not be loaded." } finally { loading = false }
    }
    BackHandler(active != null || groups) { if (active != null) { active = null; draft = "" } else groups = false }
    if (groups) { PeersScreen({ groups = false }, onChatOpen); return }
    val peerName = active?.optJSONObject("peer")?.let { it.optString("username").takeIf(String::isNotBlank)?.let { name -> "@$name" } ?: it.optString("full_name", "Student") }
    Scaffold(topBar = { TopAppBar(title = { Text(peerName ?: "Your people", maxLines = 1) }, navigationIcon = { IconButton(onClick = { if (active != null) { active = null; draft = "" } else back() }) { Icon(Icons.Outlined.ArrowBack, "Back") } }, actions = { IconButton(onClick = { refresh++ }) { Icon(Icons.Outlined.Refresh, "Refresh messages") } }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).imePadding()) {
            if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
            if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
            if (active == null) {
                Column(Modifier.padding(horizontal = 20.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("A good question starts a conversation.", fontFamily = WebsiteDisplay, fontSize = 27.sp)
                    Text("Search a student's @username to start a chat, or find a course group below.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                    OutlinedTextField(query, { query = it.take(100) }, modifier = Modifier.fillMaxWidth(), singleLine = true, placeholder = { Text("Search @username") }, leadingIcon = { Icon(Icons.Outlined.Search, null) }, shape = RoundedCornerShape(18.dp))
                    OutlinedButton(onClick = { groups = true }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.Groups, null); Spacer(Modifier.width(8.dp)); Text("Browse study groups") }
                }
                LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (query.isBlank()) {
                        if (!loading && conversations.isEmpty()) item { Text("Your conversations will appear here. Search a username to say hello.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        items(conversations) { c -> val peer = c.optJSONObject("peer") ?: JSONObject(); OutlinedCard(onClick = { active = c; messages = emptyList(); draft = "" }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) { Column(Modifier.padding(18.dp)) { Text("@${peer.optString("username")}", fontWeight = FontWeight.SemiBold); Text(c.optString("last_message_text").takeUnless { it == "null" } ?: "Start a conversation", maxLines = 2, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) } } }
                    } else {
                        if (!loading && peers.isEmpty()) item { Text("No username matches yet. Check the spelling or try another username.") }
                        items(peers) { peer -> OutlinedCard(onClick = {
                            if (!busy) { busy = true; scope.launch { try { active = StudyApi.call(body = JSONObject().put("action", "start-direct").put("peerId", peer.getString("id"))); messages = emptyList(); draft = "" } catch (e: Exception) { error = e.message ?: "Chat could not be opened." } finally { busy = false } } }
                        }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) { Column(Modifier.padding(18.dp)) { Text("@${peer.optString("username")}", fontWeight = FontWeight.SemiBold); Text(peer.optString("course").takeUnless { it == "null" } ?: "Syllaboss student", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) } } }
                    }
                }
            } else {
                LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    if (!loading && messages.isEmpty()) item { Text("Start with a question about your course.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    items(messages) { m -> Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surfaceContainer) { Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) { Text(m.optString("sender_name"), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary); androidx.compose.foundation.text.selection.SelectionContainer { Text(m.optString("content"), lineHeight = 23.sp) } } } }
                }
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(draft, { draft = it.take(3000) }, modifier = Modifier.weight(1f), placeholder = { Text("Write a message…") }, maxLines = 5, shape = RoundedCornerShape(22.dp))
                    FilledIconButton(onClick = { val conversationId = active!!.getString("id"); val content = draft.trim(); busy = true; scope.launch { try { StudyApi.call(body = JSONObject().put("action", "direct-message").put("conversationId", conversationId).put("content", content)); if (active?.optString("id") == conversationId) draft = ""; refresh++ } catch (e: Exception) { error = e.message ?: "Message could not be sent." } finally { busy = false } } }, enabled = !busy && draft.isNotBlank(), modifier = Modifier.size(48.dp)) { Icon(Icons.Outlined.ArrowUpward, "Send message") }
                }
            }
        }
    }
}
