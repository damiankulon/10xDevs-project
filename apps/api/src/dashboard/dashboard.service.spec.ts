import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { SupabaseService } from '../supabase';

describe('DashboardService', () => {
  let service: DashboardService;
  let supabaseService: SupabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  describe('getDashboard', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return empty trackers array when no trackers exist', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        mockResolvedValue: jest
          .fn()
          .mockResolvedValue({ data: [], error: null }),
      };

      // Mock all queries to return empty data
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        data: [],
        error: null,
        count: 0,
      });

      jest
        .spyOn(supabaseService, 'getAdminClient')
        .mockReturnValue(mockSupabase as any);

      const result = await service.getDashboard('user-123', 7);

      expect(result).toBeDefined();
      expect(result.trackers).toEqual([]);
    });
  });

  describe('calculateTrend', () => {
    it('should return stable trend for constant values', () => {
      const service = new DashboardService(supabaseService);
      const sparklineData = [
        { date: '2026-01-26', value: 5 },
        { date: '2026-01-27', value: 5 },
        { date: '2026-01-28', value: 5 },
        { date: '2026-01-29', value: 5 },
        { date: '2026-01-30', value: 5 },
        { date: '2026-01-31', value: 5 },
      ];

      const result = (service as any).calculateTrend(sparklineData);

      expect(result.direction).toBe('stable');
      expect(result.percentage).toBe(0);
    });

    it('should return up trend for increasing values', () => {
      const service = new DashboardService(supabaseService);
      const sparklineData = [
        { date: '2026-01-26', value: 1 },
        { date: '2026-01-27', value: 2 },
        { date: '2026-01-28', value: 3 },
        { date: '2026-01-29', value: 7 },
        { date: '2026-01-30', value: 8 },
        { date: '2026-01-31', value: 9 },
      ];

      const result = (service as any).calculateTrend(sparklineData);

      expect(result.direction).toBe('up');
      expect(result.percentage).toBeGreaterThan(0);
    });

    it('should return down trend for decreasing values', () => {
      const service = new DashboardService(supabaseService);
      const sparklineData = [
        { date: '2026-01-26', value: 9 },
        { date: '2026-01-27', value: 8 },
        { date: '2026-01-28', value: 7 },
        { date: '2026-01-29', value: 3 },
        { date: '2026-01-30', value: 2 },
        { date: '2026-01-31', value: 1 },
      ];

      const result = (service as any).calculateTrend(sparklineData);

      expect(result.direction).toBe('down');
      expect(result.percentage).toBeGreaterThan(0);
    });

    it('should return stable trend for insufficient data', () => {
      const service = new DashboardService(supabaseService);
      const sparklineData = [{ date: '2026-01-26', value: 5 }];

      const result = (service as any).calculateTrend(sparklineData);

      expect(result.direction).toBe('stable');
      expect(result.percentage).toBe(0);
    });
  });

  describe('getStartOfWeek', () => {
    it('should return Sunday for any day of the week', () => {
      const service = new DashboardService(supabaseService);
      const wednesday = new Date('2026-02-04'); // Wednesday

      const result = (service as any).getStartOfWeek(wednesday);

      // Should return Sunday (day 0)
      expect(result.getDay()).toBe(0);
    });
  });
});
