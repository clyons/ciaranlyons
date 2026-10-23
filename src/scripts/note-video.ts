type Player = { destroy(): void }

function initializeVideos() {
  for (const container of document.querySelectorAll<HTMLElement>('[data-note-video]')) {
    if (container.dataset.initialized) continue
    container.dataset.initialized = 'true'
    const video = container.querySelector('video')!
    const button = container.querySelector<HTMLButtonElement>('[data-note-play]')
    const status = container.querySelector<HTMLElement>('[data-note-video-status]')!
    let player: Player | undefined
    if (button) {
      video.controls = false
      button.hidden = false
    }

    const fail = () => {
      status.hidden = false
      video.controls = true
      button?.remove()
      player?.destroy()
      player = undefined
    }
    video.addEventListener('error', fail)
    video.querySelector('source')?.addEventListener('error', fail)
    video.addEventListener('playing', () => { status.hidden = true })
    button?.addEventListener('click', async () => {
      button.disabled = true
      button.setAttribute('aria-busy', 'true')
      const src = video.dataset.hlsSrc
      try {
        if (!src) {
          // Native file sources are already attached; preload stays disabled until play.
        } else {
          const { default: Hls } = await import('hls.js')
          if (Hls.isSupported()) {
            const hls = new Hls({ autoStartLoad: true })
            player = hls
            hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) fail() })
            hls.loadSource(src)
            hls.attachMedia(video)
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src
          } else { fail(); return }
        }
        video.controls = true
        button.remove()
        video.focus()
        await video.play()
      } catch {
        fail()
      }
    }, { once: true })
    document.addEventListener('astro:before-swap', () => { player?.destroy() }, { once: true })
  }
}

initializeVideos()
document.addEventListener('astro:page-load', initializeVideos)
