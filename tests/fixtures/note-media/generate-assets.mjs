import { mkdir, copyFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'

const directory = fileURLToPath(new URL('../../../.context/note-media-fixtures/public/media/', import.meta.url))
await mkdir(directory, { recursive: true })
for (const [name, width, height] of [['portrait', 640, 800], ['landscape', 1200, 600], ['square', 600, 600], ['tall', 80, 1600], ['poster', 640, 360]]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 640 800" preserveAspectRatio="none"><rect width="640" height="800" fill="#94b8bf"/><circle cx="410" cy="250" r="100" fill="#e85a30"/><path d="M0 500L240 280L640 680V800H0Z" fill="#3d626a"/><path d="M0 680L400 430L640 560V800H0Z" fill="#203e46"/><path d="M0 750Q320 650 640 730V800H0Z" fill="#d3c3a4"/></svg>`
  await sharp(Buffer.from(svg)).png().toFile(`${directory}${name}.png`)
}
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24:duration=4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-g', '24', '-movflags', '+faststart', `${directory}clip.mp4`])
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', `${directory}clip.mp4`, '-c', 'copy', '-hls_time', '1', '-hls_playlist_type', 'vod', '-hls_segment_filename', `${directory}segment-%02d.ts`, `${directory}video.m3u8`])
await writeFile(`${directory}captions.vtt`, 'WEBVTT\n\n00:00.000 --> 00:04.000\nAn original test animation.\n')
await writeFile(`${directory}subtitles.m3u8`, '#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXT-X-VERSION:3\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXTINF:4.000,\ncaptions.vtt\n#EXT-X-ENDLIST\n')
await writeFile(`${directory}stream.m3u8`, '#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="en",URI="subtitles.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.64001e",SUBTITLES="subs"\nvideo.m3u8\n')
await copyFile(new URL('../../../public/favicon.png', import.meta.url), `${directory}../favicon.png`)
const dragon = fileURLToPath(new URL('../../../public/notes/2026/09/14/3mvh2nuog47av/video-1-bafkreie25gajmg6znivauevbkcmvoll3ia2d4jtbeg4kczt5jpgswevxfe.mp4', import.meta.url))
await copyFile(dragon, `${directory}dragon.mp4`)
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', dragon, '-frames:v', '1', `${directory}dragon-poster.jpg`])
console.log('Generated original image, MP4, HLS, and caption fixtures in .context/note-media-fixtures/public/media/')
