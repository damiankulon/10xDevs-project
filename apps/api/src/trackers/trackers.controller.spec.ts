import { Test, TestingModule } from '@nestjs/testing';
import { TrackersController } from './trackers.controller';
import { TrackersService } from './trackers.service';
import type { AuthUser } from '../auth';

describe('TrackersController', () => {
  let controller: TrackersController;
  let service: TrackersService;

  const mockAuthUser: AuthUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
  };

  const mockTrackerId = '223e4567-e89b-12d3-a456-426614174001';

  const mockTrackerResponse = {
    id: mockTrackerId,
    user_id: mockAuthUser.id,
    name: 'Test Tracker',
    data_type: 'number' as const,
    unit: 'kg',
    config: {},
    color: '#FF5733',
    icon: 'scale',
    display_order: 0,
    is_active: true,
    created_at: '2026-02-01T12:00:00Z',
    updated_at: '2026-02-01T12:00:00Z',
  };

  const mockTrackerDetailResponse = {
    ...mockTrackerResponse,
    is_owner: true,
    shared_permission: null,
    stats: {
      total_entries: 10,
      first_entry_at: '2026-01-01T12:00:00Z',
      last_entry_at: '2026-02-01T12:00:00Z',
    },
  };

  const mockTrackerListResponse = {
    data: [
      {
        ...mockTrackerResponse,
        is_owner: true,
        shared_permission: null,
        last_entry: { value: 75.5, recorded_at: '2026-02-01T12:00:00Z' },
        sparkline_data: [75, 76, 74, 75, 76, 75, 75.5],
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total_items: 1,
      total_pages: 1,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackersController],
      providers: [
        {
          provide: TrackersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            reorder: jest.fn(),
            getTrackerStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TrackersController>(TrackersController);
    service = module.get<TrackersService>(TrackersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated list of trackers', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(mockTrackerListResponse);

      const result = await controller.findAll(mockAuthUser, {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(mockTrackerListResponse);
      expect(service.findAll).toHaveBeenCalledWith(mockAuthUser.id, {
        page: 1,
        limit: 20,
      });
    });
  });

  describe('findOne', () => {
    it('should return tracker details', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockTrackerDetailResponse);

      const result = await controller.findOne(mockAuthUser, {
        id: mockTrackerId,
      });

      expect(result).toEqual(mockTrackerDetailResponse);
      expect(service.findOne).toHaveBeenCalledWith(
        mockTrackerId,
        mockAuthUser.id
      );
    });
  });

  describe('create', () => {
    it('should create a new tracker', async () => {
      const createDto = {
        name: 'Test Tracker',
        data_type: 'number' as const,
        unit: 'kg',
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockTrackerResponse);

      const result = await controller.create(mockAuthUser, createDto);

      expect(result).toEqual(mockTrackerResponse);
      expect(service.create).toHaveBeenCalledWith(mockAuthUser.id, createDto);
    });
  });

  describe('update', () => {
    it('should update a tracker', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedTracker = { ...mockTrackerResponse, name: 'Updated Name' };

      jest.spyOn(service, 'update').mockResolvedValue(updatedTracker);

      const result = await controller.update(
        mockAuthUser,
        { id: mockTrackerId },
        updateDto
      );

      expect(result).toEqual(updatedTracker);
      expect(service.update).toHaveBeenCalledWith(
        mockTrackerId,
        mockAuthUser.id,
        updateDto
      );
    });
  });

  describe('remove', () => {
    it('should delete a tracker', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      const result = await controller.remove(mockAuthUser, {
        id: mockTrackerId,
      });

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(
        mockTrackerId,
        mockAuthUser.id
      );
    });
  });

  describe('reorder', () => {
    it('should reorder trackers', async () => {
      const reorderDto = {
        order: [
          { id: '1', display_order: 0 },
          { id: '2', display_order: 1 },
        ],
      };

      const reorderResponse = {
        message: 'Tracker order updated successfully',
        updated_count: 2,
      };

      jest.spyOn(service, 'reorder').mockResolvedValue(reorderResponse);

      const result = await controller.reorder(mockAuthUser, reorderDto);

      expect(result).toEqual(reorderResponse);
      expect(service.reorder).toHaveBeenCalledWith(mockAuthUser.id, reorderDto);
    });
  });

  describe('getTrackerStats', () => {
    it('should return tracker statistics', async () => {
      const mockStats = {
        tracker_id: mockTrackerId,
        period: '7d' as const,
        data_type: 'number' as const,
        stats: {
          count: 7,
          average: 75,
          min: 70,
          max: 80,
          median: 75,
          std_dev: 2.5,
        },
        chart_data: {
          labels: ['2026-01-26', '2026-01-27', '2026-01-28'],
          values: [75, 76, 74],
        },
        heatmap_data: [
          { date: '2026-01-26', count: 1, value: 75 },
          { date: '2026-01-27', count: 1, value: 76 },
        ],
      };

      jest.spyOn(service, 'getTrackerStats').mockResolvedValue(mockStats);

      const result = await controller.getTrackerStats(
        mockAuthUser,
        { trackerId: mockTrackerId },
        { period: '7d' }
      );

      expect(result).toEqual(mockStats);
      expect(service.getTrackerStats).toHaveBeenCalledWith(
        mockAuthUser.id,
        mockTrackerId,
        '7d'
      );
    });
  });
});
