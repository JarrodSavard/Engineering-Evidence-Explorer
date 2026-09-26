"""Mix and deliver the showcase without changing voice speed or pitch."""
from pathlib import Path
import json, subprocess, sys

root = Path('output/showcase-video').resolve()
ffmpeg = str(root / 'tools/ffmpeg.exe')
manifest = json.loads((root / 'manifest.json').read_text())
duration = manifest['duration']

def run(args, name):
    process = subprocess.run([ffmpeg, '-y', '-hide_banner', *args], capture_output=True, text=True)
    (root / f'{name}.log').write_text(process.stderr, encoding='utf-8')
    if process.returncode: raise RuntimeError(f'{name} failed; see {name}.log')
    return process.stderr

mix = f'[0:a]loudnorm=I=-20:TP=-3:LRA=7,aresample=48000,aformat=channel_layouts=stereo,adelay=1200|1200,apad,asplit=2[voice][side];[1:a]loudnorm=I=-34:TP=-7:LRA=5,aresample=48000[music];[music][side]sidechaincompress=threshold=0.015:ratio=3:attack=30:release=400[duck];[voice][duck]amix=inputs=2:normalize=0,alimiter=limit=0.8:level=0:latency=1,apad,atrim=duration={duration}[out]'
run(['-i',str(root/'narration.mp3'),'-i',str(root/'music.wav'),'-filter_complex',mix,'-map','[out]','-t',str(duration),'-c:a','pcm_s24le',str(root/'mix.wav')], 'mix')
if '--audio-only' in sys.argv:
    print('Narration and original instrumental mixed'); sys.exit(0)
metadata = ['-metadata','title=Engineering Evidence Explorer - Portfolio Showcase','-metadata','artist=Jarrod Savard','-metadata',f"comment=Fictional team and records. Genuine local MCP capture; editorial timing compressed. AI narration: {manifest['voice']['name']}, ElevenLabs. Original instrumental score."]
run(['-i',str(root/'picture-4k.mp4'),'-i',str(root/'mix.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-t',str(duration),'-movflags','+faststart',*metadata,str(root/'engineering-evidence-explorer-4k.mp4')], 'export-4k')
run(['-i',str(root/'engineering-evidence-explorer-4k.mp4'),'-vf','scale=1920:1080:flags=lanczos','-c:v','libx264','-preset','fast','-crf','19','-threads','4','-c:a','copy','-movflags','+faststart',*metadata,str(root/'engineering-evidence-explorer-1080p.mp4')], 'export-1080p')
for size in ['4k','1080p']:
    run(['-v','error','-i',str(root/f'engineering-evidence-explorer-{size}.mp4'),'-f','null','-'], f'decode-{size}')
run(['-ss',str(manifest['scenes'][-1]['start'] + 2),'-i',str(root/'engineering-evidence-explorer-1080p.mp4'),'-frames:v','1',str(root/'poster.jpg')], 'poster')
measure=run(['-i',str(root/'mix.wav'),'-af','loudnorm=I=-20:TP=-2:LRA=7:print_format=json','-f','null','-'], 'loudness')
measurement=json.loads(measure[measure.rfind('{'):measure.rfind('}')+1])
report={'duration':duration,'fps':30,'voice':manifest['voice'],'music':'Original synthesized electric-piano arrangement','captions':'Burned into picture; SRT/VTT sidecars provided','loudness':measurement,'fullDecodePassed':['4k','1080p'],'exports':[{ 'file':f'engineering-evidence-explorer-{s}.mp4','bytes':(root/f'engineering-evidence-explorer-{s}.mp4').stat().st_size } for s in ['4k','1080p']]}
(root/'delivery-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
