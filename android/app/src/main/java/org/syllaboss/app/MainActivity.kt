@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.*
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.*
import androidx.core.view.WindowCompat
import com.clerk.api.Clerk
import com.clerk.ui.auth.AuthView
import com.clerk.api.network.serialization.onFailure
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

private val Forest = Color(0xFF153E32)
private val Paper = Color(0xFFF6F5EF)
private val Ink = Color(0xFF1E3029)
private val Muted = Color(0xFF6E7C73)
private val Sage = Color(0xFFE5EBDD)
private val Lime = Color(0xFFDDECA4)
private val Line = Color(0xFFE1E5DC)
private val appColors = lightColorScheme(primary = Forest, onPrimary = Color.White, background = Paper, surface = Paper, onSurface = Ink, secondaryContainer = Sage, onSecondaryContainer = Forest, outline = Line)
private class ChatState {
    val messages = mutableStateListOf<Pair<String, String>>()
    var input by mutableStateOf("")
    var sending by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { MaterialTheme(colorScheme = appColors) { Syllaboss() } }
    }
}

@Composable private fun Syllaboss() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("syllaboss-native", 0) }
    val scope = rememberCoroutineScope()
    val user by Clerk.userFlow.collectAsState()
    val initialized by Clerk.isInitialized.collectAsState()
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var auth by rememberSaveable { mutableStateOf(false) }
    var welcomed by rememberSaveable { mutableStateOf(prefs.getBoolean("welcomed", false)) }
    var focus by rememberSaveable { mutableStateOf(false) }
    var reader by remember { mutableStateOf<Material?>(null) }
    SideEffect {
        val activity = context as android.app.Activity
        WindowCompat.getInsetsController(activity.window, activity.window.decorView).isAppearanceLightStatusBars = (welcomed || auth) && !focus
    }
    var materials by remember { mutableStateOf<List<Material>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var saved by remember { mutableStateOf(runCatching { val a = JSONArray(prefs.getString("saved", "[]")); (0 until a.length()).map { Material.from(a.getJSONObject(it)) } }.getOrDefault(emptyList())) }
    var space by remember { mutableStateOf<JSONObject?>(null) }
    var spaceError by remember { mutableStateOf<String?>(null) }
    var refresh by remember { mutableIntStateOf(0) }
    val chat = remember(user?.id) { ChatState() }
    fun toggleSave(m: Material) {
        saved = if (saved.any { it.id == m.id }) saved.filterNot { it.id == m.id } else saved + m
        prefs.edit().putString("saved", JSONArray(saved.map { it.json() }).toString()).apply()
    }
    LaunchedEffect(refresh) {
        loading = true; error = null
        try { val a = StudyApi.call().getJSONArray("materials"); materials = (0 until a.length()).map { Material.from(a.getJSONObject(it)) } }
        catch (e: Exception) { error = e.message ?: "Check your connection and try again." }
        finally { loading = false }
    }
    LaunchedEffect(user?.id, refresh) {
        space = null; spaceError = null
        if (user != null) try { space = StudyApi.call("space") } catch (e: Exception) { spaceError = e.message }
    }
    LaunchedEffect(user?.id) { if (user != null) auth = false }
    BackHandler(enabled = auth || focus || reader != null || tab != 0) {
        when { reader != null -> reader = null; focus -> focus = false; auth -> auth = false; else -> tab = 0 }
    }
    if (reader != null) { DocumentScreen(reader!!, { reader = null }); return }
    if (focus) { FocusScreen(prefs, { focus = false }); return }
    if (auth) {
        Scaffold(topBar = { TopAppBar(title = { Text("Your Syllaboss account") }, navigationIcon = { IconButton(onClick = { auth = false }) { Icon(Icons.Outlined.ArrowBack, "Back") } }) }) { padding ->
            if (initialized) AuthView(modifier = Modifier.padding(padding).imePadding())
            else Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }; return
    }
    if (!welcomed) {
        WelcomeScreen(onStart = { prefs.edit().putBoolean("welcomed", true).apply(); welcomed = true; auth = true }, onExplore = { prefs.edit().putBoolean("welcomed", true).apply(); welcomed = true })
        return
    }
    Scaffold(
        containerColor = Paper,
        bottomBar = {
            NavigationBar(containerColor = Paper, tonalElevation = 0.dp) {
                listOf(Triple("Today", Icons.Outlined.WbSunny, 0), Triple("Library", Icons.Outlined.MenuBook, 1), Triple("Boss AI", Icons.Outlined.AutoAwesome, 2), Triple("Your space", Icons.Outlined.PersonOutline, 3)).forEach { (name, icon, index) ->
                    NavigationBarItem(selected = tab == index, onClick = { tab = index }, icon = { Icon(icon, name, Modifier.size(23.dp)) }, label = { Text(name, fontSize = 11.sp, fontWeight = FontWeight.Medium) }, colors = NavigationBarItemDefaults.colors(indicatorColor = Sage, selectedIconColor = Forest, selectedTextColor = Forest, unselectedIconColor = Muted, unselectedTextColor = Muted))
                }
            }
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (tab) {
                0 -> TodayScreen(materials, saved, space?.optJSONObject("profile"), loading, error, { refresh++ }, { tab = 1 }, { tab = 2 }, { focus = true }, { reader = it }, { toggleSave(it) }, { tab = 3 })
                1 -> LibraryScreen(materials, saved, loading, error, { refresh++ }, { reader = it }, { toggleSave(it) })
                2 -> BossScreen(user != null, chat, scope, { auth = true })
                3 -> SpaceScreen(user != null, space, spaceError, saved, { auth = true }, { refresh++ }, { reader = it }, {
                    scope.launch { Clerk.auth.signOut().onFailure { spaceError = "Could not sign out. Try again." } }
                })
            }
        }
    }
}

