import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('vehicle-playback.js', root), 'utf8');
function fixture() {
  const timers = new Map(), audios = new Map(), played = [];
  let sequence = 0, closed = 0;
  const bgm = { volume: 0.25, muted: true, dataset: { normalVolume: '0.25' } };
  const context = { window: {}, setTimeout(fn, ms) { const id=++sequence; timers.set(id,{fn,ms}); return id; },
    clearTimeout(id) { timers.delete(id); } };
  vm.runInNewContext(source, context);
  const getAudio = src => {
    if (!audios.has(src)) audios.set(src, { currentTime: 0, paused: true,
      play() { this.paused=false; played.push(src); return this.fail ? Promise.reject(Error('unavailable')) : Promise.resolve(); },
      pause() { this.paused=true; } });
    return audios.get(src);
  };
  const player = context.window.createVehiclePlayback({ bgm, getAudio, onClose() { closed++; player.stop(); } });
  return { player,bgm,getAudio,played,timers, get closed() {return closed;},
    fire(ms) { const entry=[...timers].find(([,t])=>t.ms===ms); assert.ok(entry); timers.delete(entry[0]); entry[1].fn(); } };
}
{
  const f=fixture(); f.player.start('voice','se');
  assert.equal(f.bgm.volume,0.04); assert.equal(f.bgm.muted,true);
  f.getAudio('voice').onended(); assert.deepEqual(f.played,['voice','se']);
  assert.equal(f.bgm.volume,0.04);
  f.getAudio('se').onended(); assert.equal(f.bgm.volume,0.25);
  assert.equal(f.closed,0); f.fire(2000); assert.equal(f.closed,1);
}
{
  const f=fixture(); f.player.start('old','se');
  const stale=f.getAudio('old').onended;
  f.player.stop(); f.player.start('new','new-se'); stale();
  assert.deepEqual(f.played,['old','new']); assert.equal(f.getAudio('old').paused,true);
  f.getAudio('new').onended(); f.player.stop();
  assert.equal(f.getAudio('new-se').paused,true); assert.equal(f.timers.size,0);
}
{
  const f=fixture(); f.player.start('voice');
  f.getAudio('voice').onended();
  const stale=[...f.timers.values()][0].fn;
  f.player.stop(); f.player.start('new'); stale(); assert.equal(f.closed,0);
}
{
  const f=fixture(); f.getAudio('voice').fail=true; f.getAudio('se').fail=true;
  f.player.start('voice','se'); await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.played,['voice','se']); f.fire(2000); assert.equal(f.closed,1);
}
{
  const f=fixture(); f.player.start('voice','se');
  const callback=f.getAudio('voice').onended;
  f.getAudio('voice').onerror(); callback();
  assert.deepEqual(f.played,['voice','se']);
  f.fire(12000); f.fire(2000); assert.equal(f.closed,1);
}
for (const name of ['norimono.html','index.html']) {
  const html=readFileSync(new URL(name,root),'utf8');
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  for (const match of html.matchAll(/(?:src|data-se)="([^"]+)"/g)) {
    if (/^(https?:|data:)/.test(match[1])) continue;
    assert.ok(existsSync(fileURLToPath(new URL(match[1],root))),match[1]);
  }
}
new vm.Script(readFileSync(new URL('credits.js',root),'utf8'));
console.log('PASS: sequence, ducking, mute preservation, cancellation, stale events/timers, errors, timeout, syntax, asset paths');
