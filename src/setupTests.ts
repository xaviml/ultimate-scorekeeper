import '@testing-library/jest-dom';

// jsdom has no layout, so scrolling is unimplemented and every call logs a stack
// trace. The guide screen scrolls itself to the top on mount; stub it out so that
// is silent rather than noise on every test run.
window.scrollTo = () => {};

// jsdom has no matchMedia at all. usePwaInstall (behind InstallBanner, mounted by
// App) calls it on every render to detect standalone display mode; without a stub
// any test that renders App throws instead of just seeing "not installed".
window.matchMedia ??= () =>
  ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;

// jsdom ships canvas as a stub that logs "Not implemented" for every getContext
// call unless the (native, heavy) `canvas` package is installed. The report card
// renders itself as soon as the report screen mounts, so without this every
// report test would print that trace. Returning null is what the real code
// already treats as "no canvas here" — see drawReportCard.
HTMLCanvasElement.prototype.getContext = () => null;
HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback) {
  callback(null);
};
