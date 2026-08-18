import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReportScreen from '../components/ReportScreen';
import { I18nProvider } from '../i18n';
import { createInitialState, defaultConfig } from '../state/gameReducer';
import { GameProvider } from '../state/GameContext';
import type { GameState } from '../state/types';

// The canvas is stubbed out under jsdom (see setupTests), so the renderer is
// replaced wholesale: what these tests are about is what happens to the blob
// once it exists, not the pixels.
const renderReportCard = vi.hoisted(() => vi.fn());
vi.mock('../components/reportCardImage', () => ({ renderReportCard }));

const STORAGE_KEY = 'ultimate-scorekeeper:game-state';

function baseState(): GameState {
  const state = createInitialState(structuredClone(defaultConfig));
  state.phase = 'report';
  state.status = 'finished';
  state.config.teams = {
    A: { name: 'Foxes', color: '#ff0000' },
    B: { name: 'Los Búhos', color: '#0000ff' },
  };
  state.scores = { A: 15, B: 12 };
  return state;
}

function renderReport(state: GameState = baseState()) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return render(
    <I18nProvider>
      <GameProvider>
        <ReportScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

/** The handler settles the blob promise after the click, so the resulting state update needs act(). */
async function clickButton(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}
const clickShare = () => clickButton('Share');

let share: ReturnType<typeof vi.fn>;
let canShare: ReturnType<typeof vi.fn>;
let anchorClick: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  renderReportCard.mockReset();
  renderReportCard.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));

  share = vi.fn().mockResolvedValue(undefined);
  canShare = vi.fn().mockReturnValue(true);
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true });

  // jsdom implements neither, and the download fallback uses both.
  URL.createObjectURL = vi.fn().mockReturnValue('blob:report');
  URL.revokeObjectURL = vi.fn();
  anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  anchorClick.mockRestore();
});

describe('report screen — share as image', () => {
  it('hands the Web Share sheet a PNG file, not the report text', async () => {
    renderReport();
    await clickShare();
    await vi.waitFor(() => expect(share).toHaveBeenCalled());

    const payload = share.mock.calls[0][0] as { files: File[]; title: string };
    expect(payload.files).toHaveLength(1);
    expect(payload.files[0].type).toBe('image/png');
    expect(payload.title).toBe('Foxes 15 — 12 Los Búhos');
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('names the file after both teams and the score, stripped down to ASCII', async () => {
    renderReport();
    await clickShare();
    await vi.waitFor(() => expect(share).toHaveBeenCalled());

    const { files } = share.mock.calls[0][0] as { files: File[] };
    expect(files[0].name).toBe('foxes-15-12-los-buhos.png');
  });

  it('falls back to downloading the PNG when the browser cannot share files', async () => {
    canShare.mockReturnValue(false);
    renderReport();
    await clickShare();

    await screen.findByText('Image saved');
    expect(share).not.toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('downloads the PNG when the share sheet itself errors', async () => {
    share.mockRejectedValue(new DOMException('nope', 'NotAllowedError'));
    renderReport();
    await clickShare();

    await screen.findByText('Image saved');
    expect(anchorClick).toHaveBeenCalled();
  });

  it('does nothing when the share sheet is dismissed — a decision, not a failure', async () => {
    share.mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    renderReport();
    await clickShare();

    await vi.waitFor(() => expect(share).toHaveBeenCalled());
    expect(anchorClick).not.toHaveBeenCalled();
    expect(screen.queryByText('Image saved')).toBeNull();
    expect(screen.queryByText("Couldn't create the image")).toBeNull();
  });

  it('says so when the image could not be drawn at all', async () => {
    renderReportCard.mockResolvedValue(null);
    renderReport();
    await clickShare();

    await screen.findByText("Couldn't create the image");
    expect(share).not.toHaveBeenCalled();
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('renders the image up front so the share tap does not have to wait for it', async () => {
    renderReport();
    // Web Share only survives a user gesture that has not been awaited on Safari,
    // so the blob has to already exist by the time the button is pressed.
    await vi.waitFor(() => expect(renderReportCard).toHaveBeenCalled());

    await clickShare();
    await vi.waitFor(() => expect(share).toHaveBeenCalled());
    expect(renderReportCard).toHaveBeenCalledTimes(1);
  });

  it('reaches navigator.share inside the click itself, with no await in front of it', async () => {
    renderReport();
    // Let the up-front render settle, the way it would well before a human taps.
    await act(async () => {});

    // Deliberately not awaited: a browser only honours share() while the tap's
    // user activation is alive, so it has to have been called by the time the
    // click handler returns. Awaiting anything first is what sends a phone down
    // the download path instead of opening the share sheet.
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalled();

    await act(async () => {});
  });

  it('still tries to share on a browser that has share() but no canShare()', async () => {
    // Refusing here would demote a phone that can share to the download fallback.
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
    renderReport();
    await clickShare();

    await vi.waitFor(() => expect(share).toHaveBeenCalled());
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('keeps copying the full text, log and all, on the other button', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    renderReport();
    await clickButton('Copy to clipboard');
    await screen.findByText('Copied!');

    expect(writeText.mock.calls[0][0]).toContain('Game summary');
  });
});
