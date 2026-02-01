import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EntriesService } from './entries.service';
import { SupabaseService } from '../supabase';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EntryQueryDto } from './dto/entry-query.dto';

describe('EntriesService', () => {
  let service: EntriesService;

  // Mock Supabase client
  const mockSupabaseClient = {
    from: jest.fn(),
  };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTrackerId = '223e4567-e89b-12d3-a456-426614174001';
  const mockEntryId = '323e4567-e89b-12d3-a456-426614174002';
  const mockOtherUserId = '423e4567-e89b-12d3-a456-426614174003';

  const mockTracker = {
    id: mockTrackerId,
    user_id: mockUserId,
    name: 'Weight',
    data_type: 'number',
    unit: 'kg',
    config: {},
    color: '#4CAF50',
    icon: 'scale',
    display_order: 0,
    is_active: true,
    created_at: '2026-01-26T12:00:00Z',
    updated_at: '2026-01-26T12:00:00Z',
    deleted_at: null,
  };

  const mockScaleTracker = {
    ...mockTracker,
    data_type: 'scale',
    config: { min: 1, max: 10 },
  };

  const mockEntry = {
    id: mockEntryId,
    tracker_id: mockTrackerId,
    user_id: mockUserId,
    value_number: 75.5,
    value_boolean: null,
    value_text: null,
    value_json: null,
    recorded_at: '2026-01-26T12:00:00Z',
    created_at: '2026-01-26T12:00:00Z',
    updated_at: '2026-01-26T12:00:00Z',
    deleted_at: null,
  };

  /**
   * Helper do mockowania zapytania o tracker
   */
  const setupTrackerMock = (data: any, error: any = null) => {
    const singleTracker = jest.fn().mockResolvedValue({ data, error });
    const isDeletedAtNull = jest
      .fn()
      .mockReturnValue({ single: singleTracker });
    const eqId = jest.fn().mockReturnValue({ is: isDeletedAtNull });
    return { select: jest.fn().mockReturnValue({ eq: eqId }) };
  };

  /**
   * Helper do mockowania zapytania o tracker_shares
   */
  const setupTrackerShareMock = (data: any, error: any = null) => {
    const maybeSingleShare = jest.fn().mockResolvedValue({ data, error });
    const eqSharedUser = jest
      .fn()
      .mockReturnValue({ maybeSingle: maybeSingleShare });
    const eqTrackerId = jest.fn().mockReturnValue({ eq: eqSharedUser });
    return { select: jest.fn().mockReturnValue({ eq: eqTrackerId }) };
  };

  /**
   * Helper do mockowania zapytania o entry
   */
  const setupEntryMock = (data: any, error: any = null) => {
    const singleEntry = jest.fn().mockResolvedValue({ data, error });
    const isDeletedAtNull = jest.fn().mockReturnValue({ single: singleEntry });
    const eqTrackerId = jest.fn().mockReturnValue({ is: isDeletedAtNull });
    const eqId = jest.fn().mockReturnValue({ eq: eqTrackerId });
    return { select: jest.fn().mockReturnValue({ eq: eqId }) };
  };

  /**
   * Helper do mockowania insert entry
   */
  const setupInsertMock = (data: any, error: any = null) => {
    const singleInsert = jest.fn().mockResolvedValue({ data, error });
    const selectInsert = jest.fn().mockReturnValue({ single: singleInsert });
    return { insert: jest.fn().mockReturnValue({ select: selectInsert }) };
  };

  /**
   * Helper do mockowania update entry
   */
  const setupUpdateMock = (data: any, error: any = null) => {
    const singleUpdate = jest.fn().mockResolvedValue({ data, error });
    const selectUpdate = jest.fn().mockReturnValue({ single: singleUpdate });
    const eqId = jest.fn().mockReturnValue({ select: selectUpdate });
    return { update: jest.fn().mockReturnValue({ eq: eqId }) };
  };

  /**
   * Helper do mockowania delete entry
   */
  const setupDeleteMock = (error: any = null) => {
    const eqId = jest.fn().mockResolvedValue({ error });
    return { update: jest.fn().mockReturnValue({ eq: eqId }) };
  };

  /**
   * Helper do mockowania listy entries
   */
  const setupListMock = (data: any[], count: number, error: any = null) => {
    const rangeResult = jest.fn().mockResolvedValue({ data, count, error });
    const orderBy = jest.fn().mockReturnValue({ range: rangeResult });
    const isDeletedAtNull = jest.fn().mockReturnValue({ order: orderBy });
    const eqTrackerId = jest.fn().mockReturnValue({ is: isDeletedAtNull });
    return { select: jest.fn().mockReturnValue({ eq: eqTrackerId }) };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntriesService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
      ],
    }).compile();

    service = module.get<EntriesService>(EntriesService);
  });

  describe('create', () => {
    const validCreateDto: CreateEntryDto = {
      value: 75.5,
      recorded_at: '2026-01-26T12:00:00Z',
    };

    it('should create an entry successfully', async () => {
      const trackerMock = setupTrackerMock(mockTracker);
      const insertMock = setupInsertMock(mockEntry);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'entries') return insertMock;
        return {};
      });

      const result = await service.create(
        mockTrackerId,
        mockUserId,
        validCreateDto
      );

      expect(result).toEqual({
        id: mockEntryId,
        tracker_id: mockTrackerId,
        user_id: mockUserId,
        value: 75.5,
        recorded_at: '2026-01-26T12:00:00Z',
        created_at: '2026-01-26T12:00:00Z',
        updated_at: '2026-01-26T12:00:00Z',
      });
      expect(result).not.toHaveProperty('deleted_at');
    });

    it('should throw NotFoundException when tracker does not exist', async () => {
      const trackerMock = setupTrackerMock(null, { code: 'PGRST116' });

      mockSupabaseClient.from.mockReturnValue(trackerMock);

      await expect(
        service.create(mockTrackerId, mockUserId, validCreateDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own tracker and has no share', async () => {
      const trackerMock = setupTrackerMock({
        ...mockTracker,
        user_id: mockOtherUserId,
      });
      const shareMock = setupTrackerShareMock(null);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'tracker_shares') return shareMock;
        return {};
      });

      await expect(
        service.create(mockTrackerId, mockUserId, validCreateDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has only read permission', async () => {
      const trackerMock = setupTrackerMock({
        ...mockTracker,
        user_id: mockOtherUserId,
      });
      const shareMock = setupTrackerShareMock({ permission: 'read' });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'tracker_shares') return shareMock;
        return {};
      });

      await expect(
        service.create(mockTrackerId, mockUserId, validCreateDto)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(mockTrackerId, mockUserId, validCreateDto)
      ).rejects.toThrow('Write access denied to this tracker');
    });

    it('should allow creation when user has write permission', async () => {
      const trackerMock = setupTrackerMock({
        ...mockTracker,
        user_id: mockOtherUserId,
      });
      const shareMock = setupTrackerShareMock({ permission: 'write' });
      const insertMock = setupInsertMock(mockEntry);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'tracker_shares') return shareMock;
        if (table === 'entries') return insertMock;
        return {};
      });

      const result = await service.create(
        mockTrackerId,
        mockUserId,
        validCreateDto
      );

      expect(result.value).toBe(75.5);
    });

    it('should throw UnprocessableEntityException for value type mismatch', async () => {
      const trackerMock = setupTrackerMock(mockTracker);

      mockSupabaseClient.from.mockReturnValue(trackerMock);

      const invalidDto: CreateEntryDto = {
        value: 'invalid',
      };

      await expect(
        service.create(mockTrackerId, mockUserId, invalidDto)
      ).rejects.toThrow(UnprocessableEntityException);
      await expect(
        service.create(mockTrackerId, mockUserId, invalidDto)
      ).rejects.toThrow(
        "Value type does not match tracker data_type 'number'. Expected number"
      );
    });

    it('should throw UnprocessableEntityException for scale value out of range', async () => {
      const trackerMock = setupTrackerMock(mockScaleTracker);

      mockSupabaseClient.from.mockReturnValue(trackerMock);

      const outOfRangeDto: CreateEntryDto = {
        value: 15,
      };

      await expect(
        service.create(mockTrackerId, mockUserId, outOfRangeDto)
      ).rejects.toThrow(UnprocessableEntityException);
      await expect(
        service.create(mockTrackerId, mockUserId, outOfRangeDto)
      ).rejects.toThrow('Value must be at most 10');
    });

    it('should use current time when recorded_at is not provided', async () => {
      const trackerMock = setupTrackerMock(mockTracker);
      const insertMock = setupInsertMock(mockEntry);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'entries') return insertMock;
        return {};
      });

      const dtoWithoutTime: CreateEntryDto = {
        value: 75.5,
      };

      await service.create(mockTrackerId, mockUserId, dtoWithoutTime);

      expect(insertMock.insert).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single entry', async () => {
      const trackerMock = setupTrackerMock(mockTracker);
      const entryMock = setupEntryMock(mockEntry);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'entries') return entryMock;
        return {};
      });

      const result = await service.findOne(
        mockTrackerId,
        mockEntryId,
        mockUserId
      );

      expect(result).toEqual({
        id: mockEntryId,
        tracker_id: mockTrackerId,
        user_id: mockUserId,
        value: 75.5,
        recorded_at: '2026-01-26T12:00:00Z',
        created_at: '2026-01-26T12:00:00Z',
        updated_at: '2026-01-26T12:00:00Z',
      });
    });

    it('should throw NotFoundException when entry does not exist', async () => {
      const trackerMock = setupTrackerMock(mockTracker);
      const entryMock = setupEntryMock(null, { code: 'PGRST116' });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'entries') return entryMock;
        return {};
      });

      await expect(
        service.findOne(mockTrackerId, mockEntryId, mockUserId)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOne(mockTrackerId, mockEntryId, mockUserId)
      ).rejects.toThrow('Entry not found');
    });
  });

  describe('update', () => {
    const validUpdateDto: UpdateEntryDto = {
      value: 80,
    };

    it('should update an entry successfully', async () => {
      const trackerMock = setupTrackerMock(mockTracker);
      const entryMock = setupEntryMock(mockEntry);
      const updatedEntry = {
        ...mockEntry,
        value_number: 80,
        updated_at: '2026-01-26T13:00:00Z',
      };
      const updateMock = setupUpdateMock(updatedEntry);

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'entries') {
          callCount++;
          return callCount === 1 ? entryMock : updateMock;
        }
        return {};
      });

      const result = await service.update(
        mockTrackerId,
        mockEntryId,
        mockUserId,
        validUpdateDto
      );

      expect(result.value).toBe(80);
    });

    it('should throw ForbiddenException when user is not the entry author', async () => {
      const trackerMock = setupTrackerMock(mockTracker);
      const entryMock = setupEntryMock({
        ...mockEntry,
        user_id: mockOtherUserId,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'entries') return entryMock;
        return {};
      });

      await expect(
        service.update(mockTrackerId, mockEntryId, mockUserId, validUpdateDto)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(mockTrackerId, mockEntryId, mockUserId, validUpdateDto)
      ).rejects.toThrow('Only entry author can modify this entry');
    });
  });

  describe('remove', () => {
    it('should soft delete an entry successfully', async () => {
      const trackerMock = setupTrackerMock(mockTracker);
      const entryMock = setupEntryMock(mockEntry);
      const deleteMock = setupDeleteMock();

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'entries') {
          callCount++;
          return callCount === 1 ? entryMock : deleteMock;
        }
        return {};
      });

      await service.remove(mockTrackerId, mockEntryId, mockUserId);

      expect(deleteMock.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the entry author', async () => {
      const trackerMock = setupTrackerMock(mockTracker);
      const entryMock = setupEntryMock({
        ...mockEntry,
        user_id: mockOtherUserId,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'entries') return entryMock;
        return {};
      });

      await expect(
        service.remove(mockTrackerId, mockEntryId, mockUserId)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove(mockTrackerId, mockEntryId, mockUserId)
      ).rejects.toThrow('Only entry author can delete this entry');
    });
  });

  describe('findAll', () => {
    const query: EntryQueryDto = {
      page: 1,
      limit: 50,
      sort_order: 'desc',
    };

    it('should return paginated list of entries', async () => {
      const trackerMock = setupTrackerMock(mockTracker);
      const entries = [mockEntry];
      const listMock = setupListMock(entries, 1);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'entries') return listMock;
        return {};
      });

      const result = await service.findAll(mockTrackerId, mockUserId, query);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].value).toBe(75.5);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total_items: 1,
        total_pages: 1,
      });
    });

    it('should return empty array when no entries found', async () => {
      const trackerMock = setupTrackerMock(mockTracker);
      const listMock = setupListMock([], 0);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'entries') return listMock;
        return {};
      });

      const result = await service.findAll(mockTrackerId, mockUserId, query);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total_items).toBe(0);
    });
  });
});
