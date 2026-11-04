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
import androidx.compose.animation.*
import androidx.compose.animation.core.*
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
import androidx.lifecycle.repeatOnLifecycle
import com.clerk.api.Clerk
import com.clerk.ui.auth.AuthView
import com.clerk.api.network.serialization.onFailure
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

internal val Forest = Color(0xFF153E32)
internal val Lime = Color(0xFFE6D9BC)
internal val Paper: Color @Composable get() = MaterialTheme.colorScheme.surface
internal val Ink: Color @Composable get() = MaterialTheme.colorScheme.onSurface
internal val Muted: Color @Composable get() = MaterialTheme.colorScheme.onSurfaceVariant
internal val Sage: Color @Composable get() = MaterialTheme.colorScheme.secondaryContainer
internal val Line: Color @Composable get() = MaterialTheme.colorScheme.outline
private val appColors = lightColorScheme(primary = Forest, onPrimary = Color.White, background = Color(0xFFF6F5EF), surface = Color(0xFFF6F5EF), onSurface = Color(0xFF1E3029), onSurfaceVariant = Color(0xFF607067), secondaryContainer = Color(0xFFE5EBDD), onSecondaryContainer = Forest, outline = Color(0xFFE1E5DC), surfaceContainer = Color(0xFFEAECE5), surfaceContainerHigh = Color(0xFFE2E7DD), secondary = Forest, tertiary = Forest)
private val darkColors = darkColorScheme(
    primary = Color(0xFF9ADBBE), onPrimary = Color(0xFF0C3024),
    background = Color(0xFF111B17), surface = Color(0xFF111B17),
    onSurface = Color(0xFFE3EDE5), onSurfaceVariant = Color(0xFFB1C2B6),
    surfaceContainer = Color(0xFF1B2922), surfaceContainerHigh = Color(0xFF25372E),
    secondaryContainer = Color(0xFF254B3B), onSecondaryContainer = Color(0xFFC0E6D2),
    outline = Color(0xFF50675A), secondary = Color(0xFFADD0BB), tertiary = Lime,
)
internal class ChatState {
    val messages = mutableStateListOf<Pair<String, String>>()
    var input by mutableStateOf("")
    var sending by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    var threadId by mutableStateOf<String?>(null)
    var title by mutableStateOf("New conversation")
    var source by mutableStateOf<JSONObject?>(null)
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val preferences = getSharedPreferences("syllaboss-native", 0)
        setContent {
            var dark by remember { mutableStateOf(preferences.getBoolean("dark-appearance", false)) }
            MaterialTheme(colorScheme = if (dark) darkColors else appColors, typography = websiteTypography()) {
                Syllaboss(dark) { enabled -> dark = enabled; preferences.edit().putBoolean("dark-appearance", enabled).apply() }
            }
        }
    }
}

