'use strict';
const assert = require('assert');
const { create } = require('../public/communication-pause.js');

function harness({ playing = true, paused = false, canPause = true } = {}) {
  const events = [];
  const state = { playing, paused, canPause };
  const ctl = create({
    isPlaying: () => state.playing,
    isPaused: () => state.paused,
    canPause: () => state.canPause,
    pause: () => { events.push('pause'); state.paused = true; },
    resume: () => { events.push('resume'); state.paused = false; },
  });
  return { ctl, state, events };
}

{
  const h = harness();
  h.ctl.open('chat');
  assert.deepStrictEqual(h.events, ['pause']);
  h.ctl.close('chat');
  assert.deepStrictEqual(h.events, ['pause', 'resume']);
}
{
  const h = harness();
  h.ctl.open('chat'); h.ctl.open('ai');
  assert.deepStrictEqual(h.events, ['pause']);
  h.ctl.close('chat');
  assert.deepStrictEqual(h.events, ['pause']);
  h.ctl.close('ai');
  assert.deepStrictEqual(h.events, ['pause', 'resume']);
}
{
  const h = harness({ paused: true });
  h.ctl.open('chat'); h.ctl.close('chat');
  assert.deepStrictEqual(h.events, []);
}
{
  const h = harness({ canPause: false });
  h.ctl.open('chat'); h.ctl.close('chat');
  assert.deepStrictEqual(h.events, []);
}

{
  const h = harness();
  h.ctl.open('chat');
  h.state.paused = false;
  h.ctl.close('chat');
  assert.deepStrictEqual(h.events, ['pause']);
  h.state.paused = true;
  h.ctl.sync();
  assert.deepStrictEqual(h.events, ['pause', 'resume']);
}
console.log('communication-pause: 5/5 passed');
