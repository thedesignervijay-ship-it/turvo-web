import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState, EmptyState } from '../components/ui/Feedback.js';
import { Button } from '../components/ui/Button.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import { useToast } from '../components/ui/Toast.js';
import { listImages, uploadImage, reorderImages, removeImage } from '../services/turfImages.service.js';
import type { TurfImageDto } from '../types/domain.js';

export function TurfImagesPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<TurfImageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setImages(await listImages(id!));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load turf images.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadImage(id!, file);
      toast.success('Image uploaded.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to upload the image.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleSetPrimary = async (image: TurfImageDto) => {
    try {
      await reorderImages(id!, { imageIds: images.map((i) => i.id), primaryImageId: image.id });
      toast.success('Primary image updated.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to set the primary image.');
    }
  };

  const handleRemove = (image: TurfImageDto) => {
    confirm({
      title: 'Remove image',
      message: 'Remove this image from the turf?',
      confirmLabel: 'Remove',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await removeImage(id!, image.id);
          toast.success('Image removed.');
          await load();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Unable to remove the image.');
        }
      },
    });
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const item = next[index]!;
    next[index] = next[target]!;
    next[target] = item;
    try {
      await reorderImages(id!, { imageIds: next.map((i) => i.id) });
      setImages(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to reorder images.');
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Turf images"
        subtitle="Upload photos of the turf. The primary image is shown first."
        actions={
          <>
            <Link className="btn btn--ghost" to={`/turfs/${id}`}>Back to turf</Link>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleUpload} />
            <Button loading={uploading} onClick={() => fileInput.current?.click()}>Upload image</Button>
          </>
        }
      />

      {images.length === 0 ? (
        <EmptyState title="No images yet" message="Upload images to showcase your turf to customers." />
      ) : (
        <div className="image-grid">
          {images.map((image, index) => (
            <figure key={image.id} className="image-card">
              {image.url ? <img src={image.url} alt={image.isPrimary ? 'Primary turf image' : 'Turf image'} /> : <div className="image-card__placeholder">Image</div>}
              <figcaption className="image-card__actions">
                {image.isPrimary && <span className="badge badge--success">Primary</span>}
                <div className="row-actions">
                  {!image.isPrimary && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetPrimary(image)}>Set primary</Button>
                  )}
                  <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => move(index, -1)}>Move up</Button>
                  <Button variant="ghost" size="sm" disabled={index === images.length - 1} onClick={() => move(index, 1)}>Move down</Button>
                  <Button variant="danger" size="sm" onClick={() => handleRemove(image)}>Remove</Button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {dialog}
    </div>
  );
}
