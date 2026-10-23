import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../middleware/upload', () => ({ saveImageToDisk: vi.fn() }));
vi.mock('../repositories/attraction', () => ({
  verifyBelongsToTrip: vi.fn(),
}));
vi.mock('../repositories/connectionRepository', () => ({
  verifyBelongsToTrip: vi.fn(),
}));
vi.mock('../repositories/imageRepository', () => ({
  addAttractionImage: vi.fn(),
  addConnectionImage: vi.fn(),
  addDayImage: vi.fn(),
  addTripImage: vi.fn(),
  deleteAttractionImage: vi.fn(),
  deleteConnectionImage: vi.fn(),
  deleteDayImage: vi.fn(),
  deleteTripImage: vi.fn(),
}));
vi.mock('../repositories/trip', () => ({
  findById: vi.fn(),
  findDayByIdAndTripId: vi.fn(),
}));

import { saveImageToDisk } from '../middleware/upload';
import * as attractionRepo from '../repositories/attraction';
import * as connectionRepo from '../repositories/connectionRepository';
import * as imageRepo from '../repositories/imageRepository';
import * as tripRepo from '../repositories/trip';
import { makeTrip } from '../test-utils/fixtures';
import { createMockReqRes, expectJsonStatus } from '../test-utils/httpMocks';
import type { ImageResponse } from '../types/trip';

import {
  deleteAttractionImage,
  deleteConnectionImage,
  deleteDayImage,
  deleteTripImage,
  uploadAttractionImage,
  uploadConnectionImage,
  uploadDayImage,
  uploadTripImage,
} from './imageController';

const mockFile = {
  buffer: Buffer.from('fake-image-bytes'),
  mimetype: 'image/jpeg',
} as Express.Multer.File;

const sampleTrip = makeTrip();

interface Variant {
  kind: 'attraction' | 'connection' | 'trip' | 'day';
  notFoundError: string;
  parentId: number;
  imageId: number;
  uploadParams: Record<string, string>;
  deleteParams: Record<string, string>;
  uploadHandler: (req: Request, res: Response) => Promise<void>;
  deleteHandler: (req: Request, res: Response) => Promise<void>;
  /** Stubs whatever parent-existence check the handler uses. */
  mockParentFound: (found: boolean) => void;
  mockParentRejects: (err: Error) => void;
  addImage:
    | typeof imageRepo.addAttractionImage
    | typeof imageRepo.addConnectionImage
    | typeof imageRepo.addTripImage
    | typeof imageRepo.addDayImage;
  deleteImage:
    | typeof imageRepo.deleteAttractionImage
    | typeof imageRepo.deleteConnectionImage
    | typeof imageRepo.deleteTripImage
    | typeof imageRepo.deleteDayImage;
}

const variants: Variant[] = [
  {
    kind: 'attraction',
    notFoundError: 'Attraction not found',
    parentId: 5,
    imageId: 7,
    uploadParams: { tripId: '1', attractionId: '5' },
    deleteParams: { tripId: '1', attractionId: '5', imageId: '7' },
    uploadHandler: uploadAttractionImage,
    deleteHandler: deleteAttractionImage,
    mockParentFound: found =>
      vi.mocked(attractionRepo.verifyBelongsToTrip).mockResolvedValue(found),
    mockParentRejects: err =>
      vi.mocked(attractionRepo.verifyBelongsToTrip).mockRejectedValue(err),
    addImage: imageRepo.addAttractionImage,
    deleteImage: imageRepo.deleteAttractionImage,
  },
  {
    kind: 'connection',
    notFoundError: 'Connection not found',
    parentId: 5,
    imageId: 7,
    uploadParams: { tripId: '1', connectionId: '5' },
    deleteParams: { tripId: '1', connectionId: '5', imageId: '7' },
    uploadHandler: uploadConnectionImage,
    deleteHandler: deleteConnectionImage,
    mockParentFound: found =>
      vi.mocked(connectionRepo.verifyBelongsToTrip).mockResolvedValue(found),
    mockParentRejects: err =>
      vi.mocked(connectionRepo.verifyBelongsToTrip).mockRejectedValue(err),
    addImage: imageRepo.addConnectionImage,
    deleteImage: imageRepo.deleteConnectionImage,
  },
  {
    kind: 'trip',
    notFoundError: 'Trip not found',
    parentId: 1,
    imageId: 7,
    uploadParams: { tripId: '1' },
    deleteParams: { tripId: '1', imageId: '7' },
    uploadHandler: uploadTripImage,
    deleteHandler: deleteTripImage,
    mockParentFound: found =>
      vi.mocked(tripRepo.findById).mockResolvedValue(found ? sampleTrip : null),
    mockParentRejects: err =>
      vi.mocked(tripRepo.findById).mockRejectedValue(err),
    addImage: imageRepo.addTripImage,
    deleteImage: imageRepo.deleteTripImage,
  },
  {
    kind: 'day',
    notFoundError: 'Day not found',
    parentId: 5,
    imageId: 7,
    uploadParams: { tripId: '1', dayId: '5' },
    deleteParams: { tripId: '1', dayId: '5', imageId: '7' },
    uploadHandler: uploadDayImage,
    deleteHandler: deleteDayImage,
    mockParentFound: found =>
      vi
        .mocked(tripRepo.findDayByIdAndTripId)
        .mockResolvedValue(
          found ? { id: 5, day: 1, date: '2026-05-10' } : null,
        ),
    mockParentRejects: err =>
      vi.mocked(tripRepo.findDayByIdAndTripId).mockRejectedValue(err),
    addImage: imageRepo.addDayImage,
    deleteImage: imageRepo.deleteDayImage,
  },
];

