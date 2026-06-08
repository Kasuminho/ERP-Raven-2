'use client';

import { Upload } from 'lucide-react';
import { ChangeEvent, ClipboardEvent, DragEvent, InputHTMLAttributes, KeyboardEvent, useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';

type FileUploadButtonProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  label: string;
  onFileSelect: (files: FileList | null) => void;
};

type PasteTarget = {
  id: string;
  onFileSelect: (files: FileList | null) => void;
  disabled?: boolean;
};

const pasteTargets = new Map<string, PasteTarget>();
let activePasteTargetId: string | null = null;

export function FileUploadButton({ className, label, onFileSelect, accept = 'image/*', ...props }: FileUploadButtonProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const disabled = Boolean(props.disabled);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onFileSelect(event.target.files);
    event.target.value = '';
  }

  function filesFromClipboard(event: ClipboardEvent<HTMLDivElement>): FileList | null {
    const directFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'));

    if (directFiles.length > 0) {
      return toFileList(directFiles);
    }

    const itemFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    return itemFiles.length > 0 ? toFileList(itemFiles) : null;
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const files = filesFromClipboard(event);

    if (!files?.length) {
      return;
    }

    event.preventDefault();
    onFileSelect(files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }

    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));

    if (files.length === 0) {
      return;
    }

    event.preventDefault();
    onFileSelect(toFileList(files));
  }

  useEffect(() => {
    pasteTargets.set(id, { id, onFileSelect, disabled });

    function handleWindowPaste(event: globalThis.ClipboardEvent) {
      const files = filesFromNativeClipboard(event);

      if (!files?.length) {
        return;
      }

      const enabledTargets = Array.from(pasteTargets.values()).filter((target) => !target.disabled);
      const activeTarget = activePasteTargetId ? pasteTargets.get(activePasteTargetId) : undefined;
      const target = activeTarget && !activeTarget.disabled ? activeTarget : enabledTargets.length === 1 ? enabledTargets[0] : undefined;

      if (!target || target.id !== id) {
        return;
      }

      event.preventDefault();
      target.onFileSelect(files);
    }

    window.addEventListener('paste', handleWindowPaste);

    return () => {
      window.removeEventListener('paste', handleWindowPaste);
      pasteTargets.delete(id);
      if (activePasteTargetId === id) {
        activePasteTargetId = null;
      }
    };
  }, [disabled, id, onFileSelect]);

  function handleKeyDown(event: KeyboardEvent<HTMLLabelElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      document.getElementById(id)?.click();
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn('flex w-full justify-center', className)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onFocus={() => { activePasteTargetId = id; }}
      onMouseEnter={() => { activePasteTargetId = id; }}
      onPaste={handlePaste}
    >
      <input id={id} className="sr-only" type="file" accept={accept} onChange={handleChange} {...props} />
      <label
        htmlFor={id}
        tabIndex={0}
        onClick={() => rootRef.current?.focus()}
        onKeyDown={handleKeyDown}
        className="inline-flex min-h-10 w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary/45 bg-primary/10 px-4 py-2 text-center text-sm font-semibold text-primary transition hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/60"
      >
        <Upload className="h-4 w-4" />
        {label}
      </label>
    </div>
  );
}

function filesFromNativeClipboard(event: globalThis.ClipboardEvent): FileList | null {
  if (!event.clipboardData) {
    return null;
  }

  const directFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'));

  if (directFiles.length > 0) {
    return toFileList(directFiles);
  }

  const itemFiles = Array.from(event.clipboardData.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));

  return itemFiles.length > 0 ? toFileList(itemFiles) : null;
}

function toFileList(files: File[]): FileList {
  const transfer = new DataTransfer();

  for (const file of files) {
    transfer.items.add(file);
  }

  return transfer.files;
}
