package org.syllaboss.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import kotlinx.coroutines.*
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest

private data class ReadyUpdate(val version: String,val file: File)
@Composable internal fun AutomaticAppUpdates() {
    val context=LocalContext.current
    val scope=rememberCoroutineScope()
    var ready by remember { mutableStateOf<ReadyUpdate?>(null) }
    var error by remember { mutableStateOf("") }
    var installing by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        if(BuildConfig.DEBUG) return@LaunchedEffect
        // Check on every app launch; cache downloads by the immutable version and hash.
        try {
            val update=withContext(Dispatchers.IO) {
                val client=OkHttpClient.Builder().callTimeout(3,java.util.concurrent.TimeUnit.MINUTES).build()
                val metadata=client.newCall(Request.Builder().url("https://syllaboss.org/downloads/android-release.json").header("Cache-Control","no-cache").build()).execute().use { response -> check(response.isSuccessful); JSONObject(response.body!!.string()) }
                if(metadata.optString("package")!=context.packageName || metadata.optInt("versionCode")<=BuildConfig.VERSION_CODE) return@withContext null
                val url=Uri.parse("https://syllaboss.org").buildUpon().encodedPath("/downloads/syllaboss-native.apk").appendQueryParameter("v",metadata.getString("version")).build()
                val expected=metadata.getString("sha256").lowercase();check(Regex("[a-f0-9]{64}").matches(expected))
                val directory=File(context.cacheDir,"app-updates").apply{mkdirs()}
                val file=File(directory,"syllaboss-${metadata.getInt("versionCode")}.apk")
                client.newCall(Request.Builder().url(url.toString()).build()).execute().use {response->check(response.isSuccessful);val body=response.body!!;check(body.contentLength()<=100*1024*1024);body.byteStream().use { input->file.outputStream().use { output->val buffer=ByteArray(65536);var total=0L;while(true){val n=input.read(buffer);if(n<0)break;total+=n;check(total<=100*1024*1024);output.write(buffer,0,n)}}}}
                val digest=MessageDigest.getInstance("SHA-256");file.inputStream().use { input->val buffer=ByteArray(65536);while(true){val n=input.read(buffer);if(n<0)break;digest.update(buffer,0,n)}}
                check(digest.digest().joinToString(""){"%02x".format(it)}==expected){"The update download could not be verified."}
                val flags=if(Build.VERSION.SDK_INT>=28) android.content.pm.PackageManager.GET_SIGNING_CERTIFICATES else android.content.pm.PackageManager.GET_SIGNATURES
                val installed=context.packageManager.getPackageInfo(context.packageName,flags)
                val archive=context.packageManager.getPackageArchiveInfo(file.absolutePath,flags) ?: throw IllegalStateException("Invalid update package")
                check(archive.packageName==context.packageName)
                @Suppress("DEPRECATION") val archiveVersion=if(Build.VERSION.SDK_INT>=28) archive.longVersionCode else archive.versionCode.toLong()
                check(archiveVersion==metadata.getLong("versionCode")&&archiveVersion>BuildConfig.VERSION_CODE)
                @Suppress("DEPRECATION") val current=if(Build.VERSION.SDK_INT>=28) installed.signingInfo!!.apkContentsSigners else installed.signatures
                @Suppress("DEPRECATION") val incoming=if(Build.VERSION.SDK_INT>=28) archive.signingInfo!!.apkContentsSigners else archive.signatures
                check(current!!.map{it.toCharsString()}.toSet()==incoming!!.map{it.toCharsString()}.toSet()) {"The update signing identity does not match Syllaboss."}
                ReadyUpdate(metadata.getString("version"),file)
            }
            ready=update
        } catch(e:Exception) { if(e is CancellationException)throw e /* Retry at next launch; the installed app keeps working. */ }
    }
    if(ready!=null) AlertDialog(onDismissRequest={ready=null},title={Text("Syllaboss ${ready!!.version} is ready")},text={Text(error.ifBlank{"Your update has downloaded and passed verification. Install it to get the latest app improvements. Android will ask you to confirm."})},confirmButton={TextButton(enabled=!installing,onClick={scope.launch {try{installing=true;if(Build.VERSION.SDK_INT>=26&&!context.packageManager.canRequestPackageInstalls()){context.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:${context.packageName}")))}else{val uri=FileProvider.getUriForFile(context,"${context.packageName}.updates",ready!!.file);context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));ready=null}}catch(e:Exception){error=e.message ?: "The installer could not be opened."}finally{installing=false}}}){Text("Install update")}},dismissButton={TextButton(onClick={ready=null}){Text("Later")}})
}
