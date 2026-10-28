package org.syllaboss.app
import android.os.Bundle
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
class FormatCheckActivity: ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme(typography=websiteTypography()) {
            Column(Modifier.fillMaxSize().background(Color(0xFFF6F5EF)).safeDrawingPadding().verticalScroll(rememberScrollState()).padding(24.dp)) {
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
        } }
    }
}
