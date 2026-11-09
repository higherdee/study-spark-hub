"""Exercise native Android navigation using the emulator's accessibility tree."""
import subprocess, time, re, xml.etree.ElementTree as E
from pathlib import Path
root=Path('android-smoke')
def adb(*args):
    return subprocess.run(['adb', *args], check=True, capture_output=True)
def snapshot(name):
    adb('shell','uiautomator','dump','/sdcard/screen.xml')
    data=adb('shell','cat','/sdcard/screen.xml').stdout
    (root/(name+'.xml')).write_bytes(data)
    (root/(name+'.png')).write_bytes(adb('exec-out','screencap','-p').stdout)
    return E.fromstring(data)
def tap(text):
    tree=snapshot('current')
    for n in tree.iter('node'):
        if n.get('text')==text or n.get('content-desc')==text:
            x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
            adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(3);return
    raise AssertionError('Missing native control: '+text)
tap('Library'); time.sleep(8)
for attempt in range(15):
    library=snapshot('library')
    if any(re.search(r'[1-9]\d* materials', n.get('text',''), re.I) for n in library.iter('node')): break
    if attempt == 5 and any(n.get('text') == 'Try again' for n in library.iter('node')): tap('Try again')
    time.sleep(3)
assert any(re.search(r'[1-9]\d* materials', n.get('text',''), re.I) for n in library.iter('node')), 'Live library returned no materials'
assert not any('DOCTYPE' in n.get('text','') for n in library.iter('node'))
for node in library.iter('node'):
    texts=[child.get('text') for child in node.iter('node') if child.get('text')]
    if node.get('clickable') == 'true' and len(texts) >= 2 and any(child.get('content-desc') == 'Save material' for child in node.iter('node')):
        title=texts[1];break
else: raise AssertionError('No material row available to open')
tap(title);time.sleep(15)
reader=snapshot('reader')
# Guest browsing must never bypass the private material access grant.
assert any('Sign in to read this material' in n.get('text','') for n in reader.iter('node')), 'Guest material access did not show the account gate'
adb('shell','input','keyevent','4');time.sleep(2)
tap('Boss AI');snapshot('boss')
tap('App navigation')
tap('Your space');snapshot('space')
tap('Today')
today=snapshot('automatic-study')
assert not any(n.get('text') == 'Start a focus session' for n in today.iter('node')), 'Study time must not have a manual start button'
tap('View study time')
timer=snapshot('focus-running')
assert any('Sign in to save study time' in n.get('text','') for n in timer.iter('node')), 'Guest study time should explain account-backed progress'
assert not any(n.get('text') in {'Pause focus', 'Resume focus'} for n in timer.iter('node')), 'Study time must run automatically'
adb('shell','input','keyevent','4');time.sleep(2)
tap('Your space');tap('Sign in or create account');time.sleep(10);consent=snapshot('sign-in')
assert any('Clear terms.' in n.get('text','') for n in consent.iter('node')), 'Account creation must show terms before authentication'
print('Native library, Boss AI, account and focus navigation verified.')
