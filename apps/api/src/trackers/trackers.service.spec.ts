import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TrackersService } from './trackers.service';
import { SupabaseService } from '../supabase';
import { CreateTrackerDto } from './dto/create-tracker.dto';

describe('TrackersService', () => {
  let service: TrackersService;

  // Mock Supabase client
  const mockSupabaseClient = {
    from: jest.fn(),
    rpc: jest.fn(),
  };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTrackerId = '223e4567-e89b-12d3-a456-426614174001';

  const mockCreatedTracker = {
    id: mockTrackerId,
    user_id: mockUserId,
    name: 'Energy Level',
    data_type: 'scale' as const,
    unit: null,
    config: { min: 1, max: 10 },
    color: '#4CAF50',
    icon: 'battery',
    display_order: 0,
    is_active: true,
    created_at: '2026-01-26T12:00:00Z',
    updated_at: '2026-01-26T12:00:00Z',
    deleted_at: null,
  };

  /**
   * Helper to setup mock chain for profile fetch
   */
  const setupProfileMock = (
    data: { trackers_limit: number } | null,
    error: any = null
  ) => {
    const maybeSingleProfile = jest.fn().mockResolvedValue({ data, error });
    const isDeletedAtNullProfile = jest
      .fn()
      .mockReturnValue({ maybeSingle: maybeSingleProfile });
    const eqIdProfile = jest
      .fn()
      .mockReturnValue({ is: isDeletedAtNullProfile });
    return { select: jest.fn().mockReturnValue({ eq: eqIdProfile }) };
  };

  /**
   * Helper to setup mock chain for trackers count
   */
  const setupTrackersCountMock = (count: number, error: any = null) => {
    const countResult = jest.fn().mockResolvedValue({ count, error });
    const isDeletedAtNullTrackers = jest.fn().mockReturnValue(countResult);
    const eqUserIdTrackers = jest
      .fn()
      .mockReturnValue({ is: isDeletedAtNullTrackers });
    return { select: jest.fn().mockReturnValue({ eq: eqUserIdTrackers }) };
  };

  /**
   * Helper to setup mock chain for tracker insert
   */
  const setupInsertMock = (data: any, error: any = null) => {
    const singleInsert = jest.fn().mockResolvedValue({ data, error });
    const selectInsert = jest.fn().mockReturnValue({ single: singleInsert });
    return { insert: jest.fn().mockReturnValue({ select: selectInsert }) };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackersService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
      ],
    }).compile();

    service = module.get<TrackersService>(TrackersService);
  });

  describe('create', () => {
    const validCreateDto: CreateTrackerDto = {
      name: 'Energy Level',
      data_type: 'scale',
      config: { min: 1, max: 10 },
      color: '#4CAF50',
      icon: 'battery',
    };

    it('should create a tracker successfully', async () => {
      const profileMock = setupProfileMock({ trackers_limit: 10 });
      const countMock = setupTrackersCountMock(5);
      const insertMock = setupInsertMock(mockCreatedTracker);

      // Mock RPC call for counting trackers
      mockSupabaseClient.rpc.mockResolvedValue({ data: 5, error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileMock;
        if (table === 'trackers') return { ...countMock, ...insertMock };
        return {};
      });

      const result = await service.create(mockUserId, validCreateDto);

      expect(result).toEqual({
        id: mockTrackerId,
        user_id: mockUserId,
        name: 'Energy Level',
        data_type: 'scale',
        unit: null,
        config: { min: 1, max: 10 },
        color: '#4CAF50',
        icon: 'battery',
        display_order: 0,
        is_active: true,
        created_at: '2026-01-26T12:00:00Z',
        updated_at: '2026-01-26T12:00:00Z',
      });
      expect(result).not.toHaveProperty('deleted_at');
    });

    it('should throw BadRequestException when unit is provided for non-number type', async () => {
      const dtoWithUnit: CreateTrackerDto = {
        ...validCreateDto,
        data_type: 'boolean',
        unit: 'kg',
      };

      await expect(service.create(mockUserId, dtoWithUnit)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.create(mockUserId, dtoWithUnit)).rejects.toThrow(
        "unit is only allowed for data_type 'number'"
      );
    });

    it('should throw BadRequestException when scale type lacks config', async () => {
      const dtoWithoutConfig: CreateTrackerDto = {
        name: 'Test',
        data_type: 'scale',
      };

      await expect(
        service.create(mockUserId, dtoWithoutConfig)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(mockUserId, dtoWithoutConfig)
      ).rejects.toThrow(
        "config must include min and max for data_type 'scale'"
      );
    });

    it('should throw BadRequestException when scale config lacks min', async () => {
      const dtoWithIncompleteConfig: CreateTrackerDto = {
        name: 'Test',
        data_type: 'scale',
        config: { max: 10 } as any,
      };

      await expect(
        service.create(mockUserId, dtoWithIncompleteConfig)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when scale config lacks max', async () => {
      const dtoWithIncompleteConfig: CreateTrackerDto = {
        name: 'Test',
        data_type: 'scale',
        config: { min: 1 } as any,
      };

      await expect(
        service.create(mockUserId, dtoWithIncompleteConfig)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when tracker limit is reached', async () => {
      // Create a fresh mock for this specific test
      let trackersCallCount = 0;

      // Mock RPC call returning count at limit
      mockSupabaseClient.rpc.mockResolvedValue({ data: 10, error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { trackers_limit: 10 },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'trackers') {
          trackersCallCount++;
          if (trackersCallCount === 1) {
            // First call for count: select('*', { count: 'exact', head: true }).eq().is()
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockResolvedValue({
                    count: 10, // At limit
                    error: null,
                  }),
                }),
              }),
            };
          }
          // Second call for insert (shouldn't happen if limit check works)
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockCreatedTracker,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(service.create(mockUserId, validCreateDto)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw InternalServerErrorException when profile fetch fails', async () => {
      const profileMock = setupProfileMock(null, {
        code: 'PGRST116',
        message: 'Error',
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileMock;
        return {};
      });

      await expect(service.create(mockUserId, validCreateDto)).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should allow unit for number data_type', async () => {
      const dtoWithNumberUnit: CreateTrackerDto = {
        name: 'Weight',
        data_type: 'number',
        unit: 'kg',
      };

      const trackerWithUnit = {
        ...mockCreatedTracker,
        name: 'Weight',
        data_type: 'number',
        unit: 'kg',
      };
      const profileMock = setupProfileMock({ trackers_limit: 10 });
      const countMock = setupTrackersCountMock(5);
      const insertMock = setupInsertMock(trackerWithUnit);

      // Mock RPC call for counting trackers
      mockSupabaseClient.rpc.mockResolvedValue({ data: 5, error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileMock;
        if (table === 'trackers') return { ...countMock, ...insertMock };
        return {};
      });

      const result = await service.create(mockUserId, dtoWithNumberUnit);
      expect(result).toBeDefined();
      expect(result.unit).toBe('kg');
    });

    it('should create tracker with default display_order when not provided', async () => {
      const dtoWithoutOrder: CreateTrackerDto = {
        name: 'Test',
        data_type: 'boolean',
      };

      const trackerBoolean = {
        ...mockCreatedTracker,
        name: 'Test',
        data_type: 'boolean',
        config: {},
      };
      const profileMock = setupProfileMock({ trackers_limit: 10 });
      const countMock = setupTrackersCountMock(5);
      const insertMock = setupInsertMock(trackerBoolean);

      // Mock RPC call for counting trackers
      mockSupabaseClient.rpc.mockResolvedValue({ data: 5, error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileMock;
        if (table === 'trackers') return { ...countMock, ...insertMock };
        return {};
      });

      const result = await service.create(mockUserId, dtoWithoutOrder);
      expect(result.display_order).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of trackers', async () => {
      const mockTrackers = [
        {
          ...mockCreatedTracker,
          id: '1',
          name: 'Tracker 1',
        },
        {
          ...mockCreatedTracker,
          id: '2',
          name: 'Tracker 2',
        },
      ];

      // Create chainable mock methods
      const createChainableMock = () => {
        const chainable: any = {
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: mockTrackers,
            error: null,
            count: 2,
          }),
        };
        // Make each method return the chainable object
        Object.keys(chainable).forEach((key) => {
          if (typeof chainable[key] === 'function' && key !== 'range') {
            chainable[key] = jest.fn(() => chainable);
          }
        });
        return chainable;
      };

      const trackersMock = {
        select: jest.fn().mockReturnValue({
          is: jest.fn(() => createChainableMock()),
        }),
      };

      const sharesMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };

      const entriesMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackersMock;
        if (table === 'tracker_shares') return sharesMock;
        if (table === 'entries') return entriesMock;
        return {};
      });

      const result = await service.findAll(mockUserId, {
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.pagination.total_items).toBe(2);
      expect(result.pagination.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return tracker details with stats', async () => {
      const trackerMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: mockCreatedTracker,
                error: null,
              }),
            }),
          }),
        }),
      };

      const entriesMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackerMock;
        if (table === 'entries') return entriesMock;
        if (table === 'tracker_shares')
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        return {};
      });

      const result = await service.findOne(mockTrackerId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockTrackerId);
      expect(result.is_owner).toBe(true);
      expect(result.stats).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update tracker successfully', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedTracker = { ...mockCreatedTracker, name: 'Updated Name' };

      const findMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: mockCreatedTracker,
                error: null,
              }),
            }),
          }),
        }),
      };

      const updateMock = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedTracker,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return { ...findMock, ...updateMock };
        return {};
      });

      const result = await service.update(mockTrackerId, mockUserId, updateDto);

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should soft delete tracker', async () => {
      const findMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: mockCreatedTracker,
                error: null,
              }),
            }),
          }),
        }),
      };

      const deleteMock = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return { ...findMock, ...deleteMock };
        return {};
      });

      await expect(
        service.remove(mockTrackerId, mockUserId)
      ).resolves.toBeUndefined();
    });
  });

  describe('reorder', () => {
    it('should reorder trackers successfully', async () => {
      const reorderDto = {
        order: [
          { id: '1', display_order: 0 },
          { id: '2', display_order: 1 },
        ],
      };

      const trackersMock = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              data: [
                { id: '1', user_id: mockUserId },
                { id: '2', user_id: mockUserId },
              ],
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'trackers') return trackersMock;
        return {};
      });

      const result = await service.reorder(mockUserId, reorderDto);

      expect(result.message).toBe('Tracker order updated successfully');
      expect(result.updated_count).toBe(2);
    });
  });
});