@Composable private fun Syllaboss(dark: Boolean, setDark: (Boolean) -> Unit) {
    AutomaticAppUpdates()
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("syllaboss-native", 0) }
    val scope = rememberCoroutineScope()
    val user by Clerk.userFlow.collectAsState()
    val lifecycle = androidx.lifecycle.compose.LocalLifecycleOwner.current.lifecycle
    var peerUnread by remember(user?.id) { mutableIntStateOf(0) }
    LaunchedEffect(user?.id, lifecycle) {
        if (user != null) lifecycle.repeatOnLifecycle(androidx.lifecycle.Lifecycle.State.STARTED) {
            while (true) {
                try { peerUnread = StudyApi.call("direct-unread").optInt("total") }
                catch (e: Exception) { if (e is kotlinx.coroutines.CancellationException) throw e }
                kotlinx.coroutines.delay(15000)
            }
        }
    }
    var settingsRevision by remember { mutableIntStateOf(0) }
    val verifiedFocus = rememberNativeFocus(user?.id, settingsRevision)
    val initialized by Clerk.isInitialized.collectAsState()
    val authComplete by Clerk.isAuthFlowCompleteFlow.collectAsState()
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var peerChatActive by remember { mutableStateOf(false) }
    val keyboardVisible = WindowInsets.ime.getBottom(androidx.compose.ui.platform.LocalDensity.current) > 0
    var auth by rememberSaveable { mutableStateOf(false) }
    var acceptedTerms by rememberSaveable { mutableStateOf(prefs.getString("accepted-terms", "") == "2026-10-31") }
    var consentError by remember { mutableStateOf<String?>(null) }
    var consentRetry by remember { mutableIntStateOf(0) }
    LaunchedEffect(user?.id, acceptedTerms, consentRetry) {
        val id = user?.id ?: return@LaunchedEffect
        if (acceptedTerms && prefs.getString("recorded-terms-$id", "") != "2026-10-31") {
            try {
                StudyApi.endpoint("/api/membership", JSONObject().put("action", "accept-terms").put("version", "2026-10-31").put("accepted", true))
                prefs.edit().putString("recorded-terms-$id", "2026-10-31").apply()
                consentError = null
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                consentError = "Your terms acceptance could not be saved. Check your connection and retry."
            }
        }
    }
    var authWaitExpired by remember { mutableStateOf(false) }
    LaunchedEffect(auth, initialized) {
        authWaitExpired = false
        if (auth && !initialized) { delay(15000); authWaitExpired = true }
    }
    var welcomed by rememberSaveable { mutableStateOf(prefs.getBoolean("welcomed", false)) }
    var focus by rememberSaveable { mutableStateOf(false) }
    var secondary by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(Unit) { val link=(context as? android.app.Activity)?.intent?.data;if(link?.scheme=="syllaboss"&&link.host=="billing") secondary="billing" }
    var reader by remember { mutableStateOf<Material?>(null) }
    SideEffect {
        val activity = context as android.app.Activity
        val controller = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
        controller.isAppearanceLightStatusBars = (welcomed || auth) && !focus && !dark
        controller.isAppearanceLightNavigationBars = !dark
    }
    var materials by remember { mutableStateOf(runCatching { val a = JSONArray(prefs.getString("library", "[]")); (0 until a.length()).map { Material.from(a.getJSONObject(it)) } }.getOrDefault(emptyList())) }
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
        try { val a = StudyApi.call().getJSONArray("materials"); materials = (0 until a.length()).map { Material.from(a.getJSONObject(it)) }; prefs.edit().putString("library", a.toString()).apply() }
        catch (e: Exception) { error = e.message ?: "Check your connection and try again." }
        finally { loading = false }
    }
    LaunchedEffect(user?.id, refresh) {
        space = null; spaceError = null
        if (user != null) try { space = StudyApi.call("space") } catch (e: Exception) { spaceError = e.message }
    }
    LaunchedEffect(authComplete) { if (authComplete) auth = false }
    BackHandler(enabled = auth || focus || reader != null || secondary.isNotBlank() || tab != 0) {
        when { reader != null -> reader = null; focus -> focus = false; auth -> auth = false; secondary.isNotBlank() -> secondary = ""; else -> tab = 0 }
    }
    if (reader != null) { DocumentScreen(reader!!, { reader = null }, { reader = null; auth = true }); return }
    if (focus) { VerifiedFocusScreen(verifiedFocus, user != null, { focus = false }); return }
    if (auth) {
        if (!acceptedTerms) {
            NativeAccountConsent(onBack = { auth = false }, onAccept = {
                prefs.edit().putString("accepted-terms", "2026-10-31").apply()
                acceptedTerms = true
            })
            return
        }
        Scaffold { padding ->
            if (initialized) AuthView(modifier = Modifier.padding(padding).imePadding(), clerkTheme = com.clerk.api.ui.ClerkTheme(colors = com.clerk.api.ui.ClerkColors(primary=Forest,background=Paper,foreground=Ink,mutedForeground=Muted,input=Color.White,inputForeground=Ink,border=Line,primaryForeground=Color.White)), logo = { BrandWordmark() }, onDismiss = { auth = false })
            else if (authWaitExpired) Column(Modifier.fillMaxSize().padding(padding).padding(28.dp), verticalArrangement = Arrangement.Center) {
                Display("Your account,\ncoming together.", size = 32)
                Spacer(Modifier.height(18.dp))
                Text("Native sign-in could not connect. It may need account configuration or a working connection. You can still explore the library and use your focus timer.", color = Muted, lineHeight = 24.sp)
                Spacer(Modifier.height(24.dp))
                Action("Back to the app", Modifier.fillMaxWidth()) { auth = false }
            }
            else Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }; return
    }
    if (consentError != null && user != null) {
        AlertDialog(onDismissRequest = {}, title = { Text("Save your account agreement") }, text = { Text(consentError!!) }, confirmButton = { TextButton(onClick = { consentRetry++ }) { Text("Retry") } }, dismissButton = { TextButton(onClick = { scope.launch { Clerk.auth.signOut() } }) { Text("Sign out") } })
    }
    if (secondary == "upload") { UploadScreen { secondary = "" }; return }
    if (secondary == "peers") { NativePeersScreen({ secondary = "" }, {}); return }
    if (secondary == "profile") { ProfileScreen(space?.optJSONObject("profile"), { secondary = "" }, { secondary = ""; refresh++ }); return }
    if (secondary == "settings") { NativeSettingsScreen { secondary = ""; settingsRevision++ }; return }
    if (secondary == "billing") { NativeBillingScreen { secondary = "" }; return }
    if (secondary == "cashout") { NativeGiftCashout(space?.optJSONObject("profile")?.optInt("points") ?: 0, { secondary = "" }, { refresh++ }); return }
    if (secondary == "pdf") { PdfWorkshop { secondary = "" }; return }
    if (!welcomed) {
        WelcomeScreen(onStart = { prefs.edit().putBoolean("welcomed", true).apply(); welcomed = true; auth = true }, onExplore = { prefs.edit().putBoolean("welcomed", true).apply(); welcomed = true })
        return
    }
    Scaffold(
        containerColor = Paper,
        bottomBar = {
            if (!(tab == 3 && peerChatActive) && !keyboardVisible) NavigationBar(containerColor = Paper, tonalElevation = 0.dp) {
                listOf(Triple("Today", Icons.Outlined.WbSunny, 0), Triple("Library", Icons.Outlined.MenuBook, 1), Triple("Boss AI", Icons.Outlined.AutoAwesome, 2), Triple("Peers", Icons.Outlined.Groups, 3), Triple("Your space", Icons.Outlined.PersonOutline, 4)).forEach { (name, icon, index) ->
                    NavigationBarItem(selected = tab == index, onClick = { tab = index }, icon = {
                        BadgedBox(badge = { if (index == 3 && peerUnread > 0) Badge { Text(if (peerUnread > 99) "99+" else peerUnread.toString()) } }) {
                            Icon(icon, name, Modifier.size(23.dp))
                        }
                    }, label = { Text(name, fontSize = 11.sp, fontWeight = FontWeight.Medium) }, colors = NavigationBarItemDefaults.colors(indicatorColor = Sage, selectedIconColor = MaterialTheme.colorScheme.onSecondaryContainer, selectedTextColor = MaterialTheme.colorScheme.primary, unselectedIconColor = Muted, unselectedTextColor = Muted))
                }
            }
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding).consumeWindowInsets(padding).pointerInput(user?.id) { awaitPointerEventScope { while (true) { awaitPointerEvent(); verifiedFocus.touch() } } }) {
            AnimatedContent(targetState = tab, label = "Study tab", transitionSpec = {
                (fadeIn(tween(220, easing=CubicBezierEasing(.23f,1f,.32f,1f))) + slideInHorizontally(tween(240)) { if(targetState > initialState) it/12 else -it/12 }).togetherWith(fadeOut(tween(140)) + slideOutHorizontally(tween(180)) { if(targetState > initialState) -it/12 else it/12 })
            }) { selectedTab -> when (selectedTab) {
                0 -> TodayScreen(materials, saved, space?.optJSONObject("profile"), loading, error, { refresh++ }, { tab = 1 }, { tab = 2 }, { focus = true }, { secondary = if (user == null) "" else "pdf"; if (user == null) auth = true }, { reader = it }, { toggleSave(it) }, { tab = 4 })
                1 -> LibraryScreen(materials, saved, loading, error, { refresh++ }, { reader = it }, { toggleSave(it) })
                2 -> ProfessionalChat(user?.id, chat, scope, { auth = true })
                3 -> if (user == null) Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) { Text("Find your study people.", fontFamily = WebsiteDisplay, fontSize = 30.sp); Spacer(Modifier.height(16.dp)); Button(onClick = { auth = true }) { Text("Sign in to Peers") } } else NativePeersScreen({ tab = 0 }, { peerChatActive = it })
                4 -> SpaceScreen(user != null, space, spaceError, saved, dark, setDark, { auth = true }, { refresh++ }, { reader = it }, { destination -> if (user == null) auth = true else secondary = destination }, {
                    scope.launch { Clerk.auth.signOut().onFailure { spaceError = "Could not sign out. Try again." } }
                })
            } }
        }
    }
}

