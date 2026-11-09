@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.clerk.api.Clerk
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.IntOffset
import kotlin.math.roundToInt
import org.json.JSONObject

internal fun JSONObject.objects(key: String): List<JSONObject> {
    val a = optJSONArray(key) ?: return emptyList()
    return (0 until a.length()).mapNotNull { a.optJSONObject(it) }
}
internal fun String.asQuery() = java.net.URLEncoder.encode(this, "UTF-8")

@Composable internal fun PeerConversation(target: String, title: String, group: Boolean, back: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val account by Clerk.userFlow.collectAsState()
    var messages by remember(target) { mutableStateOf<List<JSONObject>>(emptyList()) }
    var draft by remember(target) { mutableStateOf("") }
    var replyTo by remember(target) { mutableStateOf<JSONObject?>(null) }
    var members by remember(target) { mutableStateOf<List<JSONObject>>(emptyList()) }
    LaunchedEffect(target, group) { if(group) try { members = StudyApi.call("battle-members&target="+target.asQuery()).objects("members") } catch(e: Exception) { if(e is CancellationException) throw e } }
    val mention = Regex("(?:^|\\s)@([A-Za-z0-9_]*)$").find(draft)
    LaunchedEffect(mention != null, target) { if(group && mention != null) try { members = StudyApi.call("battle-members&target="+target.asQuery()).objects("members") } catch(e: Exception) { if(e is CancellationException) throw e } }
    val suggestions = if(mention == null) emptyList() else (listOf("bossai") + members.mapNotNull { it.optString("username").takeIf { name -> name.isNotBlank() && name != "null" } }).distinct().filter { it.startsWith(mention.groupValues[1], true) }.take(6)
    var attachment by remember(target) { mutableStateOf<JSONObject?>(null) }
    var showPicker by remember { mutableStateOf(false) }
    var battle by remember { mutableStateOf<String?>(null) }
    var material by remember { mutableStateOf<Material?>(null) }
    var busy by remember { mutableStateOf(false) }
    var loaded by remember(target) { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var refresh by remember { mutableIntStateOf(0) }
    var requestState by remember(target) { mutableStateOf("") }
    val conversationVisible by rememberUpdatedState(battle == null && material == null && !showPicker)
    val state = rememberLazyListState()
    val resource = if (group) "messages&group=" else "direct-messages&thread="
    LaunchedEffect(target, refresh, lifecycle) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (true) {
                try {
                    val response = StudyApi.call(resource + target.asQuery())
                    val next = response.objects("messages")
                    val atEnd = !loaded || !state.canScrollForward || messages.isEmpty()
                    if (!group) {
                        requestState = response.optString("requestState")
                        if (conversationVisible && atEnd && next.any { it.optString("sender_id") != account?.id && !it.optBoolean("is_read") }) {
                            StudyApi.call(body = JSONObject().put("action", "direct-read").put("conversationId", target)); PeerUpdates.changed()
                        }
                    }
                    val changed = next.lastOrNull()?.optString("id") != messages.lastOrNull()?.optString("id") || next.size != messages.size
                    if (changed || next.map { it.optString("receipt") } != messages.map { it.optString("receipt") }) {
                        messages = next
                        if (changed && atEnd && next.isNotEmpty()) state.scrollToConversationEnd()
                    }
                    loaded = true
                } catch (e: Exception) {
                    if (e is CancellationException) throw e
                    if (!loaded) error = e.message ?: "Unable to load this conversation."
                }
                delay(2500)
            }
        }
    }
    androidx.activity.compose.BackHandler(material != null) { material = null }
    material?.let { DocumentScreen(it, { material = null }, {}); return }
    Scaffold(topBar = {
        TopAppBar(
            title = { Column { Text(title, maxLines = 1); Text(if (group) "Study group" else "Direct message", fontSize = 12.sp, color = Muted) } },
            navigationIcon = { IconButton(onClick = back) { Icon(Icons.Outlined.ArrowBack, "Back") } },
            actions = { TextButton(onClick = { battle = "" }) { Icon(Icons.Outlined.Bolt, null); Text("Battles") } }
        )
    }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).consumeWindowInsets(padding).imePadding()) {
            if (!loaded && error.isBlank()) LinearProgressIndicator(Modifier.fillMaxWidth())
            Box(Modifier.weight(1f).fillMaxWidth()) {
            LazyColumn(Modifier.fillMaxSize(), state = state, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (loaded && messages.isEmpty()) item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Outlined.Forum, null, tint = MaterialTheme.colorScheme.primary)
                        Text("Start the conversation", fontFamily = WebsiteDisplay, fontSize = 25.sp)
                        Text("Ask a question, share notes, or start a battle.", color = Muted, fontSize = 13.sp)
                    }
                }
                item(key="empty-top") { Spacer(Modifier.height(1.dp)) }
                items(messages, key = { it.getString("id") }) { message ->
                    val raw = message.optString("content")
                    val envelope = remember(raw) { runCatching { JSONObject(raw) }.getOrNull() }
                    val media = envelope?.optJSONObject("syllabossAttachment")
                    val marker = remember(raw) { Regex("\\[(?:STUDY_BATTLE|BATTLE_RECEIPT):([a-fA-F0-9-]{36})]").find(raw) }
                    val own = account?.id == message.optString(if (group) "user_id" else "sender_id")
                    var drag by remember(message.optString("id")) { mutableFloatStateOf(0f) }
                    Row(Modifier.fillMaxWidth().offset { IntOffset(drag.roundToInt(),0) }.pointerInput(message.optString("id")) { detectHorizontalDragGestures(onDragEnd = { if(drag > 60f) replyTo = message; drag = 0f }, onDragCancel = { drag = 0f }) { change, amount -> if(amount > 0 || drag > 0) { change.consume(); drag = (drag + amount).coerceIn(0f,110f) } } }, horizontalArrangement = if (own) Arrangement.End else Arrangement.Start) {
                        Surface(shape = RoundedCornerShape(18.dp), color = if (own) Sage else MaterialTheme.colorScheme.surfaceContainer) {
                            Column(Modifier.widthIn(max = 300.dp).padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                if (!own) Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(message.optString(if (group) "user_name" else "sender_name"), color = MaterialTheme.colorScheme.primary, fontSize = 12.sp)
                                    if (message.optBoolean("sender_verified")) Icon(Icons.Outlined.Verified, "Verified administrator", Modifier.padding(start = 4.dp).size(15.dp), tint = MaterialTheme.colorScheme.primary)
                                }
                                if (marker != null) TextButton(onClick = { battle = marker.groupValues[1] }) { Icon(Icons.Outlined.Bolt, null); Text("Open study battle") }
                                else {
                                    envelope?.optJSONObject("syllabossReply")?.let { quote -> Surface(color = Sage, shape = RoundedCornerShape(10.dp)) { Column(Modifier.padding(10.dp)) { Text(quote.optString("sender"), fontSize = 12.sp, color = MaterialTheme.colorScheme.primary); Text(quote.optString("preview"), maxLines = 3, fontSize = 12.sp) } } }
                                    val caption = if (media != null || envelope?.has("syllabossReply") == true) envelope?.optString("text").orEmpty() else raw
                                    if (caption.isNotBlank()) NativeAnswer(caption)
                                }
                                TextButton(onClick = { replyTo = message }, contentPadding = PaddingValues(0.dp), modifier = Modifier.height(32.dp)) { Icon(Icons.Outlined.Reply, null, Modifier.size(15.dp)); Text("Reply", fontSize=11.sp) }
                                if (media != null) NativeAttachmentMessage(media)
                                if (own && !group) Text(
                                    when (message.optString("receipt")) { "read" -> "Read"; "delivered" -> "Delivered"; else -> "Sent" },
                                    color = MaterialTheme.colorScheme.primary, fontSize = 11.sp, modifier = Modifier.align(Alignment.End)
                                )
                                val id = message.optString("material_id").takeUnless { it == "null" }.orEmpty()
                                if (marker == null && id.isNotBlank()) TextButton(onClick = {
                                    scope.launch {
                                        try { material = Material.from(StudyApi.call("shared-material&id=" + id.asQuery()).getJSONObject("material")) }
                                        catch (e: Exception) { if (e is CancellationException) throw e; error = e.message.orEmpty() }
                                    }
                                }) { Icon(Icons.Outlined.Description, null); Text(message.optString("material_title", "Open library material"), maxLines = 2) }
                            }
                        }
                    }
                }
                item(key="conversation-end") { Spacer(Modifier.height(2.dp)) }
            }
            if (state.canScrollForward) FilledTonalIconButton(onClick = { scope.launch { state.scrollToConversationEnd() } }, modifier = Modifier.align(Alignment.BottomEnd).padding(12.dp)) { Icon(Icons.Outlined.ArrowDownward, "Latest message") }
            }
            if (error.isNotBlank()) Text(error, Modifier.padding(horizontal = 16.dp, vertical = 4.dp), color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
            replyTo?.let { quote -> Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.Reply, null, tint = MaterialTheme.colorScheme.primary); Column(Modifier.weight(1f).padding(8.dp)) { Text("Replying to ${quote.optString(if(group) "user_name" else "sender_name")}", color = MaterialTheme.colorScheme.primary, fontSize = 12.sp); Text(quote.optString("content"), maxLines = 2, fontSize = 12.sp) }; IconButton(onClick = { replyTo = null }) { Icon(Icons.Outlined.Close, "Cancel reply") } } }
            if(suggestions.isNotEmpty()) Surface(tonalElevation = 2.dp) { Column(Modifier.fillMaxWidth().heightIn(max=180.dp).verticalScroll(androidx.compose.foundation.rememberScrollState())) { suggestions.forEach { name -> TextButton(onClick = { val at=draft.lastIndexOf('@'); draft=draft.take(at)+"@$name " }, modifier = Modifier.fillMaxWidth()) { Text(if(name == "bossai") "@bossai · Ask Boss AI" else "@$name", modifier = Modifier.fillMaxWidth()) } } } }
            AnimatedVisibility(attachment != null, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Attachment, null, tint = MaterialTheme.colorScheme.primary)
                    Text(attachment?.optString("title").orEmpty(), Modifier.weight(1f).padding(horizontal = 8.dp), maxLines = 1)
                    IconButton(onClick = { attachment = null }, enabled = !busy) { Icon(Icons.Outlined.Close, "Remove attachment") }
                }
            }
            if (!group && requestState in listOf("incoming", "outgoing")) {
                Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(if (requestState == "incoming") "Accept this message request to reply." else "Waiting for the recipient to accept.", Modifier.weight(1f), color = Muted)
                    if (requestState == "incoming") Button(onClick = {
                        busy = true
                        scope.launch {
                            try { StudyApi.call(body = JSONObject().put("action", "direct-accept").put("conversationId", target)); requestState = "accepted"; refresh++ }
                            catch (e: Exception) { if (e is CancellationException) throw e; error = e.message.orEmpty() }
                            finally { busy = false }
                        }
                    }, enabled = !busy) { Text("Accept") }
                }
            } else Surface(color = Paper, tonalElevation = 0.dp) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.Bottom) {
                    IconButton(onClick = { showPicker = true }, enabled = !busy) { Icon(Icons.Outlined.AddCircleOutline, "Attach file or library material") }
                    OutlinedTextField(draft, { draft = it.take(3000) }, Modifier.weight(1f), enabled = !busy, placeholder = { Text("Message…") }, maxLines = 4, shape = RoundedCornerShape(22.dp))
                    if (draft.isBlank() && attachment == null) VoiceNoteButton(!busy, { uri, duration ->
                        busy = true
                        scope.launch {
                            try { attachment = StudyApi.media(context, uri, target = target, duration = duration); error = "" }
                            catch (e: Exception) { if (e is CancellationException) throw e; error = e.message.orEmpty() }
                            finally { busy = false }
                        }
                    }, { error = it })
                    else FilledIconButton(onClick = {
                        val body = JSONObject().put("action", if (group) "group-message" else "direct-message")
                            .put(if (group) "group" else "conversationId", target).put("content", draft.trim())
                        attachment?.let { body.put(if (it.optBoolean("library")) "materialId" else "attachmentId", it.getString("id")) }
                        replyTo?.let { body.put("replyToId", it.getString("id")) }
                        busy = true; error = ""
                        scope.launch {
                            try {
                                val sent = StudyApi.call(body = body).getJSONObject("message")
                                messages = (messages + sent).distinctBy { it.getString("id") }
                                state.scrollToConversationEnd()
                                if (!group && requestState == "new") requestState = "outgoing"
                                draft = ""; attachment = null; replyTo = null; refresh++; PeerUpdates.changed()
                            } catch (e: Exception) { if (e is CancellationException) throw e; error = e.message ?: "Message could not be sent." }
                            finally { busy = false }
                        }
                    }, enabled = !busy, modifier = Modifier.padding(start = 4.dp).size(48.dp)) { Icon(Icons.Outlined.ArrowUpward, "Send message") }
                }
            }
        }
    }
    if (showPicker) NativeSourceSheet(target, { showPicker = false }, { attachment = it }, { error = it })
    battle?.let { NativeBattleSheet(target, it, { battle = null }) }
}