/** Every entity runs the happy path and the parent-not-found path so each per-entity config and exported wrapper is exercised. */
describe.each(variants)(
  '$kind image handlers',
  ({
    notFoundError,
    parentId,
    uploadParams,
    deleteParams,
    uploadHandler,
    deleteHandler,
    mockParentFound,
    addImage,
    deleteImage,
  }) => {
    describe('upload', () => {
      it('returns 404 when the parent is not found', async () => {
        mockParentFound(false);
        const { req, res } = createMockReqRes({
          params: uploadParams,
          body: { title: 'Title' },
          file: mockFile,
        });

        await uploadHandler(req, res);

        expectJsonStatus(res, 404, { error: notFoundError });
        expect(saveImageToDisk).not.toHaveBeenCalled();
        expect(addImage).not.toHaveBeenCalled();
      });

      it('returns 201 with the created image on success', async () => {
        const image: ImageResponse = {
          id: 42,
          filename: 'generated.jpg',
          title: 'Title',
        };
        mockParentFound(true);
        vi.mocked(saveImageToDisk).mockReturnValue('generated.jpg');
        vi.mocked(addImage).mockResolvedValue(image);
        const { req, res } = createMockReqRes({
          params: uploadParams,
          body: { title: 'Title' },
          file: mockFile,
        });

        await uploadHandler(req, res);

        expect(addImage).toHaveBeenCalledWith(
          parentId,
          'generated.jpg',
          'Title',
        );
        expectJsonStatus(res, 201, image);
      });
    });

    describe('delete', () => {
      it('returns 204 on success', async () => {
        mockParentFound(true);
        vi.mocked(deleteImage).mockResolvedValue(true);
        const { req, res } = createMockReqRes({ params: deleteParams });

        await deleteHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.send).toHaveBeenCalledWith();
      });
    });
  },
);

/** The remaining paths live in the shared handlers, so one entity is enough. */
describe.each(variants.slice(0, 1))(
  '$kind image handlers (shared paths)',
  ({
    notFoundError,
    uploadParams,
    deleteParams,
    uploadHandler,
    deleteHandler,
    mockParentFound,
    mockParentRejects,
    addImage,
    deleteImage,
  }) => {
    describe('upload', () => {
      it('returns 400 when req.file is missing', async () => {
        mockParentFound(true);
        const { req, res } = createMockReqRes({
          params: uploadParams,
          body: { title: 'Title' },
        });

        await uploadHandler(req, res);

        expectJsonStatus(res, 400, { error: 'image file is required' });
        expect(saveImageToDisk).not.toHaveBeenCalled();
        expect(addImage).not.toHaveBeenCalled();
      });

      it.each([
        { name: 'missing', body: {} },
        { name: 'blank', body: { title: '   ' } },
      ])('returns 400 when title is $name', async ({ body }) => {
        mockParentFound(true);
        const { req, res } = createMockReqRes({
          params: uploadParams,
          body,
          file: mockFile,
        });

        await uploadHandler(req, res);

        expectJsonStatus(res, 400, { error: 'title is required' });
        expect(saveImageToDisk).not.toHaveBeenCalled();
        expect(addImage).not.toHaveBeenCalled();
      });

      it('returns 400 when saveImageToDisk throws', async () => {
        mockParentFound(true);
        vi.mocked(saveImageToDisk).mockImplementation(() => {
          throw new Error('File content does not match declared image type');
        });
        const { req, res } = createMockReqRes({
          params: uploadParams,
          body: { title: 'Title' },
          file: mockFile,
        });

        await uploadHandler(req, res);

        expectJsonStatus(res, 400, { error: 'Invalid image file' });
        expect(addImage).not.toHaveBeenCalled();
      });

      it('returns 500 when an unexpected error occurs', async () => {
        mockParentRejects(new Error('db error'));
        const { req, res } = createMockReqRes({
          params: uploadParams,
          body: { title: 'Title' },
          file: mockFile,
        });

        await uploadHandler(req, res);

        expectJsonStatus(res, 500, { error: 'Failed to upload image' });
      });
    });

    describe('delete', () => {
      it('returns 404 when the parent is not found', async () => {
        mockParentFound(false);
        const { req, res } = createMockReqRes({ params: deleteParams });

        await deleteHandler(req, res);

        expectJsonStatus(res, 404, { error: notFoundError });
        expect(deleteImage).not.toHaveBeenCalled();
      });

      it('returns 404 when the image is not found', async () => {
        mockParentFound(true);
        vi.mocked(deleteImage).mockResolvedValue(false);
        const { req, res } = createMockReqRes({ params: deleteParams });

        await deleteHandler(req, res);

        expectJsonStatus(res, 404, { error: 'Image not found' });
      });

      it('returns 500 when an unexpected error occurs', async () => {
        mockParentRejects(new Error('db error'));
        const { req, res } = createMockReqRes({ params: deleteParams });

        await deleteHandler(req, res);

        expectJsonStatus(res, 500, { error: 'Failed to delete image' });
      });
    });
  },
);
