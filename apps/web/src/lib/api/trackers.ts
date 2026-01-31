import type { CreateTrackerDto, TrackerDetailResponseDto } from '@shared/types';

// Direct URL to NestJS backend (CORS is configured in NestJS)
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3001';

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
}

// Export singleton instance
export const trackersApi = new TrackersApiClient();
