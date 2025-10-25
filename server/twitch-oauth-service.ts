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

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
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

  /**
   * Gets stream information for multiple user IDs
   * Returns only streams that are currently live
   */
  async getStreams(userIds: string[]): Promise<TwitchStream[]> {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    const appToken = await this.getAppAccessToken();

    // Twitch API allows up to 100 user IDs per request
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 100) {
      chunks.push(userIds.slice(i, i + 100));
    }

    const allStreams: TwitchStream[] = [];

    for (const chunk of chunks) {
      const params = chunk.map(id => `user_id=${encodeURIComponent(id)}`).join('&');
      const response = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch streams:', await response.text());
        continue;
      }

      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        allStreams.push(...data.data);
      }
    }

    return allStreams;
  }

  /**
   * Gets the latest clip for a Twitch user
   */
  async getLatestClip(username: string): Promise<{ url: string; title: string } | null> {
    try {
      const appToken = await this.getAppAccessToken();

      // First, get the user ID from username
      const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`, {
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
        },
      });

      if (!userResponse.ok) {
        console.error('Failed to fetch user for clips:', await userResponse.text());
        return null;
      }

      const userData = await userResponse.json();
      if (!userData.data || userData.data.length === 0) {
        return null;
      }

      const broadcasterId = userData.data[0].id;

      // Now get the clips for this broadcaster
      const clipsResponse = await fetch(
        `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}&first=1`,
        {
          headers: {
            'Authorization': `Bearer ${appToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          },
        }
      );

      if (!clipsResponse.ok) {
        console.error('Failed to fetch clips:', await clipsResponse.text());
        return null;
      }

      const clipsData = await clipsResponse.json();
      if (!clipsData.data || clipsData.data.length === 0) {
        return null;
      }

      const clip = clipsData.data[0];
      return {
        url: clip.url,
        title: clip.title,
      };
    } catch (error) {
      console.error('Error fetching clip:', error);
      return null;
    }
  }

  /**
   * Gets follower count for a Twitch user
   */
  async getFollowerCount(username: string): Promise<number> {
    try {
      const appToken = await this.getAppAccessToken();

      // Get user ID from username
      const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`, {
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
        },
      });

      if (!userResponse.ok) {
        return 0;
      }

      const userData = await userResponse.json();
      if (!userData.data || userData.data.length === 0) {
        return 0;
      }

      const broadcasterId = userData.data[0].id;

      // Get follower count
      const followersResponse = await fetch(
        `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=1`,
        {
          headers: {
            'Authorization': `Bearer ${appToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          },
        }
      );

      if (!followersResponse.ok) {
        return 0;
      }

      const followersData = await followersResponse.json();
      return followersData.total || 0;
    } catch (error) {
      console.error('Error fetching follower count:', error);
      return 0;
    }
  }

  /**
   * Checks if a user is currently live streaming
   */
  async getStreamStatus(username: string): Promise<{ isLive: boolean; viewerCount?: number; game?: string }> {
    try {
      const appToken = await this.getAppAccessToken();

      // Get user ID from username
      const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`, {
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
        },
      });

      if (!userResponse.ok) {
        return { isLive: false };
      }

      const userData = await userResponse.json();
      if (!userData.data || userData.data.length === 0) {
        return { isLive: false };
      }

      const userId = userData.data[0].id;

      // Check if user is live
      const streamResponse = await fetch(
        `https://api.twitch.tv/helix/streams?user_id=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${appToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
          },
        }
      );

      if (!streamResponse.ok) {
        return { isLive: false };
      }

      const streamData = await streamResponse.json();
      
      if (streamData.data && streamData.data.length > 0) {
        const stream = streamData.data[0];
        return {
          isLive: true,
          viewerCount: stream.viewer_count,
          game: stream.game_name,
        };
      }

      return { isLive: false };
    } catch (error) {
      console.error('Error checking stream status:', error);
      return { isLive: false };
    }
  }

  /**
   * Gets enhanced VIP information including profile picture, follower count, and live status
   */
  async getEnhancedUserInfo(username: string): Promise<{
    profileImageUrl: string | null;
    followerCount: number;
    isLive: boolean;
    viewerCount?: number;
    game?: string;
  }> {
    try {
      const appToken = await this.getAppAccessToken();

      // Get user info
      const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`, {
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
        },
      });

      if (!userResponse.ok) {
        return {
          profileImageUrl: null,
          followerCount: 0,
          isLive: false,
        };
      }

      const userData = await userResponse.json();
      if (!userData.data || userData.data.length === 0) {
        return {
          profileImageUrl: null,
          followerCount: 0,
          isLive: false,
        };
      }

      const user = userData.data[0];
      const userId = user.id;

      // Fetch follower count and stream status in parallel
      const [followerCount, streamStatus] = await Promise.all([
        this.getFollowerCount(username),
        this.getStreamStatus(username),
      ]);

      return {
        profileImageUrl: user.profile_image_url,
        followerCount,
        isLive: streamStatus.isLive,
        viewerCount: streamStatus.viewerCount,
        game: streamStatus.game,
      };
    } catch (error) {
      console.error('Error fetching enhanced user info:', error);
      return {
        profileImageUrl: null,
        followerCount: 0,
        isLive: false,
      };
    }
  }
}

export const twitchOAuthService = new TwitchOAuthService();
