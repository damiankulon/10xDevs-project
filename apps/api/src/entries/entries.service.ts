import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService, Tables } from '../supabase';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EntryQueryDto } from './dto/entry-query.dto';
import type {
  EntryResponseDto,
  EntryListResponseDto,
  EntryValue,
} from '@kipio/shared';

type Entry = Tables<'entries'>;
type Tracker = Tables<'trackers'>;

@Injectable()
export class EntriesService {
  private readonly logger = new Logger(EntriesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Pobiera listę wpisów dla trackera z paginacją i filtrowaniem
   *
   * @param trackerId - UUID trackera
   * @param userId - ID zalogowanego użytkownika
   * @param query - Parametry paginacji i filtrowania
   * @returns Lista wpisów z informacją o paginacji
   * @throws NotFoundException jeśli tracker nie istnieje
   * @throws ForbiddenException jeśli użytkownik nie ma dostępu do trackera
   */
  async findAll(
    trackerId: string,
    userId: string,
    query: EntryQueryDto
  ): Promise<EntryListResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    // Walidacja dostępu do trackera
    const tracker = await this.validateTrackerAccess(trackerId, userId, 'read');

    const { page = 1, limit = 50, sort_order = 'desc', from, to } = query;
    const offset = (page - 1) * limit;

    // Budowanie zapytania
    let queryBuilder = supabase
      .from('entries')
      .select('*', { count: 'exact' })
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .order('recorded_at', { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    if (from) {
      queryBuilder = queryBuilder.gte('recorded_at', from);
    }
    if (to) {
      queryBuilder = queryBuilder.lte('recorded_at', to);
    }

    const { data: entries, count, error } = await queryBuilder;

    if (error) {
      this.logger.error('Failed to fetch entries', { trackerId, error });
      throw new InternalServerErrorException('Failed to fetch entries');
    }

    const totalItems = count ?? 0;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: (entries || []).map((entry) =>
        this.toResponseDto(entry, tracker.data_type)
      ),
      pagination: {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
  }

  /**
   * Pobiera pojedynczy wpis
   *
   * @param trackerId - UUID trackera
   * @param entryId - UUID wpisu
   * @param userId - ID zalogowanego użytkownika
   * @returns Dane wpisu
   * @throws NotFoundException jeśli tracker lub wpis nie istnieje
   * @throws ForbiddenException jeśli użytkownik nie ma dostępu do trackera
   */
  async findOne(
    trackerId: string,
    entryId: string,
    userId: string
  ): Promise<EntryResponseDto> {
    const tracker = await this.validateTrackerAccess(trackerId, userId, 'read');
    const entry = await this.getEntry(trackerId, entryId);
    return this.toResponseDto(entry, tracker.data_type);
  }

  /**
   * Tworzy nowy wpis
   *
   * @param trackerId - UUID trackera
   * @param userId - ID zalogowanego użytkownika
   * @param dto - Dane wpisu do utworzenia
   * @returns Utworzony wpis
   * @throws NotFoundException jeśli tracker nie istnieje
   * @throws ForbiddenException jeśli użytkownik nie ma praw zapisu do trackera
   * @throws UnprocessableEntityException jeśli wartość nie pasuje do typu danych trackera
   */
  async create(
    trackerId: string,
    userId: string,
    dto: CreateEntryDto
  ): Promise<EntryResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    const tracker = await this.validateTrackerAccess(
      trackerId,
      userId,
      'write'
    );
    this.validateValueType(dto.value, tracker.data_type, tracker.config);

    const entryData = {
      tracker_id: trackerId,
      user_id: userId,
      ...this.mapValueToColumns(dto.value, tracker.data_type),
      recorded_at: dto.recorded_at ?? new Date().toISOString(),
    };

    const { data: entry, error } = await supabase
      .from('entries')
      .insert(entryData as never)
      .select()
      .single<Entry>();

    if (error) {
      this.logger.error('Failed to create entry', { trackerId, userId, error });
      throw new InternalServerErrorException('Failed to create entry');
    }

    this.logger.log(`Entry ${entry.id} created for tracker ${trackerId}`);
    return this.toResponseDto(entry, tracker.data_type);
  }

  /**
   * Aktualizuje istniejący wpis
   *
   * @param trackerId - UUID trackera
   * @param entryId - UUID wpisu
   * @param userId - ID zalogowanego użytkownika
   * @param dto - Dane do aktualizacji
   * @returns Zaktualizowany wpis
   * @throws NotFoundException jeśli tracker lub wpis nie istnieje
   * @throws ForbiddenException jeśli użytkownik nie jest autorem wpisu
   * @throws UnprocessableEntityException jeśli nowa wartość nie pasuje do typu danych
   */
  async update(
    trackerId: string,
    entryId: string,
    userId: string,
    dto: UpdateEntryDto
  ): Promise<EntryResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    const tracker = await this.validateTrackerAccess(trackerId, userId, 'read');
    const entry = await this.getEntry(trackerId, entryId);

    // Tylko autor może edytować wpis
    if (entry.user_id !== userId) {
      throw new ForbiddenException('Only entry author can modify this entry');
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.value !== undefined) {
      this.validateValueType(dto.value, tracker.data_type, tracker.config);
      Object.assign(
        updateData,
        this.mapValueToColumns(dto.value, tracker.data_type)
      );
    }

    if (dto.recorded_at !== undefined) {
      updateData.recorded_at = dto.recorded_at;
    }

    const { data: updatedEntry, error } = await supabase
      .from('entries')
      .update(updateData as never)
      .eq('id', entryId)
      .select()
      .single<Entry>();

    if (error) {
      this.logger.error('Failed to update entry', { entryId, error });
      throw new InternalServerErrorException('Failed to update entry');
    }

    this.logger.log(`Entry ${entryId} updated`);
    return this.toResponseDto(updatedEntry, tracker.data_type);
  }

  /**
   * Usuwa wpis (soft delete)
   *
   * @param trackerId - UUID trackera
   * @param entryId - UUID wpisu
   * @param userId - ID zalogowanego użytkownika
   * @throws NotFoundException jeśli tracker lub wpis nie istnieje
   * @throws ForbiddenException jeśli użytkownik nie jest autorem wpisu
   */
  async remove(
    trackerId: string,
    entryId: string,
    userId: string
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    await this.validateTrackerAccess(trackerId, userId, 'read');
    const entry = await this.getEntry(trackerId, entryId);

    // Tylko autor może usunąć wpis
    if (entry.user_id !== userId) {
      throw new ForbiddenException('Only entry author can delete this entry');
    }

    const { error } = await supabase
      .from('entries')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', entryId);

    if (error) {
      this.logger.error('Failed to delete entry', { entryId, error });
      throw new InternalServerErrorException('Failed to delete entry');
    }

    this.logger.log(`Entry ${entryId} deleted (soft)`);
  }

  // ===== Metody prywatne =====

  /**
   * Waliduje dostęp użytkownika do trackera
   *
   * @param trackerId - UUID trackera
   * @param userId - ID użytkownika
   * @param permission - Wymagany poziom dostępu ('read' | 'write')
   * @returns Dane trackera
   * @throws NotFoundException jeśli tracker nie istnieje lub został usunięty
   * @throws ForbiddenException jeśli użytkownik nie ma wymaganego dostępu
   */
  private async validateTrackerAccess(
    trackerId: string,
    userId: string,
    permission: 'read' | 'write'
  ): Promise<Tracker> {
    const supabase = this.supabaseService.getAdminClient();

    // Pobierz tracker
    const { data: tracker, error } = await supabase
      .from('trackers')
      .select('*')
      .eq('id', trackerId)
      .is('deleted_at', null)
      .single<Tracker>();

    if (error || !tracker) {
      throw new NotFoundException('Tracker not found');
    }

    // Właściciel ma pełny dostęp
    if (tracker.user_id === userId) {
      return tracker;
    }

    // Sprawdź współdzielenie
    const { data: share } = await supabase
      .from('tracker_shares')
      .select('permission')
      .eq('tracker_id', trackerId)
      .eq('shared_with_user_id', userId)
      .maybeSingle<{ permission: 'read' | 'write' }>();

    if (!share) {
      throw new ForbiddenException('Access denied to this tracker');
    }

    if (permission === 'write' && share.permission !== 'write') {
      throw new ForbiddenException('Write access denied to this tracker');
    }

    return tracker;
  }

  /**
   * Pobiera wpis po ID
   *
   * @param trackerId - UUID trackera (dla dodatkowej walidacji)
   * @param entryId - UUID wpisu
   * @returns Dane wpisu
   * @throws NotFoundException jeśli wpis nie istnieje lub został usunięty
   */
  private async getEntry(trackerId: string, entryId: string): Promise<Entry> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: entry, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .single<Entry>();

    if (error || !entry) {
      throw new NotFoundException('Entry not found');
    }

    return entry;
  }

