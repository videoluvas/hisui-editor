// ImageCapture is a newer Web API not yet included in TypeScript's dom lib
declare class ImageCapture {
  constructor(track: MediaStreamTrack);
  grabFrame(): Promise<ImageBitmap>;
  takePhoto(): Promise<Blob>;
}
