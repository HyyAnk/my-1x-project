import type React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { MascotProfile } from '@studio/shared';
import { LanguageProvider } from '../../../i18n';
import { useMascotLibrary } from './useMascotLibrary';
import { api } from '../../../api';

vi.mock('../../../api', () => ({
  api: {
    mascots: vi.fn(),
    deleteMascot: vi.fn(),
    importMascotZip: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const mockMascots: MascotProfile[] = [
  {
    id: 'mascot_new',
    name: 'New Mascot',
    description: 'Created second',
    visual_style: 'pixar_3d',
    master_prompt: '',
    master_image_url: null,
    color_theme: '#06b6d4',
    actions: {},
    assigned_channel_ids: [],
    created_at: '2026-06-01T12:00:00.000Z',
    updated_at: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 'mascot_old',
    name: 'Old Mascot',
    description: 'Created first',
    visual_style: 'pixar_3d',
    master_prompt: '',
    master_image_url: null,
    color_theme: '#06b6d4',
    actions: {},
    assigned_channel_ids: [],
    created_at: '2026-01-01T10:00:00.000Z',
    updated_at: '2026-08-01T10:00:00.000Z',
  },
];

describe('useMascotLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.mascots).mockResolvedValue({ mascots: mockMascots });
  });

  it('fetches and sorts mascots in chronological order (old -> new, oldest first)', async () => {
    const onNotice = vi.fn();
    const onRefreshChannels = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useMascotLibrary({ onNotice, onRefreshChannels }), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.filteredMascots).toHaveLength(2);
    });

    expect(result.current.filteredMascots[0].id).toBe('mascot_old');
    expect(result.current.filteredMascots[0].name).toBe('Old Mascot');
    expect(result.current.filteredMascots[1].id).toBe('mascot_new');
    expect(result.current.filteredMascots[1].name).toBe('New Mascot');
  });
});
