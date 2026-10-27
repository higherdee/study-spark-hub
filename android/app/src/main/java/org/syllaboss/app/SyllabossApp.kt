package org.syllaboss.app

import android.app.Application
import com.clerk.api.Clerk

class SyllabossApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Clerk.initialize(this, publishableKey = BuildConfig.CLERK_KEY)
    }
}
