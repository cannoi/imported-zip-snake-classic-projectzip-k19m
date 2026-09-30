'use strict';

function create(options = {}) {
  const openSources = new Set();
  let autoPaused = false;
  let resumePending = false;
  const isPlaying = options.isPlaying || (() => false);
  const isPaused = options.isPaused || (() => false);
  const canPause = options.canPause || (() => false);
  const pause = options.pause || (() => {});
  const resume = options.resume || (() => {});

  function open(source) {
    const key = String(source || 'communication');
    if (openSources.has(key)) return;
    const wasEmpty = openSources.size === 0;
    openSources.add(key);
    if (wasEmpty && isPlaying() && canPause() && !isPaused()) {
      pause();
      autoPaused = true;
    }
  }

  function close(source) {
    openSources.delete(String(source || 'communication'));
    if (openSources.size === 0 && autoPaused) {
      if (isPlaying() && isPaused()) resume();
      else if (isPlaying()) resumePending = true;
      else { autoPaused = false; resumePending = false; }
    }
  }

  function sync() {
    if (openSources.size === 0 && autoPaused && resumePending && isPlaying() && isPaused()) {
      resume();
      resumePending = false;
      autoPaused = false;
    }
  }

  function reset() {
    openSources.clear();
    autoPaused = false;
    resumePending = false;
  }

  return { open, close, sync, reset, isOpen: source => openSources.has(String(source || 'communication')) };
}

if (typeof module !== 'undefined') module.exports = { create };
if (typeof window !== 'undefined') window.SnakeCommunicationPause = { create };
