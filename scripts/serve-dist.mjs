import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'

const root = path.resolve('dist')
const port = Number.parseInt(process.env.PORT ?? '4321', 10)
const mimeTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
}

function send(response, status, body) {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' })
  response.end(body)
}

async function fileForPathname(pathname) {
  const requested = path.resolve(root, `.${pathname}`)
  if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) return null

  try {
    const details = await stat(requested)
    return details.isDirectory() ? path.join(requested, 'index.html') : requested
  } catch {
    if (path.extname(requested)) return null
    const index = path.join(requested, 'index.html')
    try {
      await stat(index)
      return index
    } catch {
      return null
    }
  }
}

createServer(async (request, response) => {
  if (!request.url || !['GET', 'HEAD'].includes(request.method ?? '')) {
    send(response, 405, 'Method not allowed')
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host ?? 'localhost'}`).pathname)
  } catch {
    send(response, 400, 'Bad request')
    return
  }

  const file = await fileForPathname(pathname)
  if (!file) {
    send(response, 404, 'Not found')
    return
  }

  response.writeHead(200, { 'content-type': mimeTypes[path.extname(file)] ?? 'application/octet-stream' })
  if (request.method === 'HEAD') response.end()
  else createReadStream(file).pipe(response)
}).listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`)
})
