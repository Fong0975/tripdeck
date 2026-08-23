import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../middleware/upload');
vi.mock('../repositories/attractionRepository');
vi.mock('../repositories/connectionRepository');
vi.mock('../repositories/imageRepository');

import { saveImageToDisk } from '../middleware/upload';
import * as attractionRepo from '../repositories/attractionRepository';
import * as connectionRepo from '../repositories/connectionRepository';
import * as imageRepo from '../repositories/imageRepository';
import { createMockReqRes, expectJsonStatus } from '../test-utils/httpMocks';
import type { ImageResponse } from '../types/trip';

import {
  deleteAttractionImage,
  deleteConnectionImage,
  uploadAttractionImage,
  uploadConnectionImage,
} from './imageController';

const mockFile = {
  buffer: Buffer.from('fake-image-bytes'),
  mimetype: 'image/jpeg',
} as Express.Multer.File;

interface Variant {
  kind: 'attraction' | 'connection';
  notFoundError: string;
  parentId: number;
  imageId: number;
  uploadParams: Record<string, string>;
  deleteParams: Record<string, string>;
  uploadHandler: (req: Request, res: Response) => Promise<void>;
  deleteHandler: (req: Request, res: Response) => Promise<void>;
  verifyBelongsToTrip:
    | typeof attractionRepo.verifyBelongsToTrip
    | typeof connectionRepo.verifyBelongsToTrip;
  addImage:
    | typeof imageRepo.addAttractionImage
    | typeof imageRepo.addConnectionImage;
  deleteImage:
    | typeof imageRepo.deleteAttractionImage
    | typeof imageRepo.deleteConnectionImage;
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
    verifyBelongsToTrip: attractionRepo.verifyBelongsToTrip,
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
    verifyBelongsToTrip: connectionRepo.verifyBelongsToTrip,
    addImage: imageRepo.addConnectionImage,
    deleteImage: imageRepo.deleteConnectionImage,
  },
];

describe.each(variants)(
  '$kind image handlers',
  ({
    notFoundError,
    parentId,
    uploadParams,
    deleteParams,
    uploadHandler,
    deleteHandler,
    verifyBelongsToTrip,
    addImage,
    deleteImage,
  }) => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('upload', () => {
      it('returns 404 when the parent is not found', async () => {
        vi.mocked(verifyBelongsToTrip).mockResolvedValue(false);
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

      it('returns 400 when req.file is missing', async () => {
        vi.mocked(verifyBelongsToTrip).mockResolvedValue(true);
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
        vi.mocked(verifyBelongsToTrip).mockResolvedValue(true);
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
        vi.mocked(verifyBelongsToTrip).mockResolvedValue(true);
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

      it('returns 201 with the created image on success', async () => {
        const image: ImageResponse = {
          id: 42,
          filename: 'generated.jpg',
          title: 'Title',
        };
        vi.mocked(verifyBelongsToTrip).mockResolvedValue(true);
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

      it('returns 500 when an unexpected error occurs', async () => {
        vi.mocked(verifyBelongsToTrip).mockRejectedValue(new Error('db error'));
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
        vi.mocked(verifyBelongsToTrip).mockResolvedValue(false);
        const { req, res } = createMockReqRes({ params: deleteParams });

        await deleteHandler(req, res);

        expectJsonStatus(res, 404, { error: notFoundError });
        expect(deleteImage).not.toHaveBeenCalled();
      });

      it('returns 404 when the image is not found', async () => {
        vi.mocked(verifyBelongsToTrip).mockResolvedValue(true);
        vi.mocked(deleteImage).mockResolvedValue(false);
        const { req, res } = createMockReqRes({ params: deleteParams });

        await deleteHandler(req, res);

        expectJsonStatus(res, 404, { error: 'Image not found' });
      });

      it('returns 204 on success', async () => {
        vi.mocked(verifyBelongsToTrip).mockResolvedValue(true);
        vi.mocked(deleteImage).mockResolvedValue(true);
        const { req, res } = createMockReqRes({ params: deleteParams });

        await deleteHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.send).toHaveBeenCalledWith();
      });

      it('returns 500 when an unexpected error occurs', async () => {
        vi.mocked(verifyBelongsToTrip).mockRejectedValue(new Error('db error'));
        const { req, res } = createMockReqRes({ params: deleteParams });

        await deleteHandler(req, res);

        expectJsonStatus(res, 500, { error: 'Failed to delete image' });
      });
    });
  },
);
