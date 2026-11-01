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
    var country by rememberSaveable { mutableStateOf(Locale.getDefault().country.takeIf { it.length==2 } ?: "") }
    var catalog by remember { mutableStateOf<JSONObject?>(null) };var summary by remember { mutableStateOf<JSONObject?>(null) }
    var selected by rememberSaveable { mutableStateOf("monthly") };var agreed by rememberSaveable { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) };var error by remember { mutableStateOf("") };var cancelConfirm by remember { mutableStateOf(false) };var refresh by remember { mutableIntStateOf(0) }
    var checkoutId by rememberSaveable { mutableStateOf(UUID.randomUUID().toString()) }
    LaunchedEffect(country,refresh) {
        if(country.length!=2) {catalog=null;return@LaunchedEffect};error=""
        try { catalog=StudyApi.endpoint("/api/billing?resource=catalog&country=$country",authenticated=false);summary=StudyApi.endpoint("/api/billing?country=$country") } catch(e:Exception) {if(e is kotlinx.coroutines.CancellationException) throw e;error=e.message ?: "Billing could not be loaded."}
    }
    fun open(url:String) { val uri=Uri.parse(url);require(uri.scheme=="https"){"Secure checkout is unavailable."};context.startActivity(Intent(Intent.ACTION_VIEW,uri)) }
    fun money(amount:Int,currency:String):String { val formatter=java.text.NumberFormat.getCurrencyInstance();formatter.currency=java.util.Currency.getInstance(currency);return formatter.format(amount/100.0) }
    val plans=catalog?.optJSONArray("plans");val plan=plans?.let { (0 until it.length()).map{n->it.getJSONObject(n)}.firstOrNull{p->p.optString("plan")==selected} }
    val subscription=summary?.optJSONObject("subscription");val hasSubscription=subscription?.optBoolean("hasAccess")==true
    Scaffold(topBar={TopAppBar(title={Text("SyllaPlus")},navigationIcon={IconButton(onClick=back){Icon(Icons.Outlined.ArrowBack,"Back")}})}) {padding->
        Column(Modifier.fillMaxSize().padding(padding).imePadding().verticalScroll(rememberScrollState()).padding(24.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) {
            BrandWordmark();Text("Keep your momentum.",fontFamily=WebsiteDisplay,fontSize=34.sp)
            Text("More AI study time, library materials alongside Boss AI, more downloads and longer conversation history.",color=MaterialTheme.colorScheme.onSurfaceVariant)
            if(catalog?.optString("environment")=="sandbox") Text("Payment testing mode. Test purchases do not activate a live membership.",color=MaterialTheme.colorScheme.primary,fontSize=13.sp)
            OutlinedTextField(country,{country=it.uppercase().filter(Char::isLetter).take(2);agreed=false;checkoutId=UUID.randomUUID().toString()},label={Text("Billing country (two-letter code)")},supportingText={Text("For example NG, GH, KE, US or GB. Choose the country of your billing address.")},singleLine=true,enabled=!busy,modifier=Modifier.fillMaxWidth())
            if(plans!=null) for(i in 0 until plans.length()) {val p=plans.getJSONObject(i);OutlinedCard(onClick={selected=p.getString("plan");agreed=false;checkoutId=UUID.randomUUID().toString()},modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(18.dp),colors=CardDefaults.outlinedCardColors(containerColor=if(selected==p.optString("plan")) Sage else MaterialTheme.colorScheme.surface)) { Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(6.dp)) { Text(p.getString("plan").replaceFirstChar{it.uppercase()},fontSize=20.sp);Text("${money(p.getInt("amount"),p.getString("currency"))} / ${p.getString("plan").removeSuffix("ly")}");if(!p.isNull("approximateAmount")) Text("Approximately ${money(p.getInt("approximateAmount"),p.getString("approximateCurrency"))} in your local currency.",fontSize=12.sp);Text(if(selected==p.optString("plan")) "Selected" else "Choose this plan",fontSize=12.sp) } } }
            if(hasSubscription) {Text("Membership: ${subscription!!.optString("status")}");Text("Current period ends ${subscription.optString("periodEnd")}");if(!subscription.isNull("cancelAt")) Text("Renewal is canceled. Access continues until the confirmed period end.")}
            else {
                Text(if (summary?.optInt("firstRenewalBonusDays", 0) == 7) "Pay when you subscribe. Seven extra days are added before your first renewal, once per account. Subsequent renewals follow the selected schedule." else "Pay when you subscribe. Your seven-day renewal extension has already been used; renewals follow the selected schedule.",fontSize=13.sp)
                Text("Any applicable taxes and the final amount are shown at checkout before payment.",fontSize=12.sp,color=Muted)
                Row(verticalAlignment=Alignment.CenterVertically) {Checkbox(agreed,{agreed=it},enabled=!busy);Text("I agree to the terms and authorize automatic recurring card payments at the displayed price until I cancel.",fontSize=13.sp)}
                TextButton(onClick={open("https://syllaboss.org/terms")}) {Text("Read payment terms")}
                Button(onClick={busy=true;error="";scope.launch {try {val result=StudyApi.endpoint("/api/billing",JSONObject().put("action","checkout").put("id",checkoutId).put("country",country).put("plan",selected).put("acceptedTerms",true).put("recurringConsent",true));open(result.getString("url"))}catch(e:Exception){error=e.message ?: "Checkout could not be opened."}finally{busy=false}}},enabled=!busy&&agreed&&plan?.optBoolean("ready")==true,modifier=Modifier.fillMaxWidth().height(54.dp)) {Text(if(busy) "Opening checkout…" else if(plan?.optBoolean("ready")!=true) "Checkout is being prepared" else "Subscribe to SyllaPlus")}
            }
            if(subscription!=null) OutlinedButton(onClick={busy=true;scope.launch{try{open(StudyApi.endpoint("/api/billing",JSONObject().put("action","manage")).getString("url"))}catch(e:Exception){error=e.message ?: "Billing management could not be opened."}finally{busy=false}}},enabled=!busy,modifier=Modifier.fillMaxWidth()){Text("Manage payments")}
            if(hasSubscription && subscription!!.isNull("cancelAt")) TextButton(onClick={cancelConfirm=true},enabled=!busy){Text("Cancel automatic renewal")}
            OutlinedButton(onClick={refresh++},enabled=!busy,modifier=Modifier.fillMaxWidth()){Text("Refresh membership after checkout")}
            if(error.isNotBlank()) Text(error,color=MaterialTheme.colorScheme.error)
        }
    }
    if(cancelConfirm) AlertDialog(onDismissRequest={cancelConfirm=false},title={Text("Cancel renewal?")},text={Text("Your current paid access continues until its period ends. Future automatic charges will be stopped.")},confirmButton={TextButton(onClick={cancelConfirm=false;busy=true;scope.launch {try{StudyApi.endpoint("/api/billing",JSONObject().put("action","cancel").put("confirmed",true));refresh++}catch(e:Exception){error=e.message ?: "Renewal could not be canceled."}finally{busy=false}}}){Text("Cancel renewal")}},dismissButton={TextButton(onClick={cancelConfirm=false}){Text("Keep membership")}})
}