@Composable private fun Eyebrow(text: String, color: Color = Muted) { Text(text.uppercase(), fontSize = 11.sp, letterSpacing = 1.8.sp, fontWeight = FontWeight.SemiBold, color = color) }
@Composable private fun Display(text: String, color: Color = Ink, size: Int = 36) { Text(text, fontFamily = FontFamily.Serif, fontSize = size.sp, lineHeight = (size + 3).sp, letterSpacing = (-1).sp, color = color) }
@Composable private fun Action(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) { Button(onClick = onClick, modifier = modifier.heightIn(min = 54.dp), shape = RoundedCornerShape(18.dp), contentPadding = PaddingValues(horizontal = 24.dp)) { Text(text, fontWeight = FontWeight.SemiBold); Spacer(Modifier.width(12.dp)); Icon(Icons.Outlined.ArrowForward, null, Modifier.size(18.dp)) } }
@Composable private fun SectionTitle(title: String, action: String? = null, onAction: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
        Text(title, fontSize = 20.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.5).sp)
        if (action != null) TextButton(onClick = onAction) { Text(action, fontSize = 12.sp) }
    }
}
@Composable private fun StateMessage(text: String, retry: (() -> Unit)? = null) {
    Column(Modifier.fillMaxWidth().padding(vertical = 28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(Icons.Outlined.CloudOff, null, tint = Muted, modifier = Modifier.size(30.dp)); Text(text, color = Muted, fontSize = 14.sp)
        retry?.let { OutlinedButton(onClick = it) { Text("Try again") } }
    }
}

@Composable private fun WelcomeScreen(onStart: () -> Unit, onExplore: () -> Unit) {
    Column(Modifier.fillMaxSize().background(Forest).safeDrawingPadding().padding(28.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.SpaceBetween) {
        Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.MenuBook, null, tint = Lime, modifier = Modifier.size(30.dp)); Spacer(Modifier.width(10.dp)); Text("Syllaboss", color = Color.White, fontFamily = FontFamily.Serif, fontSize = 27.sp) }
        Column(Modifier.padding(vertical = 48.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            Box(Modifier.size(150.dp).clip(RoundedCornerShape(40.dp)).background(Lime), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) { Icon(Icons.Outlined.AutoStories, null, tint = Forest, modifier = Modifier.size(62.dp)); Text("A little, every day.", color = Forest, fontSize = 11.sp, modifier = Modifier.padding(top = 10.dp)) }
            }
            Eyebrow("Made for your next chapter", Lime)
            Display("Less scattered.\nMore studied.", Color.White, 46)
            Text("Your course materials, a patient study partner, and a little room to focus. All in your pocket.", fontSize = 16.sp, lineHeight = 25.sp, color = Color(0xFFC2D2C6))
        }
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = onStart, modifier = Modifier.fillMaxWidth().height(58.dp), colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = Forest), shape = RoundedCornerShape(18.dp)) { Text("Make yourself at home", fontWeight = FontWeight.SemiBold); Spacer(Modifier.weight(1f)); Icon(Icons.Outlined.ArrowForward, null) }
            TextButton(onClick = onExplore, modifier = Modifier.fillMaxWidth()) { Text("Explore the library first", color = Color.White) }
        }
    }
}

