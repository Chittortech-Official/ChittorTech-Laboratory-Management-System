/**
 * ChittorTech QA Laboratory Management System
 * Sample ID Auto-Generation, Numeric Extraction & Duplicate Validation Helper
 */

/**
 * Extracts the numeric sequence from existing sample IDs (e.g. Sample-1, Sample-2, Sample 10)
 * and returns the next sequential ID in 'Sample-N' format.
 * Defaults to 'Sample-1' if no valid records exist yet.
 */
export function extractNextSampleId(sampleIds: (string | null | undefined)[]): string {
  let highestNumber = 0;

  for (const raw of sampleIds) {
    if (!raw) continue;
    const str = String(raw).trim();
    if (!str) continue;

    // 1. Primary: matches "Sample-1", "Sample 2", "sample_3", "SAMPLE-10", "Sample#4"
    const sampleMatch = str.match(/^sample[\s\-_#]*(\d+)/i);
    if (sampleMatch) {
      const num = parseInt(sampleMatch[1], 10);
      if (!isNaN(num) && num > highestNumber) {
        highestNumber = num;
      }
      continue;
    }

    // 2. Secondary: matches prefixes like "Batch-1", "S-2", "Test-3", or standalone digits "1", "2"
    // Ignores 4-digit years (>= 2000) so date-like entries don't skew the sequence
    const genericMatch = str.match(/^(?:batch|s|run|test|no\.?|#)?[\s\-_#]*(\d+)(?:[^\d]|$)/i);
    if (genericMatch) {
      const num = parseInt(genericMatch[1], 10);
      if (!isNaN(num) && num < 2000 && num > highestNumber) {
        highestNumber = num;
      }
    }
  }

  return `Sample-${highestNumber + 1}`;
}

/**
 * Validates whether a given Sample ID already exists for the same test date and plant category.
 */
export function checkIsDuplicateSampleId(
  sampleId: string,
  testDate: string,
  category: string,
  existingRecords: { sample_id?: string; test_date: string; category: string }[]
): boolean {
  if (!sampleId || !sampleId.trim()) return false;
  const targetId = sampleId.trim().toLowerCase();
  const targetCategory = category.trim().toLowerCase();
  const targetDate = testDate.trim();

  return existingRecords.some(
    (r) =>
      r.test_date === targetDate &&
      (r.category || '').trim().toLowerCase() === targetCategory &&
      (r.sample_id || '').trim().toLowerCase() === targetId
  );
}
