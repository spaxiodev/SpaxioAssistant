'use client';

import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AreaPixels = Area;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: AreaPixels,
  round: boolean
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  const size = Math.min(pixelCrop.width, pixelCrop.height);
  canvas.width = size;
  canvas.height = size;

  if (round) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const sx = pixelCrop.x * scaleX;
  const sy = pixelCrop.y * scaleY;
  const sWidth = pixelCrop.width * scaleX;
  const sHeight = pixelCrop.height * scaleY;

  // Draw the cropped region scaled to fill the (possibly circular) output
  const scale = Math.max(size / sWidth, size / sHeight);
  const drawWidth = sWidth * scale;
  const drawHeight = sHeight * scale;
  const dx = (size - drawWidth) / 2;
  const dy = (size - drawHeight) / 2;

  ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, drawWidth, drawHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/png',
      0.95
    );
  });
}

export interface WidgetLogoImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Object URL from the selected file (e.g. URL.createObjectURL(file)) */
  imageSrc: string | null;
  onComplete: (blob: Blob) => void;
  onCancel?: () => void;
}

export function WidgetLogoImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onComplete,
  onCancel,
}: WidgetLogoImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<AreaPixels | null>(null);
  const [applying, setApplying] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: AreaPixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setApplying(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, true);
      onComplete(blob);
      onOpenChange(false);
    } catch (e) {
      console.error('Crop failed', e);
    } finally {
      setApplying(false);
    }
  }, [imageSrc, croppedAreaPixels, onComplete, onOpenChange]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        className={cn('max-w-[min(90vw,480px)] overflow-hidden p-0')}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={handleCancel}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Crop and adjust widget logo</DialogTitle>
        </DialogHeader>
        <div className="relative h-[320px] w-full bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { backgroundColor: 'hsl(var(--muted))' },
              }}
            />
          )}
        </div>
        <div className="space-y-3 px-6 pb-2">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-2 w-full max-w-[200px] cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
            />
          </div>
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={handleCancel} className="rounded-lg">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!croppedAreaPixels || applying}
            className="rounded-lg"
          >
            {applying ? 'Applying...' : 'Use this image'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
