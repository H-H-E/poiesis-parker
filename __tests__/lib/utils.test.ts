import { cn, formatDate, getMediaTypeFromDataURL, getBase64FromDataURL } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn', () => {
    test('merges class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', { class2: true, class3: false })).toBe('class1 class2');
      expect(cn('class1', ['class2', 'class3'])).toBe('class1 class2 class3');
    });

    test('handles tailwind conflicts correctly', () => {
      expect(cn('p-4', 'p-8')).toBe('p-8');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
      expect(cn('m-2 p-2', 'm-4')).toBe('p-2 m-4');
    });
  });

  describe('formatDate', () => {
    test('formats date strings correctly', () => {
      expect(formatDate('2023-01-15')).toBe('January 15, 2023');
      expect(formatDate('2023-12-31T23:59:59Z')).toMatch(/December 31, 2023/);
    });

    test('formats Date objects correctly', () => {
      const date = new Date(2023, 5, 15); // June 15, 2023
      expect(formatDate(date)).toBe('June 15, 2023');
    });

    test('formats timestamps correctly', () => {
      const timestamp = 1673740800000; // January 15, 2023
      expect(formatDate(timestamp)).toBe('January 15, 2023');
    });
  });

  describe('getMediaTypeFromDataURL', () => {
    test('extracts media type from data URL', () => {
      expect(getMediaTypeFromDataURL('data:image/png;base64,abc123')).toBe('image/png');
      expect(getMediaTypeFromDataURL('data:application/pdf;base64,xyz789')).toBe('application/pdf');
      expect(getMediaTypeFromDataURL('data:text/plain;base64,hello')).toBe('text/plain');
    });

    test('returns null for invalid data URLs', () => {
      expect(getMediaTypeFromDataURL('not-a-data-url')).toBeNull();
      expect(getMediaTypeFromDataURL('')).toBeNull();
      expect(getMediaTypeFromDataURL('image/png;base64,abc123')).toBeNull();
    });
  });

  describe('getBase64FromDataURL', () => {
    test('extracts base64 content from data URL', () => {
      expect(getBase64FromDataURL('data:image/png;base64,abc123')).toBe('abc123');
      expect(getBase64FromDataURL('data:application/pdf;base64,xyz789')).toBe('xyz789');
      expect(getBase64FromDataURL('data:text/plain;base64,hello')).toBe('hello');
    });

    test('returns null for invalid data URLs', () => {
      expect(getBase64FromDataURL('not-a-data-url')).toBeNull();
      expect(getBase64FromDataURL('')).toBeNull();
      expect(getBase64FromDataURL('data:image/png')).toBeNull();
    });
  });
}); 