@Composable private fun TodayScreen(materials: List<Material>, saved: List<Material>, profile: JSONObject?, loading: Boolean, error: String?, retry: () -> Unit, library: () -> Unit, boss: () -> Unit, focus: () -> Unit, open: (Material) -> Unit, save: (Material) -> Unit, account: () -> Unit) {
    val firstName = profile?.optString("full_name")?.substringBefore(" ")?.takeIf { it.isNotBlank() && it != "null" }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(24.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Eyebrow(SimpleDateFormat("EEEE, d MMMM", Locale.ENGLISH).format(Date())); Spacer(Modifier.height(10.dp)); Display(if (firstName != null) "Hey, $firstName." else "A good day to learn.", size = 32) }
                FilledTonalIconButton(onClick = account, modifier = Modifier.size(46.dp)) { Icon(Icons.Outlined.PersonOutline, "Your account") }
            }
        }
        item {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(Forest).padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Eyebrow("One thing at a time", Lime); Icon(Icons.Outlined.NorthEast, null, tint = Lime, modifier = Modifier.size(20.dp)) }
                Display("Make room\nfor focus.", Color.White, 37)
                Text("25 quiet minutes. One small step forward.", color = Color(0xFFBED0C3), fontSize = 13.sp)
                Button(onClick = focus, colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = Forest), shape = RoundedCornerShape(15.dp), modifier = Modifier.fillMaxWidth().height(50.dp)) { Icon(Icons.Outlined.PlayArrow, null); Spacer(Modifier.width(8.dp)); Text("Start a focus session", fontWeight = FontWeight.SemiBold) }
            }
        }
        item {
            Row(Modifier.fillMaxWidth().clickable(onClick = boss).padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(52.dp).clip(RoundedCornerShape(17.dp)).background(Sage), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.AutoAwesome, null, tint = Forest) }
                Column(Modifier.weight(1f).padding(horizontal = 14.dp)) { Text("Stuck on something?", fontWeight = FontWeight.SemiBold, fontSize = 17.sp); Text("Work it out with Boss AI", color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp)) }
                Icon(Icons.Outlined.ArrowForward, null, tint = Forest, modifier = Modifier.size(20.dp))
            }
        }
        item { SectionTitle(if (saved.isEmpty()) "From the library" else "Your reading shelf", "See all", library) }
        if (loading && materials.isEmpty()) item { LinearProgressIndicator(Modifier.fillMaxWidth(), color = Forest) }
        else if (error != null && materials.isEmpty()) item { StateMessage(error, retry) }
        else if (materials.isEmpty() && saved.isEmpty()) item { Text("New course materials will appear here when available.", color = Muted) }
        items((if (saved.isNotEmpty()) saved else materials).take(4), key = { it.id }) { m -> MaterialRow(m, saved.any { it.id == m.id }, { open(m) }, { save(m) }) }
        item { Text("Progress starts with showing up.", color = Muted, fontFamily = FontFamily.Serif, fontSize = 18.sp, modifier = Modifier.padding(vertical = 8.dp)) }
    }
}

@Composable private fun MaterialRow(m: Material, saved: Boolean, open: () -> Unit, save: () -> Unit) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).clickable(onClick = open).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(47.dp, 58.dp).clip(RoundedCornerShape(10.dp)).background(Sage), contentAlignment = Alignment.Center) { Icon(if (m.type.contains("question")) Icons.Outlined.Quiz else Icons.Outlined.Description, null, tint = Forest) }
        Column(Modifier.weight(1f).padding(start = 14.dp)) {
            Text(m.code.ifBlank { m.type.replace('_', ' ') }.uppercase(), fontSize = 10.sp, color = Forest, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
            Text(m.title, fontSize = 15.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 5.dp, bottom = 5.dp))
            Text(if (m.pages > 0) "${m.pages} pages · Verified" else "Verified material", fontSize = 11.sp, color = Muted)
        }
        IconButton(onClick = save) { Icon(if (saved) Icons.Outlined.BookmarkAdded else Icons.Outlined.BookmarkBorder, if (saved) "Remove saved material" else "Save material", tint = Forest, modifier = Modifier.size(21.dp)) }
    }
}

