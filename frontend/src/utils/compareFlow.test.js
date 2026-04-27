import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCompareRequest,
  pickFirstPdfFile,
  shouldClearCompareResult,
} from './compareFlow.js';

test('pickFirstPdfFile returns the first real file object from a dropped file list', () => {
  const file = { name: 'kira.pdf', size: 128, type: 'application/pdf' };
  assert.equal(pickFirstPdfFile([file]), file);
});

test('buildCompareRequest keeps both File objects and trims the optional question', () => {
  const file1 = { name: 'v1.pdf' };
  const file2 = { name: 'v2.pdf' };

  assert.deepEqual(
    buildCompareRequest({
      file1,
      file2,
      question: '  farkları özetle ',
      language: 'tr',
    }),
    {
      dosya1: file1,
      dosya2: file2,
      soru: 'farkları özetle',
      language: 'tr',
    },
  );
});

test('shouldClearCompareResult clears stale analysis when a compared file is removed or replaced', () => {
  const file = { name: 'v1.pdf' };
  const replacement = { name: 'v2.pdf' };

  assert.equal(shouldClearCompareResult({ previousFile: file, nextFile: null }), true);
  assert.equal(shouldClearCompareResult({ previousFile: file, nextFile: replacement }), true);
  assert.equal(shouldClearCompareResult({ previousFile: file, nextFile: file }), false);
});
