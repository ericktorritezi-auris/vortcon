'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Modal } from '@/shared/ui';

const TOUR_HIGHLIGHTS = [
  'Registre suas receitas e despesas em Transações.',
  'Organize tudo com categorias e tags — as mesmas para entradas e saídas.',
  'Acompanhe seu saldo real e projetado aqui no Dashboard.',
];

/** Tour (Seção 85) — pode ser pulado. Dispensa persistida, nunca reaparece depois. */
export function TourModal(): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleDismiss(): Promise<void> {
    setLoading(true);
    try {
      await fetch('/api/onboarding/tour/dismiss', { method: 'POST' });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleDismiss} title="Bem-vindo à VortCon">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-secondary">Um tour rápido pelo essencial:</p>
        <ul className="flex flex-col gap-2 text-sm text-ink-primary">
          {TOUR_HIGHLIGHTS.map((highlight) => (
            <li key={highlight} className="flex gap-2">
              <span className="text-brand-flow">•</span>
              {highlight}
            </li>
          ))}
        </ul>
        <Button onClick={handleDismiss} loading={loading} className="w-full">
          Entendi, vamos lá
        </Button>
      </div>
    </Modal>
  );
}
