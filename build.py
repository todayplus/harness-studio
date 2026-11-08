#!/usr/bin/env python3
"""Build Harness Studio: inline CSS/JS into index.html + standalone single file."""
import hashlib, pathlib, re, shutil, json

ROOT = pathlib.Path(__file__).parent
tpl = (ROOT/"index.template.html").read_text(encoding="utf-8")
css = (ROOT/"src/styles.css").read_text(encoding="utf-8")
data = (ROOT/"src/data.js").read_text(encoding="utf-8")
app = (ROOT/"src/app.js").read_text(encoding="utf-8")

out = (tpl
       .replace("/*INJECT_CSS*/", css)
       .replace("/*INJECT_DATA*/", data)
       .replace("/*INJECT_APP*/", app))
(ROOT/"index.html").write_text(out, encoding="utf-8")
(ROOT/"harness-studio.html").write_text(out, encoding="utf-8")

# sw cache version from content hash
sw = (ROOT/"sw.template.js").read_text(encoding="utf-8")
h = hashlib.sha1(out.encode()).hexdigest()[:10]
(ROOT/"sw.js").write_text(sw.replace("__VERSION__", h), encoding="utf-8")
print(f"built index.html {len(out)/1024:.1f} KB · sw {h}")
