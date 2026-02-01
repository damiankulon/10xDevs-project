import type {
  CreateTrackerDto,
  TrackerDetailResponseDto,
  TrackerStatsResponseDto,
  TrackerStatsQueryDto,
  EntryListResponseDto,
  EntryListQueryDto,
  CreateEntryCommand,
  UpdateEntryCommand,
  EntryResponseDto,
  MessageResponseDto,
} from '@shared/types';

// Direct URL to NestJS backend (CORS is configured in NestJS)
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

class TrackersApiClient {
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'Wystąpił nieoczekiwany błąd',
        statusCode: response.status,
      }));
      throw new Error(error.message);
    }

    return response.json();
  }

  /**
   * Creates a new tracker
   * @param data - Tracker creation data
   * @returns Created tracker details
   * @throws Error with message from backend (401, 403, 400, 422)
   */
  async create(data: CreateTrackerDto): Promise<TrackerDetailResponseDto> {
    const response = await fetch(`${API_BASE_URL}/api/trackers`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<TrackerDetailResponseDto>(response);
  }

  /**
   * Gets tracker details by ID
   * @param trackerId - UUID of the tracker
   * @returns Tracker details with stats
   * @throws Error with message from backend (401, 403, 404)
   */
  async getById(trackerId: string): Promise<TrackerDetailResponseDto> {
    const response = await fetch(`${API_BASE_URL}/api/trackers/${trackerId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<TrackerDetailResponseDto>(response);
  }

  /**
   * Gets tracker statistics for specified period
   * @param trackerId - UUID of the tracker
   * @param query - Query parameters (period)
   * @returns Tracker statistics
   * @throws Error with message from backend (401, 403, 404)
   */
  async getStats(
    trackerId: string,
    query: TrackerStatsQueryDto
  ): Promise<TrackerStatsResponseDto> {
    const params = new URLSearchParams();
    if (query.period) {
      params.append('period', query.period);
    }

    const response = await fetch(
      `${API_BASE_URL}/api/trackers/${trackerId}/stats?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    );

    return this.handleResponse<TrackerStatsResponseDto>(response);
  }

  /**
   * Gets paginated list of entries for a tracker
   * @param trackerId - UUID of the tracker
   * @param query - Query parameters (pagination, sorting, filtering)
   * @returns Paginated list of entries
   * @throws Error with message from backend (401, 403, 404)
   */
  async getEntries(
    trackerId: string,
    query: EntryListQueryDto
  ): Promise<EntryListResponseDto> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.from) params.append('from', query.from);
    if (query.to) params.append('to', query.to);
    if (query.sort_order) params.append('sort_order', query.sort_order);

    const response = await fetch(
      `${API_BASE_URL}/api/trackers/${trackerId}/entries?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    );

    return this.handleResponse<EntryListResponseDto>(response);
  }

  /**
   * Creates a new entry for a tracker
   * @param trackerId - UUID of the tracker
   * @param data - Entry data
   * @returns Created entry
   * @throws Error with message from backend (401, 403, 404, 422)
   */
  async createEntry(
    trackerId: string,
    data: CreateEntryCommand
  ): Promise<EntryResponseDto> {
    const response = await fetch(
      `${API_BASE_URL}/api/trackers/${trackerId}/entries`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    return this.handleResponse<EntryResponseDto>(response);
  }

  /**
   * Updates an existing entry
   * @param trackerId - UUID of the tracker
   * @param entryId - UUID of the entry
   * @param data - Updated entry data
   * @returns Updated entry
   * @throws Error with message from backend (401, 403, 404, 422)
   */
  async updateEntry(
    trackerId: string,
    entryId: string,
    data: UpdateEntryCommand
  ): Promise<EntryResponseDto> {
    const response = await fetch(
      `${API_BASE_URL}/api/trackers/${trackerId}/entries/${entryId}`,
      {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    return this.handleResponse<EntryResponseDto>(response);
  }

  /**
   * Deletes an entry
   * @param trackerId - UUID of the tracker
   * @param entryId - UUID of the entry
   * @returns Success message
   * @throws Error with message from backend (401, 403, 404)
   */
  async deleteEntry(
    trackerId: string,
    entryId: string
  ): Promise<MessageResponseDto> {
    const response = await fetch(
      `${API_BASE_URL}/api/trackers/${trackerId}/entries/${entryId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }
    );

    return this.handleResponse<MessageResponseDto>(response);
  }
}

// Export singleton instance
export const trackersApi = new TrackersApiClient();
