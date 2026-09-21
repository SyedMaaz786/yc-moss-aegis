import json, wave, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path('recordings/.tools/python').resolve()))
import imageio_ffmpeg
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
chapters = json.loads(Path('recordings/chapters.json').read_text())
capture = json.loads(Path('recordings/.work/capture.json').read_text())
work = Path('recordings/.work')
def run(args):
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)
def stamp(sec):
    ms = round(sec * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
vtt = ['WEBVTT', '']
offset = 0
for i, chapter in enumerate(chapters):
    duration = chapter['duration']
    timing = capture['timings'][i]
    wav = work / f'narration-{i}.wav'
    with wave.open(str(wav)) as source:
        audio_duration = source.getnframes() / source.getframerate()
    speed = max(1.0, audio_duration / (duration - 0.8))
    text = work / f'title-{i}.txt'
    text.write_text(chapter['title'], encoding='utf8')
    ratio = duration / (timing['end'] - timing['start'])
    # Overlay a chapter title; all screen content comes from the actual browser recording.
    vf = f"setpts={ratio}*PTS,scale=1440:1080,drawbox=x=0:y=1008:w=iw:h=72:color=0x080e14@0.96:t=fill,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':textfile='{text.as_posix()}':x=44:y=1034:fontsize=24:fontcolor=0x7de3c2"
    run(['-ss',str(timing['start']),'-t',str(timing['end']-timing['start']),'-i',capture['path'],'-i',str(wav),
         '-filter_complex',f'[0:v]{vf}[v];[1:a]atempo={speed:.5f},apad,atrim=0:{duration}[a]',
         '-map','[v]','-map','[a]','-t',str(duration),'-r','30','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k',str(work/f'chapter-{i}.mp4')])
    # Short readable caption cues, paced across the narration.
    sentences = chapter['narration'].replace('. ', '.|').split('|')
    total_chars = sum(len(s) for s in sentences)
    cursor = offset + .15
    usable = min(audio_duration/speed, duration-.3)
    for sentence in sentences:
        length = usable * len(sentence) / total_chars
        vtt += [stamp(cursor)+' --> '+stamp(cursor+length), sentence, '']
        cursor += length
    offset += duration
    print('Rendered chapter',i+1,flush=True)
listing = work/'concat.txt'
listing.write_text('\n'.join("file 'chapter-"+str(i)+".mp4'" for i in range(len(chapters))))
run(['-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart','public/submission/aegis-demo.mp4'])
Path('public/submission/demo.vtt').write_text('\n'.join(vtt),encoding='utf8',newline='\n')
print('Exported 120-second narrated demo and captions.')
