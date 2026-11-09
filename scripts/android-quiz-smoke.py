"""Tap the actual Compose MCQ option, including its embedded math TextView."""
import re
import subprocess
import time
import xml.etree.ElementTree as E

tree = E.parse("android-smoke/dark-quiz.xml")
parents = {child: parent for parent in tree.iter() for child in parent}
node = next(node for node in tree.iter("node") if node.get("text", "").startswith("A."))
while node.get("clickable") != "true":
    node = parents[node]
x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds", "")))
subprocess.run(["adb", "shell", "input", "tap", str((x1+x2)//2), str((y1+y2)//2)], check=True)
time.sleep(2)
subprocess.run(["adb", "shell", "uiautomator", "dump", "/sdcard/marked.xml"], check=True)
subprocess.run(["adb", "pull", "/sdcard/marked.xml", "android-smoke/marked-quiz.xml"], check=True)
assert any("Correct. Well done." in node.get("text", "") for node in E.parse("android-smoke/marked-quiz.xml").iter("node")), "Math-rendered answer option did not respond to a tap"
with open("android-smoke/marked-quiz.png", "wb") as output:
    subprocess.run(["adb", "exec-out", "screencap", "-p"], stdout=output, check=True)
print("Math answer option responds and reveals the score.")
