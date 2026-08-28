"""Prepare the user-selected Taira Komori airport recording, preserving other assets."""
from pathlib import Path
import json
from pydub import AudioSegment

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "katachi-zukan" / "sounds" / "vehicles"
source = ROOT / "sound-tests" / "airport1.mp3"
audio = AudioSegment.from_file(source)
assert audio.rms, "Silent input"
length = 3500
start = max(range(0, max(1, len(audio)-length+1), 50),
            key=lambda p: audio[p:p+length].rms)
clip = audio[start:start+length].set_channels(1).fade_in(80).fade_out(220)
voice = AudioSegment.from_file(ROOT / "katachi-zukan" / "sounds" / "hikouki.mp3")
target = min(-25, voice.dBFS-3)
clip = clip.apply_gain(min(target-clip.dBFS, -10-clip.max_dBFS))
dest = OUT / "hikouki.mp3"
clip.export(dest, format="mp3", bitrate="128k")
checked = AudioSegment.from_file(dest)
assert 0 < len(checked) <= 3550 and checked.max_dBFS < -8
records = json.loads((OUT / "sources.json").read_text(encoding="utf-8"))
records = [r for r in records if r["file"] != "hikouki.mp3"]
record = dict(file="hikouki.mp3",title="飛行整備場１",
    source_member=source.name,author="小森平",
    source_url="https://taira-komori.net/transfer01.html",license="Taira Komori site terms (not CC BY)",
    license_url="https://taira-komori.net/welcome.html",
    edits="Trimmed, mono, volume adjustment and fades",
    start_ms=start,duration_ms=len(checked),dbfs=round(checked.dBFS,2),
    peak_dbfs=round(checked.max_dBFS,2))
records.append(record)
(OUT / "sources.json").write_text(json.dumps(records,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(record,ensure_ascii=True))
