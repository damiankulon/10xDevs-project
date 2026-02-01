import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EntryQueryDto } from './dto/entry-query.dto';
import { TrackerParamDto, EntryParamsDto } from './dto/entry-params.dto';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';
import type { EntryResponseDto, EntryListResponseDto } from '@kipio/shared';

/**
 * Controller obsługujący endpointy dla wpisów (entries)
 * Wszystkie endpointy wymagają uwierzytelnienia JWT
 */
@Controller('trackers/:trackerId/entries')
@UseGuards(JwtAuthGuard)
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  /**
   * GET /api/trackers/:trackerId/entries
   * Pobiera listę wpisów dla trackera z paginacją i filtrowaniem
   *
   * @param params - Parametry ścieżki (trackerId)
   * @param query - Parametry zapytania (paginacja, sortowanie, filtry)
   * @param user - Uwierzytelniony użytkownik z tokena JWT
   * @returns Lista wpisów z informacją o paginacji
   * @throws UnauthorizedException jeśli token jest nieprawidłowy
   * @throws NotFoundException jeśli tracker nie istnieje
   * @throws ForbiddenException jeśli użytkownik nie ma dostępu do trackera
   */
  @Get()
  async findAll(
    @Param() params: TrackerParamDto,
    @Query() query: EntryQueryDto,
    @CurrentUser() user: AuthUser
  ): Promise<EntryListResponseDto> {
    return this.entriesService.findAll(params.trackerId, user.id, query);
  }

  /**
   * GET /api/trackers/:trackerId/entries/:entryId
   * Pobiera pojedynczy wpis
   *
   * @param params - Parametry ścieżki (trackerId, entryId)
   * @param user - Uwierzytelniony użytkownik z tokena JWT
   * @returns Dane wpisu
   * @throws UnauthorizedException jeśli token jest nieprawidłowy
   * @throws NotFoundException jeśli tracker lub wpis nie istnieje
   * @throws ForbiddenException jeśli użytkownik nie ma dostępu do trackera
   */
  @Get(':entryId')
  async findOne(
    @Param() params: EntryParamsDto,
    @CurrentUser() user: AuthUser
  ): Promise<EntryResponseDto> {
    return this.entriesService.findOne(
      params.trackerId,
      params.entryId,
      user.id
    );
  }

  /**
   * POST /api/trackers/:trackerId/entries
   * Tworzy nowy wpis dla trackera
   *
   * @param params - Parametry ścieżki (trackerId)
   * @param createEntryDto - Dane wpisu do utworzenia
   * @param user - Uwierzytelniony użytkownik z tokena JWT
   * @returns Utworzony wpis ze statusem 201
   * @throws UnauthorizedException jeśli token jest nieprawidłowy
   * @throws NotFoundException jeśli tracker nie istnieje
   * @throws ForbiddenException jeśli użytkownik nie ma praw zapisu do trackera
   * @throws UnprocessableEntityException jeśli wartość nie pasuje do typu danych
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param() params: TrackerParamDto,
    @Body() createEntryDto: CreateEntryDto,
    @CurrentUser() user: AuthUser
  ): Promise<EntryResponseDto> {
    return this.entriesService.create(
      params.trackerId,
      user.id,
      createEntryDto
    );
  }

  /**
   * PATCH /api/trackers/:trackerId/entries/:entryId
   * Aktualizuje istniejący wpis
   *
   * @param params - Parametry ścieżki (trackerId, entryId)
   * @param updateEntryDto - Dane do aktualizacji (opcjonalne pola)
   * @param user - Uwierzytelniony użytkownik z tokena JWT
   * @returns Zaktualizowany wpis
   * @throws UnauthorizedException jeśli token jest nieprawidłowy
   * @throws NotFoundException jeśli tracker lub wpis nie istnieje
   * @throws ForbiddenException jeśli użytkownik nie jest autorem wpisu
   * @throws UnprocessableEntityException jeśli nowa wartość nie pasuje do typu
   */
  @Patch(':entryId')
  async update(
    @Param() params: EntryParamsDto,
    @Body() updateEntryDto: UpdateEntryDto,
    @CurrentUser() user: AuthUser
  ): Promise<EntryResponseDto> {
    return this.entriesService.update(
      params.trackerId,
      params.entryId,
      user.id,
      updateEntryDto
    );
  }

  /**
   * DELETE /api/trackers/:trackerId/entries/:entryId
   * Usuwa wpis (soft delete)
   *
   * @param params - Parametry ścieżki (trackerId, entryId)
   * @param user - Uwierzytelniony użytkownik z tokena JWT
   * @returns Brak ciała odpowiedzi ze statusem 204
   * @throws UnauthorizedException jeśli token jest nieprawidłowy
   * @throws NotFoundException jeśli tracker lub wpis nie istnieje
   * @throws ForbiddenException jeśli użytkownik nie jest autorem wpisu
   */
  @Delete(':entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param() params: EntryParamsDto,
    @CurrentUser() user: AuthUser
  ): Promise<void> {
    return this.entriesService.remove(
      params.trackerId,
      params.entryId,
      user.id
    );
  }
}
