'use client'

import { useRouter } from 'next/navigation'
import { VideoPlayer } from '@/components/video-player'

const DEMO_STREAM_URL =
  'https://ntv-unm-live.akamaized.net/hls/live/708105/NASA-NTV1-Public/master.m3u8'

export default function DemoPlayerPage() {
  const router = useRouter()

  return (
    <div className="h-dvh w-full bg-black">
      <VideoPlayer
        streamUrl={DEMO_STREAM_URL}
        contentId={0}
        contentType="live"
        onBack={() => router.push('/login')}
        title="NASA TV (Demo - Public HLS Stream)"
      />
    </div>
  )
}
