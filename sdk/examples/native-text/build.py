"""MIT. Standalone sample builder: Python 3.11+, JDK17+, Gradle8.11.1/SDK35 for Android."""
from pathlib import Path
import os,sys,subprocess,urllib.request,hashlib,shutil,zipfile
root=Path(__file__).resolve().parent;jdk=Path(os.environ['JAVA_HOME']);out=root/'dist';out.mkdir(exist_ok=True)
if sys.argv[1:] == ['windows']:
 work=out/'windows';work.mkdir(exist_ok=True);lib=work/'app';lib.mkdir(exist_ok=True);dependency=lib/'json-20240303.jar'
 url='https://repo.maven.apache.org/maven2/org/json/json/20240303/json-20240303.jar'
 if not dependency.exists():urllib.request.urlretrieve(url,dependency)
 expected='3cf6cd6892e32e2b4c1c39e0f52f5248a2f5b37646fdfbb79a66b46b618414ed';assert hashlib.sha256(dependency.read_bytes()).hexdigest()==expected,'JSON dependency checksum mismatch'
 classes=work/'classes';classes.mkdir(exist_ok=True);sources=[str(p) for name in ['shared','windows'] for p in (root/'engine'/name).rglob('*.java')]
 subprocess.run([str(jdk/'bin/javac.exe'),'--release','17','-encoding','UTF-8','-cp',str(dependency),'-d',str(classes),*sources],check=True)
 subprocess.run([str(jdk/'bin/jar.exe'),'--create','--file',str(lib/'plugin.jar'),'-C',str(classes),'.'],check=True)
 runtime=work/'runtime'
 if not runtime.exists():subprocess.run([str(jdk/'bin/jlink.exe'),'--add-modules','java.base','--strip-debug','--no-header-files','--no-man-pages','--output',str(runtime)],check=True)
 target=out/'windows.module.zip'
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
  for folder in [lib,runtime]:
   for p in folder.rglob('*'):
    if p.is_file():archive.write(p,p.relative_to(work).as_posix())
elif sys.argv[1:] == ['android']:
 gradle=os.environ.get('GRADLE','gradle');subprocess.run([gradle,'--no-daemon','--console=plain','assembleRelease'],cwd=root/'android',check=True)
 apk=root/'android/app/build/outputs/apk/release/app-release-unsigned.apk';target=out/'android.module.zip'
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:archive.write(apk,'module.apk')
else:raise SystemExit('Usage: python build.py windows|android')
print('Built '+str(target))
