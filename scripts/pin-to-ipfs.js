/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { getFilesFromPath, Web3Storage } = require('web3.storage')

dotenv.config({ path: path.join(__dirname, '.env.deployment') })

const token = process.env.WEB3_STORAGE_TOKEN
if (!token) {
  throw new Error('no web3 storage token found')
}

const storage = new Web3Storage({ token, endpoint: new URL('https://api.web3.storage') })

async function main() {
  const files = await getFilesFromPath(path.join(__dirname, '../build'))

  console.log(`Uploading ${files.length} files`)

  const cid = await storage.put(files, {
    name: `muffin-site ${new Date().toISOString()}`,
    wrapWithDirectory: false,
    onStoredChunk: (chunkSize) => console.log(`stored chunk of ${chunkSize} bytes`),
  })

  console.log('Content added with CID:', cid)

  fs.appendFileSync(path.join(__dirname, '__cid.txt'), '\n' + cid)
}

main().catch(console.error)
