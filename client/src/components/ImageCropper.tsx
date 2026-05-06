import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import getCroppedImg from '@/utils/cropImage'

interface ImageCropperProps {
  imageSrc: string
  open: boolean
  onClose: () => void
  onCropComplete: (croppedBlob: Blob) => void
  aspect?: number
  title?: string
}

export default function ImageCropper({
  imageSrc,
  open,
  onClose,
  onCropComplete,
  aspect: aspectProp = 1,
  title = 'Edit Image',
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState(aspectProp) // Default square aspect ratio for avatars
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  React.useEffect(() => {
    setAspect(aspectProp)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
  }, [aspectProp, imageSrc, open])

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop)
  }

  const onZoomChange = (zoom: number) => {
    setZoom(zoom)
  }

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (imageSrc && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
        if (croppedImage) {
          onCropComplete(croppedImage)
          onClose()
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="relative flex-1 bg-zinc-100 dark:bg-black rounded-md overflow-hidden min-h-[300px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={onZoomChange}
            classes={{
                containerClassName: 'bg-zinc-100 dark:bg-black',
                mediaClassName: '',
                cropAreaClassName: 'border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]',
            }}
          />
        </div>

        <div className="pt-4 space-y-4">
          <div className="space-y-2">
             <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Zoom</label>
             <Slider 
                value={[zoom]} 
                min={1} 
                max={3} 
                step={0.1} 
                onValueChange={(val) => onZoomChange(val[0])}
                className="py-2"
             />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-900 dark:text-white">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-medium">
              Save & Upload
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