@Composable private fun LibraryScreen(materials: List<Material>, saved: List<Material>, loading: Boolean, error: String?, retry: () -> Unit, open: (Material) -> Unit, save: (Material) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf("All materials") }
    var searchResults by remember { mutableStateOf(materials) }
    var searching by remember { mutableStateOf(false) }
    var searchError by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(query, materials) {
        searchError = null
        if (query.isBlank()) { searchResults = materials; return@LaunchedEffect }
        delay(350)
        searching = true
        try {
            val a = StudyApi.call("library&q=" + java.net.URLEncoder.encode(query, "UTF-8")).getJSONArray("materials")
            searchResults = (0 until a.length()).map { Material.from(a.getJSONObject(it)) }
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) { searchError = e.message }
        finally { searching = false }
    }
    val list = (if (filter == "Saved") saved else searchResults).filter { m ->
        (filter != "Past questions" || m.type.contains("question", true)) && (filter != "Notes" || !m.type.contains("question", true)) && listOf(m.title, m.code, m.course, m.school).any { it.contains(query, true) }
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Eyebrow("Find your next read"); Spacer(Modifier.height(10.dp)); Display("The library.", size = 38); Spacer(Modifier.height(8.dp)); Text("Good material. Less searching.", color = Muted, fontSize = 14.sp) }
        item { OutlinedTextField(query, { query = it }, modifier = Modifier.fillMaxWidth(), placeholder = { Text("Course, title, or school") }, leadingIcon = { Icon(Icons.Outlined.Search, null) }, singleLine = true, shape = RoundedCornerShape(18.dp)) }
        item { Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) { listOf("All materials", "Past questions", "Notes", "Saved").forEach { label -> FilterChip(selected = filter == label, onClick = { filter = label }, label = { Text(label) }, shape = RoundedCornerShape(12.dp)) } } }
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Eyebrow("${list.size} materials"); IconButton(onClick = retry) { Icon(Icons.Outlined.Refresh, "Refresh materials", tint = Forest) } } }
        if (loading || searching) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        if (searchError != null) item { StateMessage(searchError!!) }
        if (error != null) item { StateMessage(error, retry) }
        if (!loading && error == null && list.isEmpty()) item { StateMessage(if (filter == "Saved") "Tap the bookmark on any material to build your reading shelf." else "No matching materials. Try a different course or title.") }
        items(list, key = { it.id }) { m -> MaterialRow(m, saved.any { it.id == m.id }, { open(m) }, { save(m) }) }
    }
}

