# Nova_A 4.8 audio production

Use **Manage → Presentation → Audio** for the real runtime bus graph. Every bus has gain, mute/solo, parent, bounded voice limit, sends, ordered effects, gain automation, and optional loop length. Snapshots store master/bus levels; ducking rules lower a target bus while a trigger is active. The master limiter and ceiling are part of the actual signal graph.

Meters display peak, RMS, dB, and clipping. Green means normal signal, amber approaches the ceiling, and red means clipping; control positions keep the normal accent color. Diagnostics report active/streaming/buffered/virtual/stolen voices, latency, underruns, output device changes, context state, and bounded recovery failures.

`AudioSource` supports bus routing, volume/pitch randomization, priority/polyphony, streaming override, seek offset, fades, loop, sequential/random playlists, positional blend, attenuation, pan, and listener distance. Doppler is explicitly limited by the stereo Web Audio path and is never shown as fully supported. A string of short effects should use preload/buffer behavior; long music should use streaming/metadata preload.

Output devices are enumerated where the host permits it. Device selection uses the host sink API, listens for hot plug, and attempts explicit recovery after loss or suspended context. Failure remains visible with a corrective action. Browser autoplay policy may require a user gesture. Build Diagnostics checks broken routes, unavailable context, underruns, and playback failures.

Release evidence distinguishes the local default-output smoke from external disconnect/reconnect, sample-rate, multiple-device, and 24-hour playback gates.
