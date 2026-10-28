package org.syllaboss.app

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.*

internal val WebsiteBody = FontFamily(Font(R.font.hanken_grotesk))
internal val WebsiteDisplay = FontFamily(Font(R.font.newsreader))
internal fun websiteTypography(): Typography {
    val t = Typography()
    return t.copy(bodyLarge=t.bodyLarge.copy(fontFamily=WebsiteBody),bodyMedium=t.bodyMedium.copy(fontFamily=WebsiteBody),bodySmall=t.bodySmall.copy(fontFamily=WebsiteBody),titleLarge=t.titleLarge.copy(fontFamily=WebsiteBody),titleMedium=t.titleMedium.copy(fontFamily=WebsiteBody),titleSmall=t.titleSmall.copy(fontFamily=WebsiteBody),labelLarge=t.labelLarge.copy(fontFamily=WebsiteBody),labelMedium=t.labelMedium.copy(fontFamily=WebsiteBody),labelSmall=t.labelSmall.copy(fontFamily=WebsiteBody),headlineLarge=t.headlineLarge.copy(fontFamily=WebsiteDisplay),headlineMedium=t.headlineMedium.copy(fontFamily=WebsiteDisplay))
}
@Composable internal fun OfficialMark(size: Dp = 40.dp, onDark: Boolean = false) {
    Image(painterResource(R.drawable.syllaboss_emblem), contentDescription="Syllaboss", modifier=Modifier.size(size).then(if(onDark) Modifier.clip(RoundedCornerShape(10.dp)).background(Color(0xFFF6F5EF)).padding(3.dp) else Modifier))
}
@Composable internal fun BrandWordmark(onDark: Boolean = false) {
    Row(verticalAlignment=androidx.compose.ui.Alignment.CenterVertically) { OfficialMark(32.dp,onDark); Spacer(Modifier.width(10.dp)); Text("Syllaboss",fontFamily=WebsiteDisplay,fontSize=27.sp,color=if(onDark) Color.White else Color(0xFF153E32)) }
}