@Composable private fun BossScreen(signedIn: Boolean, chat: ChatState, scope: CoroutineScope, signIn: () -> Unit) {
    val messages = chat.messages
    var input by chat::input
    var sending by chat::sending
    var error by chat::error
    val scroll = androidx.compose.foundation.lazy.rememberLazyListState()
    fun send(question: String) {
        if (sending || question.isBlank()) return
        if (!signedIn) { signIn(); return }
        val history = JSONArray(messages.takeLast(12).map { JSONObject().put("role", it.first).put("content", it.second) })
        messages.add("user" to question); input = ""; error = null; sending = true
        scope.launch {
            try { val result = StudyApi.call(body = JSONObject().put("message", question).put("history", history)); messages.add("assistant" to result.getString("answer")) }
            catch (e: Exception) { error = e.message ?: "Could not connect to Boss. Try again." }
            finally { sending = false }
        }
    }
    LaunchedEffect(messages.size, sending) { if (messages.isNotEmpty()) scroll.animateScrollToItem(messages.size - 1) }
    Column(Modifier.fillMaxSize().imePadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 20.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column { Eyebrow("Your study partner"); Spacer(Modifier.height(7.dp)); Display("Boss AI", size = 32) }
            IconButton(onClick = { if (!sending) { messages.clear(); error = null } }, enabled = !sending) { Icon(Icons.Outlined.EditNote, "New conversation", tint = Forest) }
        }
        if (messages.isEmpty()) {
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
                Box(Modifier.size(64.dp).clip(RoundedCornerShape(22.dp)).background(Sage), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.AutoAwesome, null, tint = Forest, modifier = Modifier.size(30.dp)) }
                Display("Let's make\nit make sense.", size = 39)
                Text("A tricky concept, an exam topic, or a question you keep coming back to. Start anywhere.", color = Muted, lineHeight = 23.sp)
                listOf("Explain a concept" to "Help me understand a topic. Ask which concept I am studying.", "Quiz me for an exam" to "Help me practise for an exam. Ask my course and topic, then give me one question at a time.", "Build a revision plan" to "Help me make a realistic revision plan. Ask about my exam dates and courses.").forEach { (label, prompt) ->
                    OutlinedCard(onClick = { send(prompt) }, colors = CardDefaults.outlinedCardColors(containerColor = Color.Transparent), border = BorderStroke(1.dp, Line), shape = RoundedCornerShape(17.dp)) {
                        Row(Modifier.fillMaxWidth().padding(18.dp), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, fontSize = 14.sp); Icon(Icons.Outlined.NorthEast, null, Modifier.size(18.dp), tint = Forest) }
                    }
                }
            }
        } else {
            LazyColumn(state = scroll, modifier = Modifier.weight(1f), contentPadding = PaddingValues(24.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                items(messages.size) { index ->
                    val (role, text) = messages[index]
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = if (role == "user") Alignment.End else Alignment.Start) {
                        if (role != "user") Eyebrow("Boss", Forest)
                        SelectionContainerText(text, if (role == "user") Sage else Color.Transparent)
                    }
                }
                if (sending) item { Row(verticalAlignment = Alignment.CenterVertically) { CircularProgressIndicator(Modifier.size(15.dp), strokeWidth = 2.dp); Spacer(Modifier.width(12.dp)); Text("Thinking it through…", color = Muted, fontSize = 13.sp) } }
            }
        }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)) }
        if (!signedIn) TextButton(onClick = signIn, modifier = Modifier.fillMaxWidth()) { Text("Sign in to chat with Boss") }
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(input, { if (it.length <= 6000) input = it }, placeholder = { Text("What are we studying?") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(24.dp), maxLines = 5, enabled = !sending)
            FilledIconButton(onClick = { send(input.trim()) }, enabled = input.isNotBlank() && !sending, modifier = Modifier.padding(bottom = 4.dp).size(48.dp)) { Icon(Icons.Outlined.ArrowUpward, "Send question") }
        }
        Text("AI can make mistakes. Check important answers.", color = Muted, fontSize = 10.sp, modifier = Modifier.align(Alignment.CenterHorizontally).padding(bottom = 8.dp))
    }
}
@Composable private fun SelectionContainerText(text: String, background: Color) {
    androidx.compose.foundation.text.selection.SelectionContainer {
        Text(text, modifier = Modifier.padding(top = 7.dp).clip(RoundedCornerShape(20.dp)).background(background).padding(if (background == Color.Transparent) 0.dp else 16.dp), fontSize = 16.sp, lineHeight = 25.sp, color = Ink)
    }
}

