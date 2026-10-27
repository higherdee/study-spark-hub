package org.syllaboss.app

import com.clerk.api.Clerk
import com.clerk.api.session.fetchToken
import com.clerk.api.network.serialization.onSuccess
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object StudyApi {
    private val http = OkHttpClient.Builder().connectTimeout(20, TimeUnit.SECONDS).readTimeout(75, TimeUnit.SECONDS).build()
    suspend fun call(resource: String = "library", body: JSONObject? = null): JSONObject {
        var token: String? = null
        Clerk.session?.fetchToken()?.onSuccess { token = it.jwt }
        return withContext(Dispatchers.IO) {
            val request = Request.Builder().url("https://syllaboss.org/api/mobile?resource=$resource")
            token?.let { request.header("Authorization", "Bearer $it") }
            if (body != null) request.post(body.toString().toRequestBody("application/json".toMediaType()))
            http.newCall(request.build()).execute().use { response ->
                val result = JSONObject(response.body?.string() ?: "{}")
                if (!response.isSuccessful) throw IllegalStateException(result.optString("error", "Unable to connect. Try again."))
                result
            }
        }
    }
    suspend fun pdf(id: String, target: java.io.File) = withContext(Dispatchers.IO) {
        http.newCall(Request.Builder().url("https://syllaboss.org/api/materials?id=${java.net.URLEncoder.encode(id, "UTF-8")}").build()).execute().use { response ->
            if (!response.isSuccessful) throw IllegalStateException("This document is unavailable. Please retry.")
            val content = response.body ?: throw IllegalStateException("Empty document")
            if (!content.contentType().toString().startsWith("application/pdf")) throw IllegalStateException("This file is not a PDF. Open it with a compatible viewer.")
            content.byteStream().use { input -> target.outputStream().use { input.copyTo(it) } }
        }
    }
}

data class Material(val id: String, val title: String, val code: String, val course: String, val school: String, val type: String, val pages: Int, val mime: String) {
    fun json() = JSONObject().put("id", id).put("title", title).put("course_code", code).put("course", course).put("institution", school).put("material_type", type).put("page_count", pages).put("mime_type", mime)
    companion object {
        fun from(j: JSONObject) = Material(j.optString("id"), j.optString("title"), j.optString("course_code").replace("null", ""), j.optString("course"), j.optString("institution"), j.optString("material_type"), j.optInt("page_count"), j.optString("mime_type"))
    }
}