@Composable private fun Eyebrow(text: String, color: Color = Muted) { Text(text.uppercase(), fontSize = 11.sp, letterSpacing = 1.8.sp, fontWeight = FontWeight.SemiBold, color = color) }
@Composable private fun Display(text: String, color: Color = Ink, size: Int = 36) { Text(text, fontFamily = WebsiteDisplay, fontSize = size.sp, lineHeight = (size + 3).sp, letterSpacing = (-1).sp, color = color) }
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
        BrandWordmark(onDark=true)
        Column(Modifier.padding(vertical = 48.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            Box(Modifier.size(150.dp).clip(RoundedCornerShape(40.dp)).background(Lime), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) { OfficialMark(82.dp); Text("Study with direction.", color = MaterialTheme.colorScheme.primary, fontSize = 11.sp, modifier = Modifier.padding(top = 10.dp)) }
            }
            Eyebrow("A study space for university life", Lime)
            Display("Your courses,\nin good company.", Color.White, 46)
            Text("Your course materials, a patient study partner, and a little room to focus. All in your pocket.", fontSize = 16.sp, lineHeight = 25.sp, color = Color(0xFFC2D2C6))
        }
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = onStart, modifier = Modifier.fillMaxWidth().height(58.dp), colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = Forest), shape = RoundedCornerShape(18.dp)) { Text("Start studying", fontWeight = FontWeight.SemiBold); Spacer(Modifier.weight(1f)); Icon(Icons.Outlined.ArrowForward, null) }
            TextButton(onClick = onExplore, modifier = Modifier.fillMaxWidth()) { Text("Explore the library first", color = Color.White) }
        }
    }
}