@Composable private fun SpaceScreen(signedIn: Boolean, space: JSONObject?, error: String?, saved: List<Material>, signIn: () -> Unit, retry: () -> Unit, open: (Material) -> Unit, signOut: () -> Unit) {
    val context = LocalContext.current
    val profile = space?.optJSONObject("profile")
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(24.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
        item { Eyebrow("A place for your progress"); Spacer(Modifier.height(10.dp)); Display("Your space.", size = 38) }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(60.dp).clip(RoundedCornerShape(21.dp)).background(Sage), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.PersonOutline, null, tint = Forest, modifier = Modifier.size(30.dp)) }
                Column(Modifier.padding(start = 16.dp)) { Text(profile?.optString("full_name")?.takeUnless { it == "null" || it.isBlank() } ?: if (signedIn) "Syllaboss student" else "Make it yours", fontSize = 20.sp, fontWeight = FontWeight.SemiBold); Text(profile?.optString("course")?.takeUnless { it == "null" || it.isBlank() } ?: "Your learning, all together.", color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 5.dp)) }
            }
        }
        if (!signedIn) item { Action("Sign in or create account", Modifier.fillMaxWidth(), signIn) }
        if (signedIn && space == null && error == null) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        if (error != null) item { StateMessage(error, retry) }
        if (profile != null) {
            item {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(Sage).padding(22.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column { Eyebrow("Study minutes"); Spacer(Modifier.height(10.dp)); Display(profile.optInt("study_minutes").toString(), size = 32) }
                    Column { Eyebrow("Points"); Spacer(Modifier.height(10.dp)); Display(profile.optInt("points").toString(), size = 32) }
                    Column { Eyebrow("Day streak"); Spacer(Modifier.height(10.dp)); Display(profile.optInt("current_streak").toString(), size = 32) }
                }
            }
        }
        item { SectionTitle("Saved for later") }
        if (saved.isEmpty()) item { Text("Your saved materials live here. Bookmark a read from the library to get started.", color = Muted, lineHeight = 22.sp, fontSize = 14.sp) }
        items(saved, key = { it.id }) { m -> Row(Modifier.fillMaxWidth().clickable { open(m) }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.BookmarkBorder, null, tint = Forest); Text(m.title, modifier = Modifier.weight(1f).padding(horizontal = 14.dp), fontSize = 15.sp, maxLines = 2); Icon(Icons.Outlined.ChevronRight, null, tint = Muted) } }
        val ledger = space?.optJSONArray("ledger")
        if (ledger != null && ledger.length() > 0) {
            item { SectionTitle("Recent activity") }
            items(minOf(ledger.length(), 8)) { i -> val row = ledger.getJSONObject(i); Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(row.optString("reason"), Modifier.weight(1f), color = Muted, fontSize = 13.sp); Text("${if (row.optInt("amount") >= 0) "+" else ""}${row.optInt("amount")} pts", fontWeight = FontWeight.Medium, fontSize = 13.sp) } }
        }
        item { HorizontalDivider(color = Line) }
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://syllaboss.org/privacy"))) }) { Text("Privacy") }; TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://syllaboss.org/terms"))) }) { Text("Terms") }; if (signedIn) TextButton(onClick = signOut) { Text("Sign out") } } }
        item { Text("Syllaboss for Android · ${BuildConfig.VERSION_NAME}", fontSize = 11.sp, color = Muted) }
    }
}

@Composable private fun FocusScreen(prefs: android.content.SharedPreferences, back: () -> Unit) {
    var remaining by rememberSaveable { mutableLongStateOf(prefs.getLong("focus_remaining", 25 * 60L)) }
    var end by rememberSaveable { mutableLongStateOf(prefs.getLong("focus_end", 0L)) }
    var running by rememberSaveable { mutableStateOf(end > 0L) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val seconds = if (running) ((end - now) / 1000L).coerceAtLeast(0) else remaining
    fun persist() { prefs.edit().putLong("focus_remaining", remaining).putLong("focus_end", if (running) end else 0L).apply() }
    LaunchedEffect(running) { while (running) { now = System.currentTimeMillis(); if (now >= end) { running = false; remaining = 0; persist() }; delay(250) } }
    Column(Modifier.fillMaxSize().background(Forest).safeDrawingPadding().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { IconButton(onClick = back) { Icon(Icons.Outlined.ArrowBack, "Back", tint = Color.White) }; Spacer(Modifier.weight(1f)); Eyebrow("Your focus space", Lime); Spacer(Modifier.weight(1f)); Spacer(Modifier.width(48.dp)) }
        Spacer(Modifier.weight(1f)); Display(if (seconds == 0L) "A little further." else "Just this moment.", Color.White, 32); Spacer(Modifier.height(14.dp)); Text(if (seconds == 0L) "Session complete. Take a breath." else "One task. A little less noise.", color = Color(0xFFB7CDBE), fontSize = 14.sp)
        Box(Modifier.padding(vertical = 48.dp).size(265.dp), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(progress = { seconds / 1500f }, modifier = Modifier.fillMaxSize(), color = Lime, trackColor = Color(0xFF365849), strokeWidth = 5.dp)
            Text("%02d:%02d".format(seconds / 60, seconds % 60), fontSize = 65.sp, fontFamily = FontFamily.Serif, color = Color.White, letterSpacing = (-2).sp)
        }
        Button(onClick = { if (seconds == 0L) { remaining = 1500; running = false } else if (running) { remaining = seconds; running = false } else { now = System.currentTimeMillis(); end = now + remaining * 1000; running = true }; persist() }, modifier = Modifier.fillMaxWidth().height(58.dp), shape = RoundedCornerShape(18.dp), colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = Forest)) { Icon(if (running) Icons.Outlined.Pause else Icons.Outlined.PlayArrow, null); Spacer(Modifier.width(10.dp)); Text(if (seconds == 0L) "Start another session" else if (running) "Pause session" else "Start focusing", fontWeight = FontWeight.SemiBold) }
        TextButton(onClick = { remaining = 1500; end = 0; running = false; persist() }) { Text("Reset timer", color = Color(0xFFB7CDBE)) }
        Spacer(Modifier.weight(1f)); Text("Focus time is kept on this device.\nReward points remain managed by your account.", color = Color(0xFFB7CDBE), fontSize = 11.sp, lineHeight = 17.sp)
    }
}

