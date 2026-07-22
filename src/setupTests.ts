import '@testing-library/jest-dom';

// jsdom has no layout, so scrolling is unimplemented and every call logs a stack
// trace. The guide screen scrolls itself to the top on mount; stub it out so that
// is silent rather than noise on every test run.
window.scrollTo = () => {};
