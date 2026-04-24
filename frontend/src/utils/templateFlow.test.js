import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTemplateFieldState,
  buildTemplatePayload,
  buildTemplateDownloadName,
  getMissingRequiredTemplateFields,
} from './templateFlow.js';

test('buildTemplateFieldState creates controlled inputs for every template field', () => {
  const template = {
    alanlar: [
      { ad: 'kiraci_ad_soyad' },
      { ad: 'mal_sahibi_ad_soyad' },
    ],
  };

  assert.deepEqual(buildTemplateFieldState(template), {
    kiraci_ad_soyad: '',
    mal_sahibi_ad_soyad: '',
  });
});

test('buildTemplatePayload trims values and omits blank optional fields', () => {
  const payload = buildTemplatePayload({
    fields: {
      kiraci_ad_soyad: '  Ali Yılmaz ',
      depozito: '   ',
      sure_ay: ' 12 ',
    },
  });

  assert.deepEqual(payload, {
    alanlar: {
      kiraci_ad_soyad: 'Ali Yılmaz',
      sure_ay: '12',
    },
  });
});

test('buildTemplateDownloadName creates a stable pdf name from the template id', () => {
  assert.equal(buildTemplateDownloadName('kira_sozlesmesi'), 'kira_sozlesmesi.pdf');
});

test('getMissingRequiredTemplateFields returns trimmed blank required fields only', () => {
  const template = {
    alanlar: [
      { ad: 'kiraci_ad_soyad', etiket: 'Kiracı Adı Soyadı', zorunlu: true },
      { ad: 'adres', etiket: 'Kiralanan Adres', zorunlu: true },
      { ad: 'depozito', etiket: 'Depozito', zorunlu: false },
    ],
  };

  assert.deepEqual(
    getMissingRequiredTemplateFields(template, {
      kiraci_ad_soyad: '  Ali Yılmaz ',
      adres: '   ',
      depozito: '',
    }),
    ['Kiralanan Adres'],
  );
});
