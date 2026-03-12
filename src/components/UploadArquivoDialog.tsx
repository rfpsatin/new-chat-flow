import React, { useCallback, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEnviarArquivo } from '@/hooks/useMensagens';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Upload, File as FileIcon, AlertCircle } from 'lucide-react';

interface UploadArquivoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  conversaId: string;
  contatoId: string | null;
  remetenteId: string | null;
  whatsappNumero: string | null;
  canRespond: boolean;
}

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function UploadArquivoDialog({
  open,
  onOpenChange,
  empresaId,
  conversaId,
  contatoId,
  remetenteId,
  whatsappNumero,
  canRespond,
}: UploadArquivoDialogProps) {
  const { toast } = useToast();
  const enviarArquivo = useEnviarArquivo();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setError(null);
    setIsDragging(false);
  }, []);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && enviarArquivo.isPending) {
      return;
    }
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const validateFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Arquivo maior que ${MAX_FILE_SIZE_MB}MB. Selecione um arquivo menor.`);
    }
  };

  const handleSelectFile = (f: File | null) => {
    if (!f) return;
    try {
      validateFile(f);
      setFile(f);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Arquivo inválido';
      setError(message);
      toast({
        title: 'Arquivo inválido',
        description: message,
        variant: 'destructive',
      });
      setFile(null);
    }
  };

  const onFileInputChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const f = event.target.files?.[0] ?? null;
    handleSelectFile(f);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const f = event.dataTransfer.files?.[0] ?? null;
    handleSelectFile(f);
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleSubmit: React.FormEventHandler = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Selecione um arquivo para enviar.');
      return;
    }
    if (!contatoId || !remetenteId || !whatsappNumero) {
      setError('Não foi possível identificar o contato ou atendente.');
      return;
    }
    try {
      setError(null);
      await enviarArquivo.mutateAsync({
        empresaId,
        conversaId,
        contato_id: contatoId,
        remetenteId,
        file,
        whatsapp_numero: whatsappNumero,
      });
      toast({
        title: 'Arquivo enviado',
        description: 'O arquivo foi enviado para o cliente.',
      });
      resetState();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar arquivo';
      setError(message);
      toast({
        title: 'Erro ao enviar arquivo',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const disabled =
    !canRespond || !contatoId || !remetenteId || enviarArquivo.isPending || !file;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar arquivo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-md border border-dashed px-4 py-6 text-center transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/40',
            )}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                Arraste e solte um arquivo aqui
              </p>
              <p className="text-xs text-muted-foreground">
                ou clique no botão abaixo para selecionar
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={onFileInputChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={!canRespond || enviarArquivo.isPending}
            >
              Escolher arquivo
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Tamanho máximo: {MAX_FILE_SIZE_MB}MB. Tipos comuns: documentos, imagens e áudios.
            </p>
          </div>

          {file && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
              <FileIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setFile(null)}
                disabled={enviarArquivo.isPending}
              >
                Remover
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
              <p>{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={enviarArquivo.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={disabled}
            >
              {enviarArquivo.isPending ? 'Enviando...' : 'Enviar arquivo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

