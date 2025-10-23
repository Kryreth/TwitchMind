export interface TwitchTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  email?: string;
}

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || '';
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/twitch/callback`
  : 'http://localhost:5000/api/auth/twitch/callback';

export class TwitchOAuthService {
  /**
   * Generates the Twitch OAuth authorization URL
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'user:read:email chat:read chat:edit channel:manage:raids',
    });

    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<TwitchTokenResponse> {
    const params = new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    });

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    return await response.json();
  }

  /**
   * Fetches user information from Twitch API
   */
  async getTwitchUser(accessToken: string): Promise<TwitchUser> {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch Twitch user: ${error}`);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No user data returned from Twitch');
    }

    return data.data[0];
  }

  /**
   * Refreshes an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TwitchTokenResponse> {
    const params = new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh access token: ${error}`);
    }

    return await response.json();
  }

  /**
   * Validates an access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `OAuth ${accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if token is expired or about to expire (within 1 hour)
   */
  isTokenExpired(tokenExpiresAt: Date | null): boolean {
    if (!tokenExpiresAt) return true;
    
    const now = new Date();
    const expiresAt = new Date(tokenExpiresAt);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Return true if token expires within the next hour
    return expiresAt <= oneHourFromNow;
  }

  /**
   * Gets an app access token using client credentials flow
   * This token can be used for API calls that don't require user authentication
   */
  private appAccessToken: string | null = null;
  private appTokenExpiry: Date | null = null;

  async getAppAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.appAccessToken && this.appTokenExpiry && this.appTokenExpiry > new Date()) {
      return this.appAccessToken;
    }

    const params = new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    });

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get app access token: ${error}`);
    }

    const data = await response.json();
    this.appAccessToken = data.access_token || null;
    this.appTokenExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);
    
    if (!this.appAccessToken) {
      throw new Error('No access token received from Twitch');
    }
    
    return this.appAccessToken;
  }

  /**
   * Searches for Twitch users by username
   * Returns up to 20 results matching the query
   */
  async searchUsers(query: string): Promise<TwitchUser[]> {
    if (!query || query.length < 1) {
      return [];
    }

    const appToken = await this.getAppAccessToken();

    const response = await fetch(`https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}&first=20`, {
      headers: {
        'Authorization': `Bearer ${appToken}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to search Twitch users: ${error}`);
    }

    const data = await response.json();
    
    // Convert channel search results to user format
    return (data.data || []).map((channel: any) => ({
      id: channel.broadcaster_id,
      login: channel.broadcaster_login,
      display_name: channel.display_name,
      profile_image_url: channel.thumbnail_url,
    }));
  }

  /**
   * Initiates a raid to another broadcaster's channel
   * Requires channel:manage:raids scope
   */
  async startRaid(fromBroadcasterId: string, toBroadcasterId: string, accessToken: string): Promise<boolean> {
    const params = new URLSearchParams({
      from_broadcaster_id: fromBroadcasterId,
      to_broadcaster_id: toBroadcasterId,
    });

    const response = await fetch(`https://api.twitch.tv/helix/raids?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to start raid: ${error}`);
      return false;
    }

    return true;
  }

  /**
   * Gets user information by username
   */
  async getUserByUsername(username: string, accessToken?: string): Promise<TwitchUser | null> {
    const token = accessToken || await this.getAppAccessToken();

    const response = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const user = data.data?.[0];
    
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      login: user.login,
      display_name: user.display_name,
      profile_image_url: user.profile_image_url,
    };
  }
}

export const twitchOAuthService = new TwitchOAuthService();