@Composable private fun TodayScreen(materials: List<Material>, saved: List<Material>, profile: JSONObject?, loading: Boolean, error: String?, retry: () -> Unit, library: () -> Unit, boss: () -> Unit, focus: () -> Unit, pdfWorkshop: () -> Unit, open: (Material) -> Unit, save: (Material) -> Unit, account: () -> Unit) {
    val firstName = profile?.optString("full_name")?.substringBefore(" ")?.takeIf { it.isNotBlank() && it != "null" }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(24.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Eyebrow(SimpleDateFormat("EEEE, d MMMM", Locale.ENGLISH).format(Date())); Spacer(Modifier.height(10.dp)); Display(if (firstName != null) "Hey, $firstName." else "Your study space.", size = 32) }
                FilledTonalIconButton(onClick = account, modifier = Modifier.size(46.dp)) { Icon(Icons.Outlined.PersonOutline, "Your account") }
            }
        }
        item {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(Forest).padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Eyebrow("Focus session", Lime); Icon(Icons.Outlined.NorthEast, null, tint = Lime, modifier = Modifier.size(20.dp)) }
                Display("Study with\ndirection.", Color.White, 37)
                Text("30 minutes at a time. Keep your momentum.", color = Color(0xFFBED0C3), fontSize = 13.sp)
                Button(onClick = focus, colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = Forest), shape = RoundedCornerShape(15.dp), modifier = Modifier.fillMaxWidth().height(50.dp)) { Text("View study time", fontWeight = FontWeight.SemiBold) }
            }
        }
        item { OutlinedButton(onClick = pdfWorkshop, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.PictureAsPdf, null); Spacer(Modifier.width(8.dp)); Text("PDF workshop") } }
        item {
            Row(Modifier.fillMaxWidth().clickable(onClick = boss).padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(52.dp).clip(RoundedCornerShape(17.dp)).background(Sage), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary) }
                Column(Modifier.weight(1f).padding(horizontal = 14.dp)) { Text("Stuck on something?", fontWeight = FontWeight.SemiBold, fontSize = 17.sp); Text("Work it out with Boss AI", color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp)) }
                Icon(Icons.Outlined.ArrowForward, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            }
        }
        item { SectionTitle(if (saved.isEmpty()) "From the library" else "Your reading shelf", "See all", library) }
        if (loading && materials.isEmpty()) item { LinearProgressIndicator(Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.primary) }
        else if (error != null && materials.isEmpty()) item { StateMessage(error, retry) }
        else if (materials.isEmpty() && saved.isEmpty()) item { Text("New course materials will appear here when available.", color = Muted) }
        items((if (saved.isNotEmpty()) saved else materials).take(4), key = { it.id }) { m -> MaterialRow(m, saved.any { it.id == m.id }, { open(m) }, { save(m) }) }
        item { Text("Progress starts with showing up.", color = Muted, fontFamily = FontFamily.Serif, fontSize = 18.sp, modifier = Modifier.padding(vertical = 8.dp)) }
    }
}

