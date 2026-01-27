import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTrackerDto, ScaleConfigDto } from './create-tracker.dto';

describe('CreateTrackerDto', () => {
  const validDto = {
    name: 'Energy Level',
    data_type: 'scale' as const,
    config: { min: 1, max: 10 },
    color: '#4CAF50',
    icon: 'battery',
    display_order: 2,
  };

  describe('name validation', () => {
    it('should pass with valid name', async () => {
      const dto = plainToInstance(CreateTrackerDto, validDto);
      const errors = await validate(dto);
      const nameErrors = errors.filter((e) => e.property === 'name');
      expect(nameErrors).toHaveLength(0);
    });

    it('should fail when name is empty', async () => {
      const dto = plainToInstance(CreateTrackerDto, { ...validDto, name: '' });
      const errors = await validate(dto);
      const nameErrors = errors.filter((e) => e.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });

    it('should fail when name exceeds 100 characters', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        name: 'a'.repeat(101),
      });
      const errors = await validate(dto);
      const nameErrors = errors.filter((e) => e.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });

    it('should fail when name is missing', async () => {
      const { name, ...dtoWithoutName } = validDto;
      const dto = plainToInstance(CreateTrackerDto, dtoWithoutName);
      const errors = await validate(dto);
      const nameErrors = errors.filter((e) => e.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });
  });

  describe('data_type validation', () => {
    it('should pass with valid data_type "number"', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        data_type: 'number',
        config: undefined,
      });
      const errors = await validate(dto);
      const typeErrors = errors.filter((e) => e.property === 'data_type');
      expect(typeErrors).toHaveLength(0);
    });

    it('should pass with valid data_type "scale"', async () => {
      const dto = plainToInstance(CreateTrackerDto, validDto);
      const errors = await validate(dto);
      const typeErrors = errors.filter((e) => e.property === 'data_type');
      expect(typeErrors).toHaveLength(0);
    });

    it('should pass with valid data_type "boolean"', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        data_type: 'boolean',
        config: undefined,
      });
      const errors = await validate(dto);
      const typeErrors = errors.filter((e) => e.property === 'data_type');
      expect(typeErrors).toHaveLength(0);
    });

    it('should pass with valid data_type "text"', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        data_type: 'text',
        config: undefined,
      });
      const errors = await validate(dto);
      const typeErrors = errors.filter((e) => e.property === 'data_type');
      expect(typeErrors).toHaveLength(0);
    });

    it('should fail with invalid data_type', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        data_type: 'invalid',
      });
      const errors = await validate(dto);
      const typeErrors = errors.filter((e) => e.property === 'data_type');
      expect(typeErrors.length).toBeGreaterThan(0);
    });

    it('should fail when data_type is missing', async () => {
      const { data_type, ...dtoWithoutType } = validDto;
      const dto = plainToInstance(CreateTrackerDto, dtoWithoutType);
      const errors = await validate(dto);
      const typeErrors = errors.filter((e) => e.property === 'data_type');
      expect(typeErrors.length).toBeGreaterThan(0);
    });
  });

  describe('unit validation', () => {
    it('should pass with valid unit', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        data_type: 'number',
        unit: 'kg',
        config: undefined,
      });
      const errors = await validate(dto);
      const unitErrors = errors.filter((e) => e.property === 'unit');
      expect(unitErrors).toHaveLength(0);
    });

    it('should pass without unit (optional)', async () => {
      const dtoWithoutUnit = { ...validDto };
      delete (dtoWithoutUnit as any).unit;
      const dto = plainToInstance(CreateTrackerDto, dtoWithoutUnit);
      const errors = await validate(dto);
      const unitErrors = errors.filter((e) => e.property === 'unit');
      expect(unitErrors).toHaveLength(0);
    });

    it('should fail when unit exceeds 20 characters', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        data_type: 'number',
        unit: 'a'.repeat(21),
        config: undefined,
      });
      const errors = await validate(dto);
      const unitErrors = errors.filter((e) => e.property === 'unit');
      expect(unitErrors.length).toBeGreaterThan(0);
    });
  });

  describe('color validation', () => {
    it('should pass with valid hex color', async () => {
      const dto = plainToInstance(CreateTrackerDto, validDto);
      const errors = await validate(dto);
      const colorErrors = errors.filter((e) => e.property === 'color');
      expect(colorErrors).toHaveLength(0);
    });

    it('should pass without color (optional)', async () => {
      const { color, ...dtoWithoutColor } = validDto;
      const dto = plainToInstance(CreateTrackerDto, dtoWithoutColor);
      const errors = await validate(dto);
      const colorErrors = errors.filter((e) => e.property === 'color');
      expect(colorErrors).toHaveLength(0);
    });

    it('should pass with lowercase hex color', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        color: '#abcdef',
      });
      const errors = await validate(dto);
      const colorErrors = errors.filter((e) => e.property === 'color');
      expect(colorErrors).toHaveLength(0);
    });

    it('should fail with invalid hex color format', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        color: 'red',
      });
      const errors = await validate(dto);
      const colorErrors = errors.filter((e) => e.property === 'color');
      expect(colorErrors.length).toBeGreaterThan(0);
    });

    it('should fail with 3-digit hex color', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        color: '#FFF',
      });
      const errors = await validate(dto);
      const colorErrors = errors.filter((e) => e.property === 'color');
      expect(colorErrors.length).toBeGreaterThan(0);
    });

    it('should fail with hex color without #', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        color: '4CAF50',
      });
      const errors = await validate(dto);
      const colorErrors = errors.filter((e) => e.property === 'color');
      expect(colorErrors.length).toBeGreaterThan(0);
    });
  });

  describe('icon validation', () => {
    it('should pass with valid icon', async () => {
      const dto = plainToInstance(CreateTrackerDto, validDto);
      const errors = await validate(dto);
      const iconErrors = errors.filter((e) => e.property === 'icon');
      expect(iconErrors).toHaveLength(0);
    });

    it('should pass without icon (optional)', async () => {
      const { icon, ...dtoWithoutIcon } = validDto;
      const dto = plainToInstance(CreateTrackerDto, dtoWithoutIcon);
      const errors = await validate(dto);
      const iconErrors = errors.filter((e) => e.property === 'icon');
      expect(iconErrors).toHaveLength(0);
    });

    it('should fail when icon exceeds 50 characters', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        icon: 'a'.repeat(51),
      });
      const errors = await validate(dto);
      const iconErrors = errors.filter((e) => e.property === 'icon');
      expect(iconErrors.length).toBeGreaterThan(0);
    });
  });

  describe('display_order validation', () => {
    it('should pass with valid display_order', async () => {
      const dto = plainToInstance(CreateTrackerDto, validDto);
      const errors = await validate(dto);
      const orderErrors = errors.filter((e) => e.property === 'display_order');
      expect(orderErrors).toHaveLength(0);
    });

    it('should pass without display_order (optional)', async () => {
      const { display_order, ...dtoWithoutOrder } = validDto;
      const dto = plainToInstance(CreateTrackerDto, dtoWithoutOrder);
      const errors = await validate(dto);
      const orderErrors = errors.filter((e) => e.property === 'display_order');
      expect(orderErrors).toHaveLength(0);
    });

    it('should pass with display_order of 0', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        display_order: 0,
      });
      const errors = await validate(dto);
      const orderErrors = errors.filter((e) => e.property === 'display_order');
      expect(orderErrors).toHaveLength(0);
    });

    it('should fail with non-integer display_order', async () => {
      const dto = plainToInstance(CreateTrackerDto, {
        ...validDto,
        display_order: 1.5,
      });
      const errors = await validate(dto);
      const orderErrors = errors.filter((e) => e.property === 'display_order');
      expect(orderErrors.length).toBeGreaterThan(0);
    });
  });

  describe('full dto validation', () => {
    it('should pass with minimal valid dto', async () => {
      const minimalDto = plainToInstance(CreateTrackerDto, {
        name: 'Test Tracker',
        data_type: 'boolean',
      });
      const errors = await validate(minimalDto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with full valid dto', async () => {
      const fullDto = plainToInstance(CreateTrackerDto, validDto);
      const errors = await validate(fullDto);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('ScaleConfigDto', () => {
  it('should pass with valid min and max', async () => {
    const dto = plainToInstance(ScaleConfigDto, { min: 1, max: 10 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with negative values', async () => {
    const dto = plainToInstance(ScaleConfigDto, { min: -10, max: 10 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with zero values', async () => {
    const dto = plainToInstance(ScaleConfigDto, { min: 0, max: 100 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