  /**
   * Waliduje zgodność wartości z typem danych trackera
   *
   * @param value - Wartość do walidacji
   * @param dataType - Typ danych trackera
   * @param config - Konfiguracja trackera (dla typu 'scale')
   * @throws UnprocessableEntityException jeśli wartość nie pasuje do typu lub zakresu
   */
  private validateValueType(
    value: EntryValue,
    dataType: string,
    config: unknown
  ): void {
    switch (dataType) {
      case 'number':
        if (typeof value !== 'number') {
          throw new UnprocessableEntityException(
            `Value type does not match tracker data_type 'number'. Expected number`
          );
        }
        break;

      case 'scale':
        if (typeof value !== 'number') {
          throw new UnprocessableEntityException(
            `Value type does not match tracker data_type 'scale'. Expected number`
          );
        }
        const scaleConfig = config as { min?: number; max?: number } | null;
        if (scaleConfig?.min !== undefined && value < scaleConfig.min) {
          throw new UnprocessableEntityException(
            `Value must be at least ${scaleConfig.min}`
          );
        }
        if (scaleConfig?.max !== undefined && value > scaleConfig.max) {
          throw new UnprocessableEntityException(
            `Value must be at most ${scaleConfig.max}`
          );
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new UnprocessableEntityException(
            `Value type does not match tracker data_type 'boolean'. Expected boolean`
          );
        }
        break;

      case 'text':
        if (typeof value !== 'string') {
          throw new UnprocessableEntityException(
            `Value type does not match tracker data_type 'text'. Expected string`
          );
        }
        break;

      default:
        throw new UnprocessableEntityException(
          `Unknown data_type: ${dataType}`
        );
    }
  }

