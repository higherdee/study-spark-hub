import re, subprocess, xml.etree.ElementTree as ET

def dump(name):
    subprocess.run(['adb','shell','uiautomator','dump','/sdcard/reader-check.xml'],check=True)
    subprocess.run(['adb','pull','/sdcard/reader-check.xml','android-smoke/'+name+'.xml'],check=True)
    return ET.parse('android-smoke/'+name+'.xml')
subprocess.run(['adb','shell','am','force-stop','org.syllaboss.app'],check=True)
subprocess.run(['adb','shell','am','start','-W','-n','org.syllaboss.app/.FormatCheckActivity','--es','screen','reader','--ez','dark','true'],check=True)
subprocess.run(['adb','shell','sleep','3'],check=True)
root=dump('reader-swipe')
assert any('Swipe pages' in node.get('text','') for node in root.iter('node'))
size=subprocess.check_output(['adb','shell','wm','size'],text=True)
width,height=map(int,re.findall(r'(\d+)x(\d+)',size)[-1])
subprocess.run(['adb','shell','input','swipe',str(int(width*.85)),str(int(height*.5)),str(int(width*.15)),str(int(height*.5)),'400'],check=True)
subprocess.run(['adb','shell','sleep','2'],check=True)
root=dump('reader-swiped')
assert any('Reader page 2' in node.get('text','') for node in root.iter('node')),'Horizontal swipe did not turn the PDF page'
for node in root.iter('node'):
    if node.get('text')=='Swipe pages':
        x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
        subprocess.run(['adb','shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)],check=True)
        break
subprocess.run(['adb','shell','sleep','2'],check=True)
root=dump('reader-scroll')
assert any(node.get('text')=='Scroll pages' for node in root.iter('node'))
assert any('Reader page 2' in node.get('text','') for node in root.iter('node')),'Changing reading mode lost the current PDF page'
for _ in range(2):
    subprocess.run(['adb','shell','input','swipe',str(width//2),str(int(height*.85)),str(width//2),str(int(height*.25)),'600'],check=True)
subprocess.run(['adb','shell','sleep','2'],check=True)
root=dump('reader-scrolled')
assert any('Reader page 3' in node.get('text','') for node in root.iter('node')),'Continuous scroll did not reach the next PDF page'
with open('android-smoke/reader-scroll.png','wb') as out:subprocess.run(['adb','exec-out','screencap','-p'],stdout=out,check=True)
print('Actual PDF swipe and continuous-scroll navigation passed.')
