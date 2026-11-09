package org.syllaboss.app

import com.clerk.api.Clerk
import com.clerk.api.session.fetchToken
import com.clerk.api.network.serialization.onSuccess
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object StudyApi {
    private val http = OkHttpClient.Builder().connectTimeout(20, TimeUnit.SECONDS).readTimeout(75, TimeUnit.SECONDS).build()
    private suspend fun token(): String { var value:String?=null;Clerk.session?.fetchToken()?.onSuccess {value=it.jwt};return value ?: throw IllegalStateException("Sign in to use chat attachments.") }
    suspend fun media(context:android.content.Context,uri:android.net.Uri,purpose:String="study",target:String?=null,duration:Int=0):JSONObject {
        val jwt=token()
        return withContext(Dispatchers.IO){
            var name="study-attachment";context.contentResolver.query(uri,arrayOf(android.provider.OpenableColumns.DISPLAY_NAME),null,null,null)?.use {if(it.moveToFirst())name=it.getString(0)}
            val bytes=context.contentResolver.openInputStream(uri)?.use{input->val out=java.io.ByteArrayOutputStream(); val buffer=ByteArray(8192); while(out.size()<=3*1024*1024){val n=input.read(buffer);if(n<0)break;out.write(buffer,0,n)};out.toByteArray()} ?: throw IllegalStateException("This file could not be opened.")
            if(bytes.isEmpty()||bytes.size>3*1024*1024)throw IllegalStateException("Choose a chat file smaller than 3 MB.")
            val body=MultipartBody.Builder().setType(MultipartBody.FORM).addFormDataPart("purpose",purpose).addFormDataPart("duration",duration.toString()).apply{target?.let{addFormDataPart("target",it)}}.addFormDataPart("file",name,bytes.toRequestBody((context.contentResolver.getType(uri)?:"application/octet-stream").toMediaType())).build()
            fetch(Request.Builder().url(BuildConfig.API_BASE_URL+"/api/study-media").header("Authorization","Bearer $jwt").post(body).build()).use{response->val data=runCatching{JSONObject(response.body.string())}.getOrElse{throw IllegalStateException("Attachment service unavailable. Please retry.")};if(!response.isSuccessful)throw IllegalStateException(data.optString("error","Attachment could not be uploaded."));data}
        }
    }
    suspend fun downloadMedia(context:android.content.Context,id:String):java.io.File {
        require(Regex("[0-9a-fA-F-]{36}").matches(id)) { "Invalid attachment." }
        require(id.matches(Regex("[a-fA-F0-9-]{36}"))) {"Invalid attachment."};val jwt=token()
        return withContext(Dispatchers.IO){fetch(Request.Builder().url(BuildConfig.API_BASE_URL+"/api/study-media?id=$id").header("Authorization","Bearer $jwt").build()).use{response->if(!response.isSuccessful)throw IllegalStateException("You cannot open this attachment. Check that you belong to this conversation.");val dir=java.io.File(context.cacheDir,"chat-media").apply{mkdirs()};val target=java.io.File(dir,id);response.body.byteStream().use{input->target.outputStream().use{input.copyTo(it)}};target}}
    }
    private fun fetch(request: Request): okhttp3.Response = try {
        http.newCall(request).execute()
    } catch (_: java.io.IOException) { throw IllegalStateException("Could not connect. Check your internet connection and try again.") }
    suspend fun call(resource: String = "library", body: JSONObject? = null): JSONObject = endpoint("/api/mobile?resource=$resource", body, body != null || !resource.startsWith("library"))
    suspend fun endpoint(path: String, body: JSONObject? = null, authenticated: Boolean = true): JSONObject {
        require(path.startsWith("/api/")) { "Invalid service address." }
        var token: String? = null
        if (authenticated) Clerk.session?.fetchToken()?.onSuccess { token = it.jwt }
        return withContext(Dispatchers.IO) {
            val request = Request.Builder().url(BuildConfig.API_BASE_URL + path)
            token?.let { request.header("Authorization", "Bearer $it") }
            if (body != null) request.post(body.toString().toRequestBody("application/json".toMediaType()))
            fetch(request.build()).use { response ->
                val result = runCatching { JSONObject(response.body.string()) }.getOrElse { throw IllegalStateException("The study service is unavailable. Please try again shortly.") }
                if (!response.isSuccessful) throw IllegalStateException(result.optString("error", "Unable to connect. Try again."))
                result
            }
        }
    }
    suspend fun pdf(accessUrl: String, target: java.io.File) = withContext(Dispatchers.IO) {
        require(accessUrl.startsWith("/api/materials?")) { "Invalid document access link." }
        fetch(Request.Builder().url(BuildConfig.API_BASE_URL + accessUrl).build()).use { response ->
            if (!response.isSuccessful) throw IllegalStateException("This document is unavailable. Please retry.")
            val content = response.body
            if (content.contentType().toString().substringBefore(';') !in listOf("application/pdf", "image/jpeg", "image/png", "image/webp")) throw IllegalStateException("This document format is not supported.")
            content.byteStream().use { input -> target.outputStream().use { input.copyTo(it) } }
        }
    }
    suspend fun saveDocument(accessUrl: String, context: android.content.Context, uri: android.net.Uri) = withContext(Dispatchers.IO) {
        require(accessUrl.startsWith("/api/materials?")) { "Invalid download address." }
        fetch(Request.Builder().url(BuildConfig.API_BASE_URL + accessUrl).build()).use { response ->
            if (!response.isSuccessful) throw IllegalStateException("Your download could not complete. Please try again.")
            val output=context.contentResolver.openOutputStream(uri) ?: throw IllegalStateException("Choose another location to save this file.")
            output.use { out -> response.body.byteStream().use { it.copyTo(out) } }
        }
    }
    suspend fun upload(context: android.content.Context, uri: android.net.Uri, fields: Map<String, String>): JSONObject {
        var token: String? = null
        Clerk.session?.fetchToken()?.onSuccess { token = it.jwt }
        if (token == null) throw IllegalStateException("Sign in to share materials.")
        return withContext(Dispatchers.IO) {
            val bytes = context.contentResolver.openInputStream(uri)?.use { input ->
                val out = java.io.ByteArrayOutputStream()
                val buffer = ByteArray(8192)
                while (true) { val n = input.read(buffer); if (n < 0) break; out.write(buffer, 0, n); if (out.size() > 20 * 1024 * 1024) throw IllegalStateException("Choose a PDF smaller than 20 MB.") }
                out.toByteArray()
            } ?: throw IllegalStateException("Could not open the selected PDF.")
            val body = MultipartBody.Builder().setType(MultipartBody.FORM)
            fields.forEach { (k, v) -> body.addFormDataPart(k, v) }
            body.addFormDataPart("file", "study-material.pdf", bytes.toRequestBody("application/pdf".toMediaType()))
            fetch(Request.Builder().url(BuildConfig.API_BASE_URL + "/api/upload").header("Authorization", "Bearer $token").post(body.build()).build()).use { response ->
                val result = runCatching { JSONObject(response.body.string()) }.getOrElse { throw IllegalStateException("Upload unavailable. Try again later.") }
                if (!response.isSuccessful) throw IllegalStateException(result.optString("error", "Upload failed. Please retry."))
                result
            }
        }
    }
}

data class Material(val id: String, val title: String, val code: String, val course: String, val school: String, val type: String, val pages: Int, val mime: String, val size: Long = 0) {
    fun json() = JSONObject().put("id", id).put("title", title).put("course_code", code).put("course", course).put("institution", school).put("material_type", type).put("page_count", pages).put("mime_type", mime).put("file_size", size)
    companion object {
        fun from(j: JSONObject) = Material(j.optString("id"), j.optString("title"), j.optString("course_code").replace("null", ""), j.optString("course"), j.optString("institution"), j.optString("material_type"), j.optInt("page_count"), j.optString("mime_type"), j.optLong("file_size"))
    }
}
