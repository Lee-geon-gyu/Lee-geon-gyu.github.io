"""Original slow felt-piano arrangement; no external samples or melodies.

Writes a seamless 90-second PCM loop. Audio is fetched only after the listener
uses the BGM button, independently from the scene's asset-loading pipeline.
"""
from pathlib import Path
import numpy as np
import wave

rate=22050;beat=60/64;bar=beat*4;duration=bar*24
n=round(duration*rate);signal=np.zeros(n,dtype=np.float64)
chords=[(36,[52,55,59,62]),(33,[48,52,55,59]),(29,[53,57,60,64]),(31,[53,57,60,62]),(28,[50,54,55,59]),(33,[55,59,62,64]),(26,[53,57,60,64]),(31,[47,52,53,57])]
melodies=[[64,67],[71,69],[67,64],[62,64],[66,67],[69,64],[65,64],[62,59]]
def note(midi,start,gain,length=5.4,pad=False):
    t=np.arange(round(length*rate))/rate;frequency=440*2**((midi-69)/12)
    if pad:
        tone=np.sin(2*np.pi*frequency*t+.008*np.sin(2*np.pi*.17*t))+.22*np.sin(2*np.pi*frequency*2*t)
        envelope=(1-np.exp(-t/.5))*np.exp(-t/3.7)*np.minimum(1,(length-t)/.6)
    else:
        phase=2*np.pi*frequency*t
        tone=np.sin(phase+.14*np.exp(-t/.35)*np.sin(phase*2))+.21*np.sin(phase*2+.1)*np.exp(-t/1.1)+.055*np.sin(phase*3+.4)*np.exp(-t/.5)
        envelope=(1-np.exp(-t/.016))*(.7*np.exp(-t/1.6)+.3*np.exp(-t/3.1))*np.minimum(1,(length-t)/.25)
    at=(round(start*rate)+np.arange(len(t)))%n
    np.add.at(signal,at,tone*envelope*gain)
for i in range(24):
    bass,voicing=chords[i%8];start=i*bar
    note(bass,start,.09,6)
    for j,midi in enumerate(voicing):
        note(midi,start+j*.065,.045)
        note(midi,start,.006,length=5.8,pad=True)
        if i%2==0:note(midi,start+beat*2+j*.1,.014)
    for j,midi in enumerate(melodies[i%8]):
        note(midi+(12 if i>=16 and i%4==0 else 0),start+beat*(1.25+j*1.55),.023 if i>=8 else .015,length=4.2)
dry=signal.copy()
for delay,gain in [( .097,.13),(.173,.11),(.281,.08),(.419,.065),(.673,.04),(.917,.025)]:signal+=np.roll(dry,round(delay*rate))*gain
# Soft high-frequency rolloff keeps the piano warm and unobtrusive.
spectrum=np.fft.rfft(signal);freq=np.fft.rfftfreq(n,1/rate);spectrum*=1/(1+(freq/2600)**4)
signal=np.fft.irfft(spectrum,n);signal*=.72/max(abs(signal))
out=Path(__file__).resolve().parents[1]/'public/assets/afternoon-piano.wav'
with wave.open(str(out),'wb') as audio:
    audio.setnchannels(1);audio.setsampwidth(2);audio.setframerate(rate);audio.writeframes((signal*32767).astype('<i2').tobytes())
print('ORIGINAL_PIANO',round(duration,2),'seconds',out.stat().st_size,'bytes','RMS',round(float(np.sqrt(np.mean(signal**2))),4))
