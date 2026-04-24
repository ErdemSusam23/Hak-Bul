export function buildTemplateFieldState(template) {
  return Object.fromEntries((template?.alanlar || []).map((field) => [field.ad, '']));
}

export function buildTemplatePayload({ fields }) {
  const alanlar = Object.fromEntries(
    Object.entries(fields || {})
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value),
  );

  return { alanlar };
}

export function getMissingRequiredTemplateFields(template, fields) {
  return (template?.alanlar || [])
    .filter((field) => field.zorunlu && !(fields?.[field.ad] || '').trim())
    .map((field) => field.etiket || field.ad);
}

export function buildTemplateDownloadName(templateId) {
  return `${templateId}.pdf`;
}
