# SFX Assets — License Info

## Programmatically Generated (CC0-equivalent)

All SFX files were generated programmatically using ffmpeg synthesis.
No copyrighted source material was used. These are original works and
can be freely used without attribution.

| File          | Method                                                         | Duration |
| ------------- | -------------------------------------------------------------- | -------- |
| `whoosh.mp3`  | Pink noise, band-pass 800–4000Hz, fast-in/slow-out envelope    | 0.4s     |
| `shimmer.mp3` | 2kHz sine, tremolo 12Hz, high-pass 1500Hz, quick fade envelope | 0.45s    |

## Regeneration

```bash
# whoosh
ffmpeg -y -f lavfi -i "anoisesrc=d=0.4:c=pink:r=44100,highpass=f=800,lowpass=f=4000,afade=t=in:st=0:d=0.08,afade=t=out:st=0.1:d=0.3,volume=0.6" -c:a libmp3lame -b:a 128k assets/sounds/whoosh.mp3

# shimmer
ffmpeg -y -f lavfi -i "sine=f=2000:d=0.45:r=44100,tremolo=f=12:d=0.7,highpass=f=1500,afade=t=in:st=0:d=0.05,afade=t=out:st=0.08:d=0.37,volume=0.5" -c:a libmp3lame -b:a 128k assets/sounds/shimmer.mp3
```

## Upgrading to Better SFX

To replace with higher-quality SFX from CC0 sources (freesound.org, pixabay):

1. Replace the MP3 files in this directory
2. Keep filenames as `whoosh.mp3` and `shimmer.mp3`
3. Update this document with source attribution