  /**
   * Mapuje wartość na odpowiednie kolumny bazy danych
   *
   * @param value - Wartość wpisu
   * @param dataType - Typ danych trackera
   * @returns Obiekt z odpowiednimi kolumnami ustawionymi
   */
  private mapValueToColumns(
    value: EntryValue,
    dataType: string
  ): Partial<Entry> {
    const columns: Partial<Entry> = {
      value_number: null,
      value_boolean: null,
      value_text: null,
    };

    switch (dataType) {
      case 'number':
      case 'scale':
        columns.value_number = value as number;
        break;
      case 'boolean':
        columns.value_boolean = value as boolean;
        break;
      case 'text':
        columns.value_text = value as string;
        break;
    }

    return columns;
  }

  /**
   * Konwertuje encję z bazy danych na DTO odpowiedzi
   *
   * @param entry - Encja wpisu z bazy danych
   * @param dataType - Typ danych trackera
   * @returns DTO odpowiedzi z znormalizowaną wartością
   */
  private toResponseDto(entry: Entry, dataType: string): EntryResponseDto {
    let value: EntryValue;

    switch (dataType) {
      case 'number':
      case 'scale':
        value = entry.value_number ?? 0;
        break;
      case 'boolean':
        value = entry.value_boolean ?? false;
        break;
      case 'text':
        value = entry.value_text ?? '';
        break;
      default:
        value =
          entry.value_number ?? entry.value_boolean ?? entry.value_text ?? '';
    }

    return {
      id: entry.id,
      tracker_id: entry.tracker_id,
      user_id: entry.user_id,
      value,
      recorded_at: entry.recorded_at,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    };
  }
}