@Composable private fun MaterialRow(m: Material, saved: Boolean, open: () -> Unit, save: () -> Unit) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White).clickable(onClick = open).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(47.dp, 58.dp).clip(RoundedCornerShape(10.dp)).background(Sage), contentAlignment = Alignment.Center) { Icon(if (m.type.contains("question")) Icons.Outlined.Quiz else Icons.Outlined.Description, null, tint = MaterialTheme.colorScheme.primary) }
        Column(Modifier.weight(1f).padding(start = 14.dp)) {
            Text(m.code.ifBlank { m.type.replace('_', ' ') }.uppercase(), fontSize = 10.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
            Text(m.title, fontSize = 15.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 5.dp, bottom = 5.dp))
            Text(if (m.pages > 0) "${m.pages} pages · Verified" else "Verified material", fontSize = 11.sp, color = Muted)
        }
        IconButton(onClick = save) { Icon(if (saved) Icons.Outlined.BookmarkAdded else Icons.Outlined.BookmarkBorder, if (saved) "Remove saved material" else "Save material", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(21.dp)) }
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
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Eyebrow("${list.size} materials"); IconButton(onClick = retry) { Icon(Icons.Outlined.Refresh, "Refresh materials", tint = MaterialTheme.colorScheme.primary) } } }
        if (loading || searching) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        if (searchError != null) item { StateMessage(searchError!!) }
        if (error != null) item { StateMessage(error, retry) }
        if (!loading && error == null && list.isEmpty()) item { StateMessage(if (filter == "Saved") "Tap the bookmark on any material to build your reading shelf." else "No matching materials. Try a different course or title.") }
        items(list, key = { it.id }) { m -> MaterialRow(m, saved.any { it.id == m.id }, { open(m) }, { save(m) }) }
    }
}

