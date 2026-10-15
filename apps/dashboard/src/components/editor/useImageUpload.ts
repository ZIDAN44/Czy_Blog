'use client';
import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

// Opens a file picker, uploads the chosen image, and inserts it at the cursor.
export function useImageUpload(editor: Editor) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      setUploading(true);
      try {
        const { url } = await api<{ url: string }>('/api/v1/media/upload', {
          method: 'POST',
          body: fd,
        });
        editor.chain().focus().setImage({ src: url }).run();
      } catch (e) {
        toast({ title: 'Upload failed', message: (e as Error).message, tone: 'error' });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }, [editor, toast]);

  return { uploading, pickAndUpload };
}
