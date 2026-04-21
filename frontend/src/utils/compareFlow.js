export function pickFirstPdfFile(fileList) {
  if (!fileList) return null;

  const files = Array.from(fileList);
  return files[0] || null;
}

export function buildCompareRequest({ file1, file2, question, language = 'tr' }) {
  if (!file1 || !file2) {
    throw new Error('İki PDF dosyası gerekli.');
  }

  return {
    dosya1: file1,
    dosya2: file2,
    soru: question.trim(),
    language,
  };
}