@Composable private fun SpaceScreen(signedIn: Boolean, space: JSONObject?, error: String?, saved: List<Material>, dark: Boolean, setDark: (Boolean) -> Unit, signIn: () -> Unit, retry: () -> Unit, open: (Material) -> Unit, navigate: (String) -> Unit, signOut: () -> Unit) {
    val context = LocalContext.current
    val profile = space?.optJSONObject("profile")
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(24.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
        item { Eyebrow("A place for your progress"); Spacer(Modifier.height(10.dp)); Display("Your space.", size = 38) }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(60.dp).clip(RoundedCornerShape(21.dp)).background(Sage), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.PersonOutline, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(30.dp)) }
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
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(Triple("Student profile", "Your course and institution", "profile"), Triple("SyllaPlus membership", "Plans, payments and renewal", "billing"), Triple("Gift card cashout", "Redeem points for a gift card", "cashout"), Triple("Settings & promo codes", "Study preferences, rewards and your account", "settings"), Triple("Share a material", "Help the next student", "upload"), Triple("Study together", "Your course, your people", "peers")).forEach { (title, subtitle, destination) ->
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color.White).clickable { navigate(destination) }.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(when (destination) { "upload" -> Icons.Outlined.UploadFile; "profile" -> Icons.Outlined.PersonOutline; else -> Icons.Outlined.Groups }, null, tint = MaterialTheme.colorScheme.primary)
                        Column(Modifier.weight(1f).padding(horizontal = 16.dp)) { Text(title, fontWeight = FontWeight.Medium); Text(subtitle, fontSize = 12.sp, color = Muted, modifier = Modifier.padding(top = 4.dp)) }
                        Icon(Icons.Outlined.ChevronRight, null, tint = Muted)
                    }
                }
            }
        }
        item { SectionTitle("Saved for later") }
        item { ListItem(headlineContent = { Text("Dark appearance") }, trailingContent = { Switch(checked = dark, onCheckedChange = setDark) }) }
        if (saved.isEmpty()) item { Text("Your saved materials live here. Bookmark a read from the library to get started.", color = Muted, lineHeight = 22.sp, fontSize = 14.sp) }
        items(saved, key = { it.id }) { m -> Row(Modifier.fillMaxWidth().clickable { open(m) }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.BookmarkBorder, null, tint = MaterialTheme.colorScheme.primary); Text(m.title, modifier = Modifier.weight(1f).padding(horizontal = 14.dp), fontSize = 15.sp, maxLines = 2); Icon(Icons.Outlined.ChevronRight, null, tint = Muted) } }
        val ledger = space?.optJSONArray("ledger")
        if (ledger != null && ledger.length() > 0) {
            item { SectionTitle("Recent activity") }
            items(minOf(ledger.length(), 8)) { i -> val row = ledger.getJSONObject(i); Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(row.optString("reason"), Modifier.weight(1f), color = Muted, fontSize = 13.sp); Text("${if (row.optInt("amount") >= 0) "+" else ""}${row.optInt("amount")} pts", fontWeight = FontWeight.Medium, fontSize = 13.sp) } }
        }
        val ranks = space?.optJSONArray("ranks")
        if (ranks != null && ranks.length() > 0) {
            item { SectionTitle("Campus leaders") }
            items(minOf(5, ranks.length())) { i -> val rank = ranks.getJSONObject(i); Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Text("%02d".format(i + 1), color = Muted, fontSize = 13.sp); Text(rank.optString("full_name"), Modifier.weight(1f).padding(horizontal = 14.dp), fontSize = 14.sp); Text("${rank.optInt("points")} pts", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Medium, fontSize = 13.sp) } }
        }
        item { HorizontalDivider(color = Line) }
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://syllaboss.org/privacy"))) }) { Text("Privacy") }; TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://syllaboss.org/terms"))) }) { Text("Terms") }; if (signedIn) TextButton(onClick = signOut) { Text("Sign out") } } }
        item { Text("Syllaboss for Android · ${BuildConfig.VERSION_NAME}", fontSize = 11.sp, color = Muted) }
    }
}

