import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { SupabaseService } from '../supabase';

describe('TemplatesService', () => {
  let service: TemplatesService;

  // Mock Supabase client
  const mockSupabaseClient = {
    from: jest.fn(),
  };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockPackageId = '223e4567-e89b-12d3-a456-426614174001';
  const mockTemplateId1 = '323e4567-e89b-12d3-a456-426614174002';
  const mockTemplateId2 = '423e4567-e89b-12d3-a456-426614174003';

  const mockTemplatePackage = {
    id: mockPackageId,
    name: 'Health',
    description: 'Track your health metrics',
    icon: 'heart',
    display_order: 1,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  };

  const mockTrackerTemplates = [
    {
      id: mockTemplateId1,
      package_id: mockPackageId,
      name: 'Weight',
      data_type: 'number',
      unit: 'kg',
      config: {},
      color: '#FF5733',
      icon: 'scale',
      display_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: mockTemplateId2,
      package_id: mockPackageId,
      name: 'Sleep',
      data_type: 'number',
      unit: 'hours',
      config: {},
      color: '#3498DB',
      icon: 'moon',
      display_order: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  /**
   * Helper to setup mock chain for packages fetch
   */
  const setupPackagesFetchMock = (data: any, error: any = null) => {
    const orderBy = jest.fn().mockResolvedValue({ data, error });
    const isActive = jest.fn().mockReturnValue({ order: orderBy });
    const selectPackages = jest.fn().mockReturnValue({ eq: isActive });
    return { select: selectPackages };
  };

  /**
   * Helper to setup mock chain for single package fetch
   */
  const setupSinglePackageFetchMock = (data: any, error: any = null) => {
    const singlePackage = jest.fn().mockResolvedValue({ data, error });
    const eqIdPackage = jest.fn().mockReturnValue({ single: singlePackage });
    const selectPackage = jest.fn().mockReturnValue({ eq: eqIdPackage });
    return { select: selectPackage };
  };

  /**
   * Helper to setup mock chain for profile fetch
   */
  const setupProfileMock = (
    data: { trackers_limit: number } | null,
    error: any = null
  ) => {
    const singleProfile = jest.fn().mockResolvedValue({ data, error });
    const eqIdProfile = jest.fn().mockReturnValue({ single: singleProfile });
    const selectProfile = jest.fn().mockReturnValue({ eq: eqIdProfile });
    return { select: selectProfile };
  };

  /**
   * Helper to setup mock chain for trackers count
   */
  const setupTrackersCountMock = (count: number, error: any = null) => {
    const countResult = jest.fn().mockResolvedValue({ count, error });
    const isDeletedAtNull = jest.fn().mockReturnValue(countResult);
    const eqUserId = jest.fn().mockReturnValue({ is: isDeletedAtNull });

    // select with count options returns chain ending with count()
    const selectCount = jest
      .fn()
      .mockImplementation((cols: string, options?: any) => {
        if (options?.count === 'exact') {
          return { eq: eqUserId };
        }
        // For regular select (insert), return different chain
        return {
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

    // Add insert method that should never be called in ForbiddenException test
    const insertTrackers = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
    return { select: selectCount, insert: insertTrackers };
  };

  /**
   * Helper to setup mock chain for trackers insert
   */
  const setupTrackersInsertMock = (data: any, error: any = null) => {
    const selectInsert = jest.fn().mockResolvedValue({ data, error });
    const insertTrackers = jest.fn().mockReturnValue({ select: selectInsert });
    return { insert: insertTrackers };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  describe('findAllPackages', () => {
    it('should return list of active packages with tracker templates', async () => {
      // Arrange
      const mockPackagesData = [
        {
          ...mockTemplatePackage,
          tracker_templates: mockTrackerTemplates,
        },
      ];

      mockSupabaseClient.from.mockReturnValue(
        setupPackagesFetchMock(mockPackagesData)
      );

      // Act
      const result = await service.findAllPackages();

      // Assert
      expect(result).toEqual({
        data: [
          {
            id: mockPackageId,
            name: 'Health',
            description: 'Track your health metrics',
            icon: 'heart',
            display_order: 1,
            trackers: [
              {
                id: mockTemplateId1,
                name: 'Weight',
                data_type: 'number',
                unit: 'kg',
                config: {},
                color: '#FF5733',
                icon: 'scale',
                display_order: 0,
              },
              {
                id: mockTemplateId2,
                name: 'Sleep',
                data_type: 'number',
                unit: 'hours',
                config: {},
                color: '#3498DB',
                icon: 'moon',
                display_order: 1,
              },
            ],
          },
        ],
      });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('template_packages');
    });

    it('should sort packages by display_order ascending', async () => {
      // Arrange
      const mockPackage1 = {
        ...mockTemplatePackage,
        id: 'pkg-1',
        display_order: 2,
        tracker_templates: [],
      };
      const mockPackage2 = {
        ...mockTemplatePackage,
        id: 'pkg-2',
        display_order: 1,
        tracker_templates: [],
      };

      mockSupabaseClient.from.mockReturnValue(
        setupPackagesFetchMock([mockPackage2, mockPackage1])
      );

      // Act
      const result = await service.findAllPackages();

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('pkg-2');
      expect(result.data[1].id).toBe('pkg-1');
    });

    it('should sort tracker templates by display_order within each package', async () => {
      // Arrange
      const mockPackageWithUnsortedTemplates = {
        ...mockTemplatePackage,
        tracker_templates: [
          { ...mockTrackerTemplates[1], display_order: 1 },
          { ...mockTrackerTemplates[0], display_order: 0 },
        ],
      };

      mockSupabaseClient.from.mockReturnValue(
        setupPackagesFetchMock([mockPackageWithUnsortedTemplates])
      );

      // Act
      const result = await service.findAllPackages();

      // Assert
      expect(result.data[0].trackers[0].name).toBe('Weight');
      expect(result.data[0].trackers[1].name).toBe('Sleep');
    });

    it('should throw InternalServerErrorException when database query fails', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue(
        setupPackagesFetchMock(null, { message: 'Database error' })
      );

      // Act & Assert
      await expect(service.findAllPackages()).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should return empty array when no active packages exist', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue(setupPackagesFetchMock([]));

      // Act
      const result = await service.findAllPackages();

      // Assert
      expect(result).toEqual({ data: [] });
    });

    it('should handle packages with null optional fields', async () => {
      // Arrange
      const mockPackageWithNulls = {
        id: mockPackageId,
        name: 'Basic Package',
        description: null,
        icon: null,
        display_order: 0,
        is_active: true,
        tracker_templates: [],
      };

      mockSupabaseClient.from.mockReturnValue(
        setupPackagesFetchMock([mockPackageWithNulls])
      );

      // Act
      const result = await service.findAllPackages();

      // Assert
      expect(result.data[0]).toEqual({
        id: mockPackageId,
        name: 'Basic Package',
        description: null,
        icon: null,
        display_order: 0,
        trackers: [],
      });
    });
  });

  describe('applyPackage', () => {
    it('should create trackers from package templates successfully', async () => {
      // Arrange
      const mockPackageWithTemplates = {
        id: mockPackageId,
        is_active: true,
        tracker_templates: mockTrackerTemplates,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'template_packages') {
          return setupSinglePackageFetchMock(mockPackageWithTemplates);
        }
        if (table === 'profiles') {
          return setupProfileMock({ trackers_limit: 10 });
        }
        if (table === 'trackers') {
          const countMock = setupTrackersCountMock(0);
          const insertMock = setupTrackersInsertMock([
            { id: 'tracker-1', name: 'Weight', data_type: 'number' },
            { id: 'tracker-2', name: 'Sleep', data_type: 'number' },
          ]);
          return {
            ...countMock,
            ...insertMock,
          };
        }
        return {};
      });

      // Act
      const result = await service.applyPackage(mockPackageId, mockUserId);

      // Assert
      expect(result).toEqual({
        message: 'Package applied successfully',
        created_trackers: [
          { id: 'tracker-1', name: 'Weight', data_type: 'number' },
          { id: 'tracker-2', name: 'Sleep', data_type: 'number' },
        ],
      });
    });

    it('should throw NotFoundException when package does not exist', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue(
        setupSinglePackageFetchMock(null, { message: 'Not found' })
      );

      // Act & Assert
      await expect(
        service.applyPackage(mockPackageId, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when package is inactive', async () => {
      // Arrange
      const inactivePackage = {
        id: mockPackageId,
        is_active: false,
        tracker_templates: [],
      };

      mockSupabaseClient.from.mockReturnValue(
        setupSinglePackageFetchMock(inactivePackage)
      );

      // Act & Assert
      await expect(
        service.applyPackage(mockPackageId, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when exceeding tracker limit', async () => {
      // Arrange
      const mockPackageWithTemplates = {
        id: mockPackageId,
        is_active: true,
        tracker_templates: mockTrackerTemplates, // 2 templates
      };

      let selectCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'template_packages') {
          return setupSinglePackageFetchMock(mockPackageWithTemplates);
        }
        if (table === 'profiles') {
          return setupProfileMock({ trackers_limit: 10 });
        }
        if (table === 'trackers') {
          // Create a custom mock that returns count correctly
          return {
            select: jest
              .fn()
              .mockImplementation((cols: string, options?: any) => {
                selectCallCount++;
                if (options?.count === 'exact') {
                  // This is the count query
                  return {
                    eq: jest.fn().mockReturnValue({
                      is: jest.fn().mockResolvedValue({
                        count: 9,
                        error: null,
                      }),
                    }),
                  };
                }
                return { eq: jest.fn() };
              }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return {};
      });

      // Act & Assert
      await expect(
        service.applyPackage(mockPackageId, mockUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw InternalServerErrorException when profile fetch fails', async () => {
      // Arrange
      const mockPackageWithTemplates = {
        id: mockPackageId,
        is_active: true,
        tracker_templates: mockTrackerTemplates,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'template_packages') {
          return setupSinglePackageFetchMock(mockPackageWithTemplates);
        }
        if (table === 'profiles') {
          return setupProfileMock(null, { message: 'Database error' });
        }
        return {};
      });

      // Act & Assert
      await expect(
        service.applyPackage(mockPackageId, mockUserId)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when tracker count fails', async () => {
      // Arrange
      const mockPackageWithTemplates = {
        id: mockPackageId,
        is_active: true,
        tracker_templates: mockTrackerTemplates,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'template_packages') {
          return setupSinglePackageFetchMock(mockPackageWithTemplates);
        }
        if (table === 'profiles') {
          return setupProfileMock({ trackers_limit: 10 });
        }
        if (table === 'trackers') {
          // Return error for count query
          return {
            select: jest
              .fn()
              .mockImplementation((cols: string, options?: any) => {
                if (options?.count === 'exact') {
                  return {
                    eq: jest.fn().mockReturnValue({
                      is: jest.fn().mockResolvedValue({
                        count: null,
                        error: { message: 'Count error' },
                      }),
                    }),
                  };
                }
                return { eq: jest.fn() };
              }),
            insert: jest.fn(),
          };
        }
        return {};
      });

      // Act & Assert
      await expect(
        service.applyPackage(mockPackageId, mockUserId)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when tracker insert fails', async () => {
      // Arrange
      const mockPackageWithTemplates = {
        id: mockPackageId,
        is_active: true,
        tracker_templates: mockTrackerTemplates,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'template_packages') {
          return setupSinglePackageFetchMock(mockPackageWithTemplates);
        }
        if (table === 'profiles') {
          return setupProfileMock({ trackers_limit: 10 });
        }
        if (table === 'trackers') {
          const countMock = setupTrackersCountMock(0);
          const insertMock = setupTrackersInsertMock(null, {
            message: 'Insert error',
          });
          return {
            ...countMock,
            ...insertMock,
          };
        }
        return {};
      });

      // Act & Assert
      await expect(
        service.applyPackage(mockPackageId, mockUserId)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should set correct display_order for new trackers', async () => {
      // Arrange
      const mockPackageWithTemplates = {
        id: mockPackageId,
        is_active: true,
        tracker_templates: mockTrackerTemplates,
      };

      const insertSpy = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [
            { id: 'tracker-1', name: 'Weight', data_type: 'number' },
            { id: 'tracker-2', name: 'Sleep', data_type: 'number' },
          ],
          error: null,
        }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'template_packages') {
          return setupSinglePackageFetchMock(mockPackageWithTemplates);
        }
        if (table === 'profiles') {
          return setupProfileMock({ trackers_limit: 10 });
        }
        if (table === 'trackers') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockResolvedValue({ count: 3, error: null }),
              }),
            }),
            insert: insertSpy,
          };
        }
        return {};
      });

      // Act
      await service.applyPackage(mockPackageId, mockUserId);

      // Assert
      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ display_order: 3 }),
          expect.objectContaining({ display_order: 4 }),
        ])
      );
    });

    it('should preserve template order when creating trackers', async () => {
      // Arrange
      const mockPackageWithTemplates = {
        id: mockPackageId,
        is_active: true,
        tracker_templates: [
          { ...mockTrackerTemplates[1], display_order: 1 }, // Sleep
          { ...mockTrackerTemplates[0], display_order: 0 }, // Weight
        ],
      };

      const insertSpy = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [
            { id: 'tracker-1', name: 'Weight', data_type: 'number' },
            { id: 'tracker-2', name: 'Sleep', data_type: 'number' },
          ],
          error: null,
        }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'template_packages') {
          return setupSinglePackageFetchMock(mockPackageWithTemplates);
        }
        if (table === 'profiles') {
          return setupProfileMock({ trackers_limit: 10 });
        }
        if (table === 'trackers') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockResolvedValue({ count: 0, error: null }),
              }),
            }),
            insert: insertSpy,
          };
        }
        return {};
      });

      // Act
      await service.applyPackage(mockPackageId, mockUserId);

      // Assert
      const insertedTrackers = insertSpy.mock.calls[0][0];
      expect(insertedTrackers[0].name).toBe('Weight'); // display_order 0 comes first
      expect(insertedTrackers[1].name).toBe('Sleep');
    });
  });
});
