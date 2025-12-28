// =============================================================================
// RECORDS SERVICE - Barrel export
// =============================================================================

export {
  detectRecords,
  detectRecordsForNewVideo,
  fetchExerciseHistory,
  calculateEstimated1RM,
  formatWeight,
  formatLift,
} from './recordDetection';

export type {
  RecordType,
  DetectedRecord,
  RecordDetectionResult,
  RecordDetectionInput,
  VideoForRecordComparison,
} from './recordDetection';
