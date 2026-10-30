# Clarity — Video Enhancement Studio

A browser-based video editor for sharpening footage and adjusting clarity, vibrance, and brightness. Your video is processed locally in your browser.

## Use the editor

Open `index.html` in a recent browser, choose or drop in a video, and adjust the sliders or select a quick look. Hold **Compare** to view the original. When browser recording support is available, **Export video** saves an enhanced WebM copy.

## Notes

- The editor does not upload videos.
- Export requires browser support for WebGL, canvas capture, and MediaRecorder. The exported video is WebM; audio is included when the browser exposes the source audio track.
- Export applies the selected sharpness, clarity, vibrance, and brightness adjustments. The preview and exported render use browser-based filters; they do not restore detail that was not present in the source footage.
