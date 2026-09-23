import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {route} from '../../src/rally/route';
import {RallyStore} from '../../src/rally/store';

test('supplied clue images exist and the acrostic retains its lines and stanza break', () => {
  const illustrated = route.stations.filter(s => s.hintImage);
  assert.deepEqual(illustrated.map(s => s.id).sort(), ['place-05','place-07','place-12','place-15'].sort());
  for (const s of illustrated) {
    assert.ok(existsSync(`public${s.hintImage!.src}`));
    assert.ok(s.hintImage!.width > 0 && s.hintImage!.height > 0);
    assert.ok(!s.hint.includes('(BILD)'));
  }
  const acrostic = route.stations.find(s => s.id === 'place-03')!;
  assert.equal(acrostic.hintLayout, 'verse');
  assert.equal(acrostic.hint.split('\n').filter(Boolean).map(line => line[0]).join(''), 'RAUSCHREISEN');
  assert.ok(acrostic.hint.includes('Zeichen.\n\nRichtung'));
});

test('each start exposes only the next clue and image, including return, and hides images before start and after finish', () => {
  for (let start = 0; start < route.stations.length; start++) {
    const store = new RallyStore(':memory:');
    try {
      const token = store.create(start + 1);
      assert.equal(store.view(token).run!.hintImage, undefined);
      for (let step = 0; step <= route.stations.length; step++) {
        const now = 1000 + step * 10000;
        const index = (start + step) % route.stations.length;
        const station = route.stations[index];
        if (step > 0) {
          const view = store.view(token, now).run!;
          assert.equal(view.hint, station.hint);
          assert.deepEqual(view.hintImage, station.hintImage);
          assert.equal(view.hintLayout, station.hintLayout);
          assert.equal(view.revealedTarget, null);
        }
        const challenge = store.challenge(token, now);
        const samples = [0,2500,5000].map(dt => ({lat:station.lat,lng:station.lng,accuracy:5,timestamp:now+dt}));
        store.confirm(token, challenge.nonce, samples, now + 6000);
      }
      const finished = store.view(token).run!;
      assert.equal(finished.status, 'finished');
      assert.equal(finished.hintImage, undefined);
      assert.equal(finished.hintLayout, undefined);
    } finally { store.close(); }
  }
});

test('Alte Post preserves the spreadsheet emphasis, including the unformatted final n', () => {
  const clue = route.stations.find(s => s.id === 'place-21')!;
  assert.equal(clue.hintParts!.map(p => p.text).join(''), clue.hint);
  assert.equal(clue.hintParts!.filter(p => p.bold).map(p => p.text).join(''), 'ollen16 Ost');
  assert.deepEqual(clue.hintParts!.filter(p => p.underline).map(p => p.text), ['16', 'Buchstabe']);
  assert.equal(clue.hintParts!.at(-1)!.text, 'n auf Papier.');
});
