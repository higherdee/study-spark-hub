package org.syllaboss.app
import android.os.Bundle
import androidx.compose.runtime.*
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.*
import org.json.JSONObject
import org.json.JSONArray
class FormatCheckActivity: ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val check=intent.getStringExtra("screen")
        val dark=intent.getBooleanExtra("dark",false)
        setContent { MaterialTheme(colorScheme=if(dark)darkColors else appColors,typography=websiteTypography()) { Surface(Modifier.fillMaxSize(),color=MaterialTheme.colorScheme.background) {
            if(check=="space") SpaceScreen(true,JSONObject().put("profile",JSONObject().put("full_name","Sample Student").put("course","Engineering").put("study_minutes",90).put("points",250).put("current_streak",3)),null,emptyList(),dark,{},{},{},{},{},{},{})
            else if(check=="onboarding") ProfileScreen(null,{},{},onboarding=true)
            else if(check=="reader") {
                var continuous by remember {mutableStateOf(false)}
                var current by remember {mutableIntStateOf(0)}
                val file=remember {
                    java.io.File(cacheDir,"reader-check.pdf").also { file ->
                        val document=android.graphics.pdf.PdfDocument()
                        for(index in 0..2) {
                            val page=document.startPage(android.graphics.pdf.PdfDocument.PageInfo.Builder(420,600,index+1).create())
                            page.canvas.drawColor(android.graphics.Color.WHITE)
                            val paint=android.graphics.Paint().apply { color=android.graphics.Color.rgb(21,62,50);textSize=30f }
                            page.canvas.drawText("Reading page "+(index+1),30f,80f,paint)
                            document.finishPage(page)
                        }
                        file.outputStream().use{document.writeTo(it)};document.close()
                    }
                }
                Column(Modifier.fillMaxSize().safeDrawingPadding()) {
                    TextButton(onClick={continuous=!continuous}) {Text(if(continuous) "Scroll pages" else "Swipe pages")}
                    Text("Reader page "+(current+1))
                    Box(Modifier.weight(1f)) {ReaderPages(file,3,current,{current=it},continuous,"Reader test")}
                }
            }
            else if(check=="quiz") Column(Modifier.fillMaxSize().safeDrawingPadding().verticalScroll(rememberScrollState()).padding(24.dp)) {
                Text("MCQ math check")
                val question=JSONObject().put("question","Choose \\(\\frac{1}{2}\\).").put("options",JSONArray(listOf("\\frac{1}{2}","\\(\\sqrt{4}\\)","0.75","1"))).put("correctOptionIndex",0).put("explanation","Correct: \\(\\frac{1}{2}=0.5\\).")
                NativeStudyMessage(JSONObject().put("nativeStudySet",JSONObject().put("mode","objective").put("topic","Mathematics").put("items",JSONArray().put(question))).toString())
            }
            else Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).safeDrawingPadding().verticalScroll(rememberScrollState()).padding(24.dp)) {
                BrandWordmark();Spacer(Modifier.height(18.dp));Text("Native formatting check",fontSize=12.sp);Spacer(Modifier.height(20.dp))
                NativeAnswer("""
## A clear answer, step by step
The **Pythagorean theorem** relates the sides of a right triangle.

1. Identify the two shorter sides.
2. Square each length and add the results.
3. Take the square root to find the hypotenuse.

\[
c = \sqrt{a^2 + b^2} = \sqrt{3^2 + 4^2} = 5
\]

| Side | Length |
| --- | --- |
| a | 3 cm |
| b | 4 cm |
| c | 5 cm |

### Try it in code
```python
from math import sqrt
c = sqrt(3**2 + 4**2)
print(c)  # 5.0
```
**Final answer: 5 cm.**
""".trimIndent(),Modifier.fillMaxWidth())
            }
        } } }
    }
}
