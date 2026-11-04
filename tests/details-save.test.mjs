import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { interactiveTsxPage } from '../scripts/generate-page.mjs';

const page = interactiveTsxPage({ generatedAt: new Date().toISOString(), services: [] }, { desktop: true });
const save = page.match(/const saveDetails = \(\) => \{([\s\S]*?)\n  \};/)[1];

function runSave(fails = false) {
  const details = { subtitle: 'Web Hosting', use: 'Hosts the app', account: '', passwordLocation: '' };
  const result = {};
  vm.runInNewContext('(() => {' + save + '})()', {
    selectedId: 'netlify', drafts: { netlify: details }, savedDetails: { github: details },
    detailsKey: 'servicemap:details:example',
    localStorage: { setItem(key, value) { if (fails) throw new Error('Storage full'); result.key = key; result.stored = JSON.parse(value); } },
    setSavedDetails(value) { result.saved = value; },
    setSaveError(value) { result.error = value; },
    setSelectedId(value) { result.selected = value; },
  });
  return result;
}

test('Save changes persists all edited fields, preserves other services, and closes after success', () => {
  assert.match(page, /className="save-button" onClick=\{onSave\}/);
  assert.match(page, /onSave=\{saveDetails\}/);
  const result = runSave();
  assert.equal(result.stored.netlify.subtitle, 'Web Hosting');
  assert.equal(result.stored.netlify.use, 'Hosts the app');
  assert.ok(result.stored.github);
  assert.equal(result.selected, null);
  assert.equal(result.error, '');
});

test('Save failure keeps the editor open and surfaces an error', () => {
  const result = runSave(true);
  assert.match(result.error, /Could not save/);
  assert.equal(result.selected, undefined);
  assert.equal(result.saved, undefined);
});
