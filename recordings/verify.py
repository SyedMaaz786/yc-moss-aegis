"""Inspect the rendered demo and export frames for a visual review."""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path('recordings/.tools/python').resolve()))
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
video = 'public/submission/aegis-demo.mp4'
probe = subprocess.run([ffmpeg, '-hide_banner', '-i', video], capture_output=True, text=True)
print(probe.stderr)
for second in (20, 60, 95, 113):
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(second),
                    '-i', video, '-frames:v', '1', f'recordings/.work/review-{second}.png'], check=True)
print('Video bytes:', Path(video).stat().st_size)
