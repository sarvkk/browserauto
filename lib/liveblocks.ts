import { Liveblocks } from "@liveblocks/node"

let liveblocksInstance: Liveblocks | undefined

export function getLiveblocks() {
  if (liveblocksInstance) return liveblocksInstance

  const secret = process.env.LIVEBLOCKS_SECRET_KEY
  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not set")
  }

  liveblocksInstance = new Liveblocks({ secret })
  return liveblocksInstance
}
