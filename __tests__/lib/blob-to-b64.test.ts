import { convertBlobToBase64 } from '@/lib/blob-to-b64';

// Mock implementation for FileReader
class MockFileReader {
  result: string = '';
  onloadend: () => void = () => {};
  onerror: (error: Error) => void = () => {};

  readAsDataURL(blob: Blob) {
    // Simulate async nature of FileReader
    setTimeout(() => {
      // Create a fake data URL based on the blob type
      this.result = `data:${blob.type};base64,mock-base64-content`;
      this.onloadend();
    }, 0);
  }
}

describe('Blob to Base64 Conversion', () => {
  let originalFileReader: typeof FileReader;

  beforeAll(() => {
    // Store the original FileReader
    originalFileReader = global.FileReader;
    // Replace with our mock
    global.FileReader = MockFileReader as any;
  });

  afterAll(() => {
    // Restore the original FileReader
    global.FileReader = originalFileReader;
  });

  test('converts blob to base64 string', async () => {
    // Create a mock blob
    const mockBlob = new Blob(['test content'], { type: 'text/plain' });
    
    // Call the function
    const result = await convertBlobToBase64(mockBlob);
    
    // Check the result matches our mock implementation's pattern
    expect(result).toBe('data:text/plain;base64,mock-base64-content');
  });

  test('handles different MIME types', async () => {
    // Test with different MIME types
    const imageBlob = new Blob(['fake-image-data'], { type: 'image/png' });
    const pdfBlob = new Blob(['fake-pdf-data'], { type: 'application/pdf' });
    
    const imageResult = await convertBlobToBase64(imageBlob);
    const pdfResult = await convertBlobToBase64(pdfBlob);
    
    expect(imageResult).toBe('data:image/png;base64,mock-base64-content');
    expect(pdfResult).toBe('data:application/pdf;base64,mock-base64-content');
  });

  test('rejects when FileReader encounters an error', async () => {
    // Create a blob
    const mockBlob = new Blob(['test content'], { type: 'text/plain' });
    
    // Override the readAsDataURL method to simulate an error
    jest.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementationOnce(function(this: any) {
      setTimeout(() => {
        this.onerror(new Error('Mock FileReader error'));
      }, 0);
    });
    
    // Check that the promise is rejected
    await expect(convertBlobToBase64(mockBlob)).rejects.toThrow('Mock FileReader error');
  });
}); 