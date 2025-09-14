"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Video, Square, RotateCcw, Play, Pause, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface KaraokeRecordingProps {
  song: {
    id: string
    title: string
    artist: string
    videoUrl: string
  }
  onNext: (recordedVideo: string) => void
  onBack: () => void
}

export default function KaraokeRecording({ song, onNext, onBack }: KaraokeRecordingProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionError, setPermissionError] = useState("")
  const [karaokeVideoPlaying, setKaraokeVideoPlaying] = useState(false)
  const [videoLoadError, setVideoLoadError] = useState(false)
  const [videoLoading, setVideoLoading] = useState(true)

  const karaokeVideoRef = useRef<HTMLVideoElement>(null)
  const userVideoRef = useRef<HTMLVideoElement>(null)
  const combinedCanvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const mixedStreamRef = useRef<MediaStream | null>(null)
  const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  useEffect(() => {
    requestPermissions()
    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (karaokeVideoRef.current) {
      const video = karaokeVideoRef.current

      const handleLoadStart = () => setVideoLoading(true)
      const handleCanPlay = () => {
        setVideoLoading(false)
        setVideoLoadError(false)
      }
      const handleError = (e: Event) => {
        console.warn(`Failed to load karaoke video for ${song.title}:`, e)
        setVideoLoadError(true)
        setVideoLoading(false)
      }

      video.addEventListener("loadstart", handleLoadStart)
      video.addEventListener("canplay", handleCanPlay)
      video.addEventListener("error", handleError)

      return () => {
        video.removeEventListener("loadstart", handleLoadStart)
        video.removeEventListener("canplay", handleCanPlay)
        video.removeEventListener("error", handleError)
      }
    }
  }, [song.title])

  const requestPermissions = async () => {
    try {
      setPermissionError("")

      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 720, max: 1280 },
            height: { ideal: 1280, max: 1920 },
            facingMode: "user",
            frameRate: { ideal: 30, max: 30 },
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 44100,
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Permission request timeout")), 30000)),
      ])

      streamRef.current = stream
      setHasPermission(true)

      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream
      }
    } catch (error: any) {
      console.error("Permission denied:", error)

      let errorMessage = "Camera and microphone access is required for recording."

      if (error.name === "NotAllowedError") {
        errorMessage =
          "Camera and microphone permissions were denied. Please tap the camera icon in your browser and allow access, then try again."
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera or microphone found. Please ensure your device has these features and try again."
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera or microphone is already in use. Please close other apps and try again."
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Camera settings not supported. Trying with basic settings..."
        setTimeout(() => requestBasicPermissions(), 1000)
        return
      } else if (error.message === "Permission request timeout") {
        errorMessage =
          "Permission request timed out. Please check for a permission popup and allow camera/microphone access."
      }

      setPermissionError(errorMessage)
    }
  }

  const requestBasicPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      })

      streamRef.current = stream
      setHasPermission(true)

      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream
      }
    } catch (error: any) {
      console.error("Basic permission request failed:", error)
      setPermissionError("Unable to access camera and microphone. Please check your device settings and try again.")
    }
  }

  const requestPermissionsManual = async () => {
    try {
      setPermissionError("")

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
        },
      })

      streamRef.current = stream
      setHasPermission(true)

      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream
      }
    } catch (error: any) {
      console.error("Manual permission request failed:", error)

      if (error.name === "NotAllowedError") {
        setPermissionError(
          "Permissions were denied. Please refresh the page and allow camera/microphone access when prompted.",
        )
      } else if (error.name === "NotFoundError") {
        setPermissionError("No camera or microphone found. Please connect your devices and try again.")
      } else {
        setPermissionError("Unable to access camera and microphone. Please check your browser settings and try again.")
      }
    }
  }

  const createMixedStream = async (): Promise<MediaStream | null> => {
    try {
      if (!streamRef.current || !karaokeVideoRef.current || videoLoadError) {
        console.log("[v0] Using user stream only - no karaoke video available")
        return streamRef.current
      }

      if (audioContextRef.current) {
        if (mediaElementSourceRef.current) {
          mediaElementSourceRef.current.disconnect()
          mediaElementSourceRef.current = null
        }
        if (micSourceRef.current) {
          micSourceRef.current.disconnect()
          micSourceRef.current = null
        }
        await audioContextRef.current.close()
        audioContextRef.current = null
      }

      audioContextRef.current = new AudioContext()
      const audioContext = audioContextRef.current

      console.log("[v0] Creating mixed audio stream")

      micSourceRef.current = audioContext.createMediaStreamSource(streamRef.current)
      const micAudio = micSourceRef.current

      mediaElementSourceRef.current = audioContext.createMediaElementSource(karaokeVideoRef.current)
      const karaokeAudio = mediaElementSourceRef.current

      const micGain = audioContext.createGain()
      const karaokeGain = audioContext.createGain()

      micGain.gain.value = 1.2
      karaokeGain.gain.value = 0.8

      micAudio.connect(micGain)
      karaokeAudio.connect(karaokeGain)

      const destination = audioContext.createMediaStreamDestination()
      micGain.connect(destination)
      karaokeGain.connect(destination)

      if (audioContext.state === "suspended") {
        await audioContext.resume()
      }

      const canvas = combinedCanvasRef.current
      if (!canvas) {
        console.log("[v0] No canvas available, using user stream only")
        return streamRef.current
      }

      canvas.width = 720
      canvas.height = 1280
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        console.log("[v0] No canvas context, using user stream only")
        return streamRef.current
      }

      const drawFrame = () => {
        if (!isRecording) return

        ctx.fillStyle = "#000000"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        if (karaokeVideoRef.current && !videoLoadError) {
          const karaokeHeight = canvas.height * 0.7
          ctx.drawImage(karaokeVideoRef.current, 0, 0, canvas.width, karaokeHeight)
        }

        if (userVideoRef.current) {
          const userHeight = canvas.height * 0.3
          const userY = canvas.height * 0.7

          ctx.save()
          ctx.scale(-1, 1)
          ctx.drawImage(userVideoRef.current, -canvas.width, userY, canvas.width, userHeight)
          ctx.restore()
        }

        requestAnimationFrame(drawFrame)
      }

      const canvasStream = canvas.captureStream(30)
      const videoTrack = canvasStream.getVideoTracks()[0]

      const audioTracks = destination.stream.getAudioTracks()
      console.log("[v0] Mixed stream created with", audioTracks.length, "audio tracks and 1 video track")

      const mixedStream = new MediaStream([videoTrack, ...audioTracks])

      drawFrame()

      return mixedStream
    } catch (error) {
      console.error("Failed to create mixed stream:", error)
      console.log("[v0] Falling back to user stream only")
      return streamRef.current
    }
  }

  const cleanup = () => {
    if (mediaElementSourceRef.current) {
      mediaElementSourceRef.current.disconnect()
      mediaElementSourceRef.current = null
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect()
      micSourceRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (mixedStreamRef.current) {
      mixedStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
    }
  }

  const startRecording = async () => {
    if (!streamRef.current || !hasPermission) {
      alert("Camera and microphone permissions are required")
      return
    }

    const tracks = streamRef.current.getTracks()
    const activeTracks = tracks.filter((track) => track.readyState === "live")

    if (activeTracks.length === 0) {
      alert("Camera and microphone are not active. Please refresh and try again.")
      return
    }

    try {
      recordedChunksRef.current = []

      const recordingStream = await createMixedStream()
      if (!recordingStream) {
        alert("Failed to create recording stream")
        return
      }

      mixedStreamRef.current = recordingStream

      let mimeType = ""
      const supportedTypes = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm", "video/mp4"]

      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(recordingStream, { mimeType, videoBitsPerSecond: 2500000 })
        : new MediaRecorder(recordingStream)

      console.log("[v0] Recording with format:", mediaRecorder.mimeType || "browser default")
      console.log("[v0] Mixed stream tracks:", recordingStream.getTracks().length)

      mediaRecorder.ondataavailable = (event) => {
        console.log("[v0] Data available:", event.data.size, "bytes")
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const finalMimeType = mediaRecorder.mimeType || "video/webm"
        const blob = new Blob(recordedChunksRef.current, { type: finalMimeType })

        console.log("[v0] Recording completed:", {
          size: blob.size,
          type: blob.type,
          chunks: recordedChunksRef.current.length,
        })

        if (blob.size > 0) {
          setRecordedBlob(blob)
        } else {
          console.error("Recording failed: empty blob")
          alert(
            "Recording failed - no data captured. Please ensure your camera and microphone are working and try again.",
          )
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error("[v0] MediaRecorder error:", event)
        alert("Recording error occurred. Please try again.")
        setIsRecording(false)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)

      if (karaokeVideoRef.current && !videoLoadError) {
        karaokeVideoRef.current.currentTime = 0
        karaokeVideoRef.current.volume = 0.8 // Higher volume for user to hear
        karaokeVideoRef.current.play().catch((e) => {
          console.warn("Failed to play karaoke video:", e)
        })
        setKaraokeVideoPlaying(true)
      }

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("[v0] Recording failed:", error)
      alert("Recording failed. Please check your camera and microphone permissions and try again.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (recordingTime < 1) {
        alert("Please record for at least 1 second before stopping.")
        return
      }

      console.log("[v0] Stopping recording after", recordingTime, "seconds")
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      // Stop karaoke video
      if (karaokeVideoRef.current) {
        karaokeVideoRef.current.pause()
        setKaraokeVideoPlaying(false)
      }

      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }

      setTimeout(() => {
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
      }, 1000)
    }
  }

  const restartRecording = () => {
    stopRecording()
    setRecordedBlob(null)
    setRecordingTime(0)

    // Reset karaoke video
    if (karaokeVideoRef.current) {
      karaokeVideoRef.current.currentTime = 0
      karaokeVideoRef.current.pause()
      setKaraokeVideoPlaying(false)
    }
  }

  const toggleKaraokeVideo = () => {
    if (karaokeVideoRef.current && !videoLoadError) {
      if (karaokeVideoPlaying) {
        karaokeVideoRef.current.pause()
        setKaraokeVideoPlaying(false)
      } else {
        karaokeVideoRef.current.play().catch((e) => {
          console.warn("Failed to play karaoke video:", e)
        })
        setKaraokeVideoPlaying(true)
      }
    }
  }

  const proceedToDownload = () => {
    if (recordedBlob) {
      const videoUrl = URL.createObjectURL(recordedBlob)
      console.log("Created video URL:", videoUrl, "Blob size:", recordedBlob.size)
      onNext(videoUrl)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 p-4 flex items-center justify-center">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {permissionError || "Requesting camera and microphone permissions..."}
              </AlertDescription>
            </Alert>
            <div className="mt-4 space-y-2">
              <Button onClick={requestPermissionsManual} className="w-full">
                {permissionError ? "Try Again" : "Grant Permissions"}
              </Button>
              {permissionError && (
                <Button onClick={requestBasicPermissions} variant="outline" className="w-full bg-transparent">
                  Try Basic Settings
                </Button>
              )}
              <Button variant="outline" onClick={onBack} className="w-full bg-transparent">
                Go Back
              </Button>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p className="font-medium mb-2">Mobile Tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Tap "Allow" when prompted for camera/microphone</li>
                <li>• Hold your phone vertically (portrait mode)</li>
                <li>• Ensure good lighting for best results</li>
                <li>• Close other apps that might use the camera</li>
                <li>• Make sure your device has camera/microphone</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 p-2">
      <div className="max-w-sm mx-auto pt-2">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/20">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="text-white text-center flex-1 mx-2">
            <h1 className="text-base font-bold truncate">{song.title}</h1>
            <p className="text-white/90 text-xs truncate">by {song.artist}</p>
          </div>
          <div className="text-white text-right min-w-0">
            {isRecording && (
              <div className="text-xs font-mono">
                <span className="text-red-400">● REC</span>
                <br />
                {formatTime(recordingTime)}
              </div>
            )}
          </div>
        </div>

        <Card className="mb-4">
          <CardContent className="p-0">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <div className="w-full" style={{ height: "70vh" }}>
                {videoLoadError ? (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                      <p className="text-sm font-medium mb-1">Karaoke Video Unavailable</p>
                      <p className="text-xs text-gray-300">You can still record your performance</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={karaokeVideoRef}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      onEnded={() => setKaraokeVideoPlaying(false)}
                      preload="metadata"
                      muted={false}
                      playsInline
                    >
                      <source src={song.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    {videoLoading && !karaokeVideoPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                          <p className="text-sm">Loading...</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!isRecording && !videoLoading && !videoLoadError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button onClick={toggleKaraokeVideo} size="lg" className="bg-white/20 hover:bg-white/30 text-white">
                      {karaokeVideoPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </Button>
                  </div>
                )}

                {isRecording && (
                  <div className="absolute top-2 left-2">
                    <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></div>
                      RECORDING
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full bg-black border-t border-gray-600" style={{ height: "20vh" }}>
                <video
                  ref={userVideoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  autoPlay
                  muted
                  playsInline
                />
                {isRecording && (
                  <div className="absolute bottom-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                    YOU - RECORDING
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col items-center space-y-3">
              {!isRecording && !recordedBlob && (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white w-full h-12 text-base"
                >
                  <Video className="h-5 w-5 mr-2" />
                  Start Recording
                </Button>
              )}

              {isRecording && (
                <div className="flex flex-col space-y-2 w-full">
                  <Button
                    onClick={stopRecording}
                    size="lg"
                    className="bg-gray-600 hover:bg-gray-700 text-white w-full h-12 text-base"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Stop Recording
                  </Button>
                  <Button
                    onClick={restartRecording}
                    size="lg"
                    variant="outline"
                    className="w-full h-12 text-base bg-transparent"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Restart
                  </Button>
                </div>
              )}

              {recordedBlob && !isRecording && (
                <div className="flex flex-col space-y-2 w-full">
                  <Button
                    onClick={restartRecording}
                    size="lg"
                    variant="outline"
                    className="w-full h-12 text-base bg-transparent"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Record Again
                  </Button>
                  <Button
                    onClick={proceedToDownload}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white w-full h-12 text-base"
                  >
                    Continue to Download
                  </Button>
                </div>
              )}
            </div>

            {recordedBlob && (
              <div className="mt-3 text-center">
                <p className="text-green-600 font-medium text-sm">
                  Recording completed! Duration: {formatTime(recordingTime)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <h4 className="font-semibold mb-2 text-sm">Mobile Recording Tips:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Hold phone vertically for best results</li>
              <li>• Lyrics appear in the top section</li>
              <li>• Your face shows in the bottom section</li>
              <li>• Tap and hold record button to start</li>
              <li>• Ensure good lighting and stable grip</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <canvas ref={combinedCanvasRef} style={{ display: "none" }} />
    </div>
  )
}
