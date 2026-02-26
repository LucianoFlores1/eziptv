'use client'

import { useRouter } from 'next/navigation'
import { VideoPlayer } from '@/components/video-player'

const DEMO_STREAM_URL =
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'

export default function DemoPlayerPage() {
  const router = useRouter()

  return (
    <div className="h-dvh w-full bg-black">
      <VideoPlayer
        streamUrl={DEMO_STREAM_URL}
        contentId={0}
        contentType="vod"
        onBack={() => router.push('/login')}
        title="Demo Video (Google Sample)"
      />
    </div>
  )
}
