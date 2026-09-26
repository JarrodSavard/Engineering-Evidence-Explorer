"""Original quiet instrumental: electric-piano tones and a soft sustained pad."""
import json, wave
from pathlib import Path
import numpy as np

folder = Path('output/showcase-video')
duration = json.loads((folder / 'manifest.json').read_text())['duration']
sr = 44100
audio = np.zeros((int(duration * sr), 2), dtype=np.float64)

def note(start, midi, length, gain, pan=0):
    begin = int(start * sr)
    n = min(int(length * sr), len(audio) - begin)
    if n <= 0: return
    t = np.arange(n) / sr
    f = 440 * 2 ** ((midi - 69) / 12)
    envelope = (1 - np.exp(-t * 35)) * np.exp(-t / 2.3) * np.minimum(1, (length - t) / .6)
    tone = (np.sin(2*np.pi*f*t) + .21*np.sin(2*np.pi*2*f*t) + .045*np.sin(2*np.pi*3*f*t)) * envelope * gain
    audio[begin:begin+n,0] += tone * (.7 - pan*.25)
    audio[begin:begin+n,1] += tone * (.7 + pan*.25)

# Dmaj9, Bm7, Gmaj9, Aadd9; a restrained, original repeating arrangement.
chords = [[50,57,61,64,69],[47,54,57,62,66],[43,50,54,57,62],[45,52,59,61,64]]
beat = 60/86
for bar in range(int(duration/(beat*4))+1):
    chord = chords[bar%4]
    start=bar*beat*4
    for j, pitch in enumerate(chord): note(start+j*.025,pitch,5,.12, (j-2)/2)
    for j in range(4): note(start+j*beat, chord[(j+bar)%5]+12,3,.035,(-1)**j*.6)
fadein=np.minimum(1,np.arange(len(audio))/sr/2)
fadeout=np.minimum(1,(len(audio)-np.arange(len(audio)))/sr/4)
audio*= (fadein*fadeout)[:,None]
audio=np.clip(audio,-.95,.95)
with wave.open(str(folder/'music.wav'),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((audio*32767).astype('<i2').tobytes())
print(f'Original instrumental composed; {duration} seconds, stereo')