@Composable private fun DocumentScreen(material: Material, back: () -> Unit) {
    val context = LocalContext.current
    var file by remember { mutableStateOf<File?>(null) }
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }
    var pages by remember { mutableIntStateOf(0) }
    var page by rememberSaveable { mutableIntStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    var zoom by remember(page) { mutableFloatStateOf(1f) }
    var panX by remember(page) { mutableFloatStateOf(0f) }
    var panY by remember(page) { mutableFloatStateOf(0f) }
    LaunchedEffect(material.id, retry) {
        error = null
        try {
            val f = File(context.cacheDir, "read-${material.id.replace(Regex("[^A-Za-z0-9-]"), "")}.pdf")
            if (!f.exists()) StudyApi.pdf(material.id, f)
            file = f
        } catch (e: Exception) { error = e.message ?: "Unable to open document." }
    }
    LaunchedEffect(file, page) {
        file?.let { f ->
            try {
                val rendered = withContext(Dispatchers.IO) {
                    PdfRenderer(ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY)).use { pdf ->
                        val count = pdf.pageCount
                        pdf.openPage(page.coerceIn(0, count - 1)).use { p ->
                            val b = Bitmap.createBitmap(1200, (1200f * p.height / p.width).toInt(), Bitmap.Config.ARGB_8888)
                            b.eraseColor(android.graphics.Color.WHITE); p.render(b, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            count to b
                        }
                    }
                }
                pages = rendered.first; bitmap = rendered.second
            } catch (e: Exception) { error = "This PDF could not be rendered. Try downloading it again."; f.delete() }
        }
    }
    Scaffold(topBar = { TopAppBar(title = { Text(material.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 16.sp) }, navigationIcon = { IconButton(onClick = back) { Icon(Icons.Outlined.ArrowBack, "Back to library") } }) }, bottomBar = {
        Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { page-- }, enabled = page > 0) { Icon(Icons.Outlined.ChevronLeft, "Previous page") }; Text(if (pages > 0) "${page + 1} / $pages" else "Opening document…", fontSize = 13.sp); IconButton(onClick = { page++ }, enabled = page + 1 < pages) { Icon(Icons.Outlined.ChevronRight, "Next page") }
        }
    }) { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
            when { error != null -> Column(Modifier.padding(24.dp)) { StateMessage(error!!) { file = null; retry++ } }
                bitmap != null -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(8.dp)) { Image(bitmap!!.asImageBitmap(), contentDescription = "${material.title}, page ${page + 1}. Pinch to zoom.", modifier = Modifier.fillMaxWidth().aspectRatio(bitmap!!.width.toFloat() / bitmap!!.height).pointerInput(page) { detectTransformGestures { _, pan, scale, _ -> zoom = (zoom * scale).coerceIn(1f, 4f); panX = if (zoom > 1f) panX + pan.x else 0f; panY = if (zoom > 1f) panY + pan.y else 0f } }.graphicsLayer(scaleX = zoom, scaleY = zoom, translationX = panX, translationY = panY)) }
                else -> CircularProgressIndicator()
            }
        }
    }
}