@Composable internal fun DocumentScreen(material: Material, back: () -> Unit, signIn: () -> Unit) {
    val account by Clerk.userFlow.collectAsState()
    if(account==null) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(28.dp),verticalArrangement=Arrangement.spacedBy(20.dp)) {
            TextButton(onClick=back){Text("Back to library")}
            BrandWordmark()
            Spacer(Modifier.height(30.dp))
            Text("Sign in to read this material",fontFamily=WebsiteDisplay,fontSize=34.sp,lineHeight=38.sp)
            Text(material.title,fontSize=18.sp)
            Text("Keep your notes, downloads and study history together in your Syllaboss account.",color=Muted,lineHeight=25.sp)
            Button(onClick=signIn,modifier=Modifier.fillMaxWidth().heightIn(min=54.dp)){Text("Sign in or create account")}
        }
        return
    }
    val context = LocalContext.current
    var file by remember { mutableStateOf<File?>(null) }
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }
    var pages by remember { mutableIntStateOf(0) }
    var page by rememberSaveable(material.id) { mutableIntStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    var promotionSeconds by remember { mutableIntStateOf(0) }
    var zoom by remember(page) { mutableFloatStateOf(1f) }
    var panX by remember(page) { mutableFloatStateOf(0f) }
    var panY by remember(page) { mutableFloatStateOf(0f) }
    LaunchedEffect(material.id, retry) {
        error = null
        try {
            val gate = StudyApi.call(body = JSONObject().put("action", "start-material").put("materialId", material.id).put("intent", "preview"))
            promotionSeconds = gate.optInt("seconds")
            while (promotionSeconds > 0) { kotlinx.coroutines.delay(1000); promotionSeconds-- }
            val access = StudyApi.call(body = JSONObject().put("action", "complete-material").put("id", gate.getString("id")))
            val f = File.createTempFile("reader-", ".pdf", context.cacheDir)
            try {
                StudyApi.pdf(access.getString("url"), f)
                file?.delete()
                file = f
            } catch (e: Exception) {
                f.delete()
                throw e
            }
        } catch (e: Exception) {
            if (e is kotlinx.coroutines.CancellationException) throw e
            error = e.message ?: "Unable to open document."
        }
    }
    DisposableEffect(file) {
        val opened = file
        onDispose { opened?.delete() }
    }
    LaunchedEffect(file, page) {
        file?.let { f ->
            try {
                val rendered = withContext(Dispatchers.IO) {
                    if (material.mime.startsWith("image/")) {
                        val bounds = android.graphics.BitmapFactory.Options().apply { inJustDecodeBounds = true }
                        android.graphics.BitmapFactory.decodeFile(f.path, bounds)
                        val options = android.graphics.BitmapFactory.Options().apply { inSampleSize = maxOf(1, maxOf(bounds.outWidth, bounds.outHeight) / 1800) }
                        return@withContext 1 to (android.graphics.BitmapFactory.decodeFile(f.path, options) ?: throw IllegalStateException("Image unavailable"))
                    }
                    PdfRenderer(ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY)).use { pdf ->
                        val count = pdf.pageCount
                        pdf.openPage(page.coerceIn(0, count - 1)).use { p ->
                            val scale = 1600f / maxOf(p.width, p.height)
                            val b = Bitmap.createBitmap((p.width * scale).toInt().coerceAtLeast(1), (p.height * scale).toInt().coerceAtLeast(1), Bitmap.Config.ARGB_8888)
                            b.eraseColor(android.graphics.Color.WHITE); p.render(b, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            count to b
                        }
                    }
                }
                pages = rendered.first; bitmap = rendered.second; error = null
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                error = "This page could not be rendered. Try again or open a different page."
            }
        }
    }
    Scaffold(topBar = { TopAppBar(title = { Text(material.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 16.sp) }, navigationIcon = { IconButton(onClick = back) { Icon(Icons.Outlined.ArrowBack, "Back to library") } }, actions = { NativeMaterialActions(material) }) }, bottomBar = {
        Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { page-- }, enabled = page > 0) { Icon(Icons.Outlined.ChevronLeft, "Previous page") }; Text(if (pages > 0) "${page + 1} / $pages" else "Opening document…", fontSize = 13.sp); IconButton(onClick = { page++ }, enabled = page + 1 < pages) { Icon(Icons.Outlined.ChevronRight, "Next page") }
        }
    }) { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
            when { promotionSeconds > 0 -> Column(Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    BrandWordmark()
                    Text("Make more room for learning.", fontFamily = WebsiteDisplay, fontSize = 30.sp)
                    Text("SyllaPlus includes library study with Boss AI, more downloads and longer chat history.", color = Muted)
                    Text("Your document opens in $promotionSeconds seconds.")
                    Text("Subscribe today and get seven extra days before your first renewal.", fontSize = 13.sp, color = Muted)
                }
                error != null -> Column(Modifier.padding(24.dp)) { StateMessage(error!!) { file = null; retry++ } }
                bitmap != null -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(8.dp)) { Image(bitmap!!.asImageBitmap(), contentDescription = "${material.title}, page ${page + 1}. Pinch to zoom.", modifier = Modifier.fillMaxWidth().aspectRatio(bitmap!!.width.toFloat() / bitmap!!.height).pointerInput(page) { detectTransformGestures { _, pan, scale, _ -> zoom = (zoom * scale).coerceIn(1f, 4f); panX = if (zoom > 1f) panX + pan.x else 0f; panY = if (zoom > 1f) panY + pan.y else 0f } }.graphicsLayer(scaleX = zoom, scaleY = zoom, translationX = panX, translationY = panY)) }
                else -> CircularProgressIndicator()
            }
            if (bitmap != null) NativeReaderTools(material)
        }
    }
}
