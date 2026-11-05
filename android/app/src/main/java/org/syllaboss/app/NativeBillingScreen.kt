@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.Locale
import java.util.UUID

@Composable internal fun NativeBillingScreen(back: () -> Unit) {
    val context=LocalContext.current;val scope=rememberCoroutineScope()
    var country by rememberSaveable { mutableStateOf("") }
    var bankTransfer by rememberSaveable { mutableStateOf(false) }
    var showRegions by remember { mutableStateOf(false) }
    var catalog by remember { mutableStateOf<JSONObject?>(null) };var summary by remember { mutableStateOf<JSONObject?>(null) }
    var selected by rememberSaveable { mutableStateOf("monthly") };var agreed by rememberSaveable { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) };var error by remember { mutableStateOf("") };var cancelConfirm by remember { mutableStateOf(false) };var refresh by remember { mutableIntStateOf(0) }
    var checkoutId by rememberSaveable { mutableStateOf(UUID.randomUUID().toString()) }
    var giftCode by rememberSaveable { mutableStateOf("") }
    var giftRequest by rememberSaveable { mutableStateOf(UUID.randomUUID().toString()) }
    var giftNotice by rememberSaveable { mutableStateOf("") }
    val lifecycle = androidx.lifecycle.compose.LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) refresh++
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }
    LaunchedEffect(country,refresh) {
        error=""
        try {
            val result = StudyApi.endpoint("/api/billing?resource=catalog" + if (country.length == 2) "&country=$country" else "", authenticated = false)
            val detected = result.optString("country").takeIf { it.length == 2 }
                ?: Locale.getDefault().country.takeIf { it.length == 2 }
            if (country.isBlank() && detected != null) {
                country = detected
                return@LaunchedEffect
            }
            catalog = result
            if (!result.optBoolean("bankTransfer")) bankTransfer = false
            summary = StudyApi.endpoint("/api/billing" + if (country.length == 2) "?country=$country" else "")
        } catch(e:Exception) {if(e is kotlinx.coroutines.CancellationException) throw e;error=e.message ?: "Billing could not be loaded."}
    }
    fun open(url:String) { val uri=Uri.parse(url);require(uri.scheme=="https"){"Secure checkout is unavailable."};context.startActivity(Intent(Intent.ACTION_VIEW,uri)) }
    val localFirst = context.getSharedPreferences("syllaboss-native", 0).getBoolean("billing-local-display", false)
    fun money(amount: Int, code: String): String {
        val currency = java.util.Currency.getInstance(code)
        val digits = currency.defaultFractionDigits.coerceAtLeast(0)
        val formatter = java.text.NumberFormat.getCurrencyInstance().apply {
            this.currency = currency
            minimumFractionDigits = digits
            maximumFractionDigits = digits
        }
        return formatter.format(java.math.BigDecimal.valueOf(amount.toLong(), digits))
    }
    val plans=catalog?.optJSONArray("plans");val plan=plans?.let { (0 until it.length()).map{n->it.getJSONObject(n)}.firstOrNull{p->p.optString("plan")==selected} }
    val subscription=summary?.optJSONObject("subscription");val hasSubscription=subscription?.optBoolean("hasAccess")==true
    Scaffold(topBar={TopAppBar(title={Text("SyllaPlus")},navigationIcon={IconButton(onClick=back){Icon(Icons.Outlined.ArrowBack,"Back")}})}) {padding->
        Column(Modifier.fillMaxSize().padding(padding).imePadding().verticalScroll(rememberScrollState()).padding(24.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) {
            BrandWordmark();Text("Keep your momentum.",fontFamily=WebsiteDisplay,fontSize=34.sp)
            Text("More AI study time, library materials alongside Boss AI, more downloads and longer conversation history.",color=MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedTextField(
                value = giftCode,
                onValueChange = { giftCode = it.take(32); giftRequest = UUID.randomUUID().toString() },
                label = { Text("SyllaPlus gift code") },
                singleLine = true,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedButton(enabled = !busy && giftCode.trim().startsWith("SYLLAGIFT-", ignoreCase = true), onClick = {
                busy = true; error = ""; giftNotice = ""
                scope.launch {
                    try {
                        val response = StudyApi.endpoint("/api/billing", JSONObject().put("action", "redeem-gift")
                            .put("code", giftCode.trim()).put("requestId", giftRequest)).getJSONObject("reward")
                        giftNotice = "${response.optInt("value")} days of SyllaPlus added."
                        giftCode = ""; giftRequest = UUID.randomUUID().toString(); refresh++
                    } catch (e: Exception) {
                        if (e is kotlinx.coroutines.CancellationException) throw e
                        error = e.message ?: "Could not redeem your gift code."
                    } finally { busy = false }
                }
            }) { Text("Redeem gift code") }
            if (giftNotice.isNotBlank()) Text(giftNotice, color = MaterialTheme.colorScheme.primary)
            if(catalog?.optString("environment")=="sandbox") Text("Payment testing mode. Test purchases do not activate a live membership.",color=MaterialTheme.colorScheme.primary,fontSize=13.sp)
            Box {
                OutlinedButton(onClick = { showRegions = true }, enabled = !busy) {
                    Text(if (country.isBlank()) "Choose billing region" else "Billing region · ${Locale("", country).displayCountry}")
                }
                DropdownMenu(expanded = showRegions, onDismissRequest = { showRegions = false }) {
                    Locale.getISOCountries().sortedBy { Locale("", it).displayCountry }.forEach { code ->
                        DropdownMenuItem(text = { Text(Locale("", code).displayCountry) }, onClick = {
                            country = code; agreed = false; checkoutId = UUID.randomUUID().toString(); showRegions = false
                        })
                    }
                }
            }
            if(plans!=null) for(i in 0 until plans.length()) {val p=plans.getJSONObject(i);OutlinedCard(onClick={selected=p.getString("plan");agreed=false;checkoutId=UUID.randomUUID().toString()},modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(18.dp),colors=CardDefaults.outlinedCardColors(containerColor=if(selected==p.optString("plan")) Sage else MaterialTheme.colorScheme.surface)) { Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(6.dp)) { Text(p.getString("plan").replaceFirstChar{it.uppercase()},fontSize=20.sp);val charge = money(p.getInt("amount"), p.getString("currency"))
                val estimate = if (p.isNull("approximateAmount") || p.isNull("approximateCurrency")) null
                    else money(p.getInt("approximateAmount"), p.getString("approximateCurrency"))
                if (localFirst && estimate != null) {
                    Text("About $estimate")
                    Text("Checkout charge: $charge", fontSize = 12.sp)
                } else {
                    Text(charge)
                    if (estimate != null) Text("About $estimate in your local currency", fontSize = 12.sp)
                }
                Text(if(selected==p.optString("plan")) "Selected" else "Choose this plan",fontSize=12.sp) } } }
            if(hasSubscription) {Text("Membership: ${subscription!!.optString("status")}");Text("Current period ends ${subscription.optString("periodEnd")}");if(!subscription.isNull("cancelAt")) Text("Renewal is canceled. Access continues until the confirmed period end.")}
            else {
                Text(if (summary?.optInt("firstRenewalBonusDays", 0) == 7) "Pay when you subscribe. Seven extra days are added before your first renewal, once per account. Subsequent renewals follow the selected schedule." else "Pay when you subscribe. Your seven-day renewal extension has already been used; renewals follow the selected schedule.",fontSize=13.sp)
                if (catalog?.optBoolean("bankTransfer") == true) Row(verticalAlignment=Alignment.CenterVertically) { Switch(bankTransfer, { bankTransfer=it; agreed=false; checkoutId=UUID.randomUUID().toString() }, enabled=!busy); Text("Pay by bank transfer") }
                if (bankTransfer) Text("NGN ${catalog?.optJSONObject("transferPrices")?.optInt(selected)?.div(100.0)} today. Renew manually after the paid period. Access starts once Bachs confirms payment.")
                Text("Any applicable taxes and the final amount are shown at checkout before payment.",fontSize=12.sp,color=Muted)
                Row(verticalAlignment=Alignment.CenterVertically) {Checkbox(agreed,{agreed=it},enabled=!busy);Text(if(bankTransfer) "I agree to the terms and the one-time bank-transfer payment. Renewal is manual." else "I agree to the terms and authorize automatic recurring card payments at the displayed price until I cancel.",fontSize=13.sp)}
                TextButton(onClick={open("https://syllaboss.org/terms")}) {Text("Read payment terms")}
                Button(onClick={busy=true;error="";scope.launch {try {val result=StudyApi.endpoint("/api/billing",JSONObject().put("action","checkout").put("id",checkoutId).put("country",country).put("method",if(bankTransfer) "bank_transfer" else "card").put("plan",selected).put("acceptedTerms",true).put("recurringConsent",true));open(result.getString("url"))}catch(e:Exception){error=e.message ?: "Checkout could not be opened."}finally{busy=false}}},enabled=!busy&&agreed&&plan?.optBoolean("ready")==true,modifier=Modifier.fillMaxWidth().height(54.dp)) {Text(if(busy) "Opening checkout…" else if(plan?.optBoolean("ready")!=true) "Checkout is being prepared" else "Subscribe to SyllaPlus")}
            }
            if(subscription!=null) OutlinedButton(onClick={busy=true;scope.launch{try{open(StudyApi.endpoint("/api/billing",JSONObject().put("action","manage")).getString("url"))}catch(e:Exception){error=e.message ?: "Billing management could not be opened."}finally{busy=false}}},enabled=!busy,modifier=Modifier.fillMaxWidth()){Text("Manage payments")}
            if(hasSubscription && subscription!!.isNull("cancelAt")) TextButton(onClick={cancelConfirm=true},enabled=!busy){Text("Cancel automatic renewal")}
            OutlinedButton(onClick={refresh++},enabled=!busy,modifier=Modifier.fillMaxWidth()){Text("Refresh membership after checkout")}
            if(error.isNotBlank()) Text(error,color=MaterialTheme.colorScheme.error)
        }
    }
    if(cancelConfirm) AlertDialog(onDismissRequest={cancelConfirm=false},title={Text("Cancel renewal?")},text={Text("Your current paid access continues until its period ends. Future automatic charges will be stopped.")},confirmButton={TextButton(onClick={cancelConfirm=false;busy=true;scope.launch {try{StudyApi.endpoint("/api/billing",JSONObject().put("action","cancel").put("confirmed",true));refresh++}catch(e:Exception){error=e.message ?: "Renewal could not be canceled."}finally{busy=false}}}){Text("Cancel renewal")}},dismissButton={TextButton(onClick={cancelConfirm=false}){Text("Keep membership")}})
}
