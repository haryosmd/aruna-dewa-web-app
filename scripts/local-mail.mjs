import net from 'node:net'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

// Local test mailbox only. Production uses configured SMTP; this binds loopback.
await mkdir('.data/mail', { recursive: true })
net.createServer(socket => {
  socket.setEncoding('utf8')
  socket.setTimeout(30_000, () => socket.destroy())
  socket.write('220 aruna-local ESMTP\r\n')
  let buffer = '', message = '', data = false
  socket.on('error', () => {})
  socket.on('data', async chunk => {
    buffer += chunk
    if (buffer.length + message.length > 2_000_000) { socket.end('552 Message too large\r\n'); return }
    let newline
    while ((newline = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 2)
      if (data) {
        if (line === '.') {
          data = false
          await writeFile(`.data/mail/${Date.now()}-${randomUUID()}.eml`, message, { mode: 0o600 })
          message = ''; socket.write('250 Message stored locally\r\n')
        } else message += `${line.replace(/^\.\./, '.')}\r\n`
      } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250-aruna-local\r\n250 SIZE 2000000\r\n')
      else if (/^(MAIL FROM:|RCPT TO:|RSET|NOOP)/i.test(line)) socket.write('250 OK\r\n')
      else if (/^DATA$/i.test(line)) { data = true; socket.write('354 End with <CRLF>.<CRLF>\r\n') }
      else if (/^QUIT$/i.test(line)) socket.end('221 Bye\r\n')
      else socket.write('502 Command unavailable\r\n')
    }
  })
}).listen(1025, '127.0.0.1', () => console.log('Local SMTP at 127.0.0.1:1025; messages stored in .data/mail (gitignored).'))
