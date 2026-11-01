package org.syllaboss.app

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable internal fun NativeAccountConsent(onBack: () -> Unit, onAccept: () -> Unit) {
    val context = LocalContext.current
    var checked by rememberSaveable { mutableStateOf(false) }
    Surface(color = Paper, modifier = Modifier.fillMaxSize()) {
        Column(Modifier.safeDrawingPadding().imePadding().verticalScroll(rememberScrollState()).padding(28.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            TextButton(onClick = onBack) { Text("Back") }
            BrandWordmark()
            Spacer(Modifier.height(30.dp))
            Text("Your space.\nClear terms.", fontFamily = WebsiteDisplay, fontSize = 36.sp, lineHeight = 40.sp)
            Text("Before continuing to your account, please read how Syllaboss handles your study materials, rewards and personal information.", color = Muted)
            TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://syllaboss.org/terms"))) }) { Text("Read Terms of Service") }
            TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://syllaboss.org/privacy"))) }) { Text("Read Privacy Policy") }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = checked, onCheckedChange = { checked = it })
                Text("I agree to the Terms of Service and acknowledge the Privacy Policy.", fontSize = 14.sp)
            }
            Text("Free Boss AI conversations are retained for seven days after the transition notice. SyllaPlus keeps longer study history while membership access remains active.", color = Muted, fontSize = 13.sp)
            Button(onClick = onAccept, enabled = checked, modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp)) { Text("Continue to your account") }
        }
    }
}
