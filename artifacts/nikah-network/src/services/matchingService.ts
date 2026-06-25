/**
 * Matching Service
 * Handles all API calls to matching endpoints
 */

import { getToken } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface Match {
  _id: string;
  userId: string;
  candidateId: string;
  score: number;
  breakdown: any;
  status: string;
  candidate?: any;
}

class MatchingService {
  /**
   * Generate matches for a user
   */
  async generateMatches(userId: string): Promise<{ generated: number; matches: Match[] }> {
    // Send gender from localStorage so backend can repair corrupted DB profile
    const storedUser = localStorage.getItem('user');
    const localUser = storedUser ? JSON.parse(storedUser) : null;
    const genderHint = (localUser?.gender === 'male' || localUser?.gender === 'female')
      ? localUser.gender
      : null;

    const response = await fetch(`${API_BASE}/api/matches/generate/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ genderHint }),
    });

    if (!response.ok) throw new Error('Failed to generate matches');
    return response.json();
  }

  /**
   * Get all matches for a user
   */
  async getMatches(userId: string): Promise<{ total: number; matches: Match[] }> {
    const response = await fetch(
      `${API_BASE}/api/matches?userId=${userId}&status=suggested`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch matches');
    return response.json();
  }

  /**
   * Get match details
   */
  async getMatchDetails(matchId: string): Promise<Match> {
    const response = await fetch(`${API_BASE}/api/matches/${matchId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch match');
    return response.json();
  }

  /**
   * Approve a match (staff)
   */
  async approveMatch(matchId: string): Promise<any> {
    const response = await fetch(
      `${API_BASE}/api/staff/matches/${matchId}/approve`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );

    if (!response.ok) throw new Error('Failed to approve match');
    return response.json();
  }

  /**
   * Reject a match (staff)
   */
  async rejectMatch(matchId: string, reason: string): Promise<any> {
    const response = await fetch(
      `${API_BASE}/api/staff/matches/${matchId}/reject`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ reason }),
      }
    );

    if (!response.ok) throw new Error('Failed to reject match');
    return response.json();
  }

  /**
   * Get hard filter debug info
   */
  async getDebugInfo(userId: string): Promise<any> {
    const response = await fetch(
      `${API_BASE}/api/staff/matches/debug/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch debug info');
    return response.json();
  }
}

export default new MatchingService();