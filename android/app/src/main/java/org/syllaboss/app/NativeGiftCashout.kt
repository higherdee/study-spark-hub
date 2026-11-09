@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID

@Composable
internal fun NativeGiftCashout(points: Int, back: () -> Unit, refreshBalance: () -> Unit) {
    val scope = rememberCoroutineScope()
    val brands = remember { linkedMapOf("amazon" to "Amazon", "apple" to "Apple", "visa" to "Visa", "steam" to "Steam") }
    var brand by remember { mutableStateOf("amazon") }
    var options by remember { mutableStateOf(emptyList<JSONObject>()) }
    var membershipGifts by remember { mutableStateOf(emptyList<JSONObject>()) }
    var giftRequestId by remember { mutableStateOf(UUID.randomUUID().toString()) }
    var pendingGift by remember { mutableStateOf<JSONObject?>(null) }
    var giftResult by remember { mutableStateOf("") }
    var amount by remember { mutableIntStateOf(5) }
    var email by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var submitted by remember { mutableStateOf(false) }
    var confirm by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(retry) {
        try { val response = StudyApi.call("gift-cashout"); options = response.objects("options"); membershipGifts = response.objects("membershipGifts"); error = "" }
        catch (e: Exception) { if (e is CancellationException) throw e; error = e.message ?: "Could not load gift cards." }
    }
    val cost = options.find { it.optInt("amountUsd") == amount }?.optInt("points")
    Scaffold(topBar = { TopAppBar(title = { Text("Gift card cashout") }, navigationIcon = { TextButton(onClick = back) { Text("Back") } }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).consumeWindowInsets(padding).imePadding().verticalScroll(rememberScrollState()).padding(22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Turn points into a gift card", style = MaterialTheme.typography.headlineMedium)
            Text("Balance · ${points} SyllaPoints")
            Text("SyllaPlus gifts", style = MaterialTheme.typography.titleLarge)
            Text("Get a single-use code instantly in your Peers inbox. Redeem at checkout or give it to a friend. Codes expire after three months.")
            membershipGifts.forEach { gift ->
                val days = gift.optInt("days")
                val required = gift.optInt("points")
                OutlinedButton(enabled = !busy && points >= required, modifier = Modifier.fillMaxWidth(), onClick = {
                    pendingGift = gift
                }) { Text("${days} days · ${required} points") }
            }
            if (giftResult.isNotBlank()) Text(giftResult)
            HorizontalDivider()
            Text("An administrator reviews your request and arranges delivery to the email you provide.")
            brands.forEach { (key, label) ->
                FilterChip(selected = brand == key, enabled = !busy && !submitted, onClick = { brand = key }, label = { Text(label) })
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                options.forEach { option ->
                    val value = option.optInt("amountUsd")
                    FilterChip(selected = amount == value, enabled = !busy && !submitted, onClick = { amount = value }, label = { Text(option.optString("label")) })
                }
            }
            if (cost != null) Text("${cost} SyllaPoints required")
            OutlinedTextField(email, { email = it.take(120) }, label = { Text("Delivery email") }, singleLine = true, enabled = !busy && !submitted, modifier = Modifier.fillMaxWidth())
            if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
            if (options.isEmpty() && error.isNotBlank()) OutlinedButton(onClick = { retry++ }) { Text("Reload gift cards") }
            if (submitted) Text("Request submitted. An administrator will review it.")
            else Button(enabled = !busy && cost != null && points >= cost && email.contains("@"), onClick = { confirm = true }, modifier = Modifier.fillMaxWidth()) { Text(if (busy) "Submitting…" else "Request gift card") }
        }
    }
    if (confirm) AlertDialog(
        onDismissRequest = { confirm = false },
        title = { Text("Confirm gift card cashout") },
        text = { Text("Use ${cost} SyllaPoints for a ${brands[brand]} gift card? Delivery email: ${email.trim()}") },
        dismissButton = { TextButton(onClick = { confirm = false }) { Text("Cancel") } },
        confirmButton = { Button(onClick = {
            confirm = false; busy = true; error = ""
            scope.launch {
                try {
                    StudyApi.call(body = JSONObject().put("action", "gift-cashout").put("brand", brand).put("amount", amount).put("email", email.trim()))
                    submitted = true
                    refreshBalance()
                } catch (e: Exception) { if (e is CancellationException) throw e; error = e.message ?: "Could not request the gift card." }
                finally { busy = false }
            }
        }) { Text("Confirm request") } }
    )
    pendingGift?.let { gift ->
        AlertDialog(onDismissRequest={pendingGift=null},title={Text("Confirm SyllaPlus gift")},
            text={Text("Spend "+gift.optInt("points")+" SyllaPoints for "+gift.optInt("days")+" days of SyllaPlus? Your remaining balance will be "+(points-gift.optInt("points"))+" points. The single-use code will arrive in your Peers inbox and expires in three months.")},
            dismissButton={TextButton(onClick={pendingGift=null}){Text("Keep my points")}},
            confirmButton={Button(enabled=!busy,onClick={
                val days=gift.optInt("days");pendingGift=null
                    busy = true; error = ""
                    scope.launch {
                        try {
                            val result = StudyApi.call(body = JSONObject().put("action", "membership-gift").put("requestId", giftRequestId).put("days", days)).getJSONObject("gift")
                            giftResult = "${result.optString("code")}\nDelivered to your Peers inbox."
                            giftRequestId = UUID.randomUUID().toString()
                            refreshBalance()
                        } catch (e: Exception) { if (e is CancellationException) throw e; error = e.message ?: "Could not issue your gift." }
                        finally { busy = false }
                    }
            }){Text("Confirm · "+gift.optInt("points")+" points")}})
    }

}
