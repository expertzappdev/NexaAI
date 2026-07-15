import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';

class SignalrService {
  private connection: HubConnection | null = null;
  private token: string | null = null;

  // Connection status changed callback
  private onConnectionChangeCallback: ((connected: boolean) => void) | null = null;

  public async connect(
    token: string,
    onReceiveMessage: (payload: { role: string; content: string; createdAt: string; model?: string; totalTokens?: number }) => void,
    onReceiveMessageChunk: (payload: {
      conversationId: number;
      content: string;
      isFirst: boolean;
      isLast: boolean;
      messageId?: number;
      model?: string;
      totalTokens?: number;
    }) => void,
    onTypingStarted: () => void,
    onTypingStopped: () => void,
    onErrorMessage: (error: string) => void,
    onConnectionChange: (connected: boolean) => void,
    onSearchStatus?: (status: string) => void
  ): Promise<void> {
    if (this.connection) {
      if (this.connection.state === HubConnectionState.Connected) {
        if (this.token === token) {
          // Already connected with the same token
          return;
        } else {
          // Token changed, disconnect first
          await this.disconnect();
        }
      }
    }

    this.token = token;
    this.onConnectionChangeCallback = onConnectionChange;

    const hubUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000/chatHub'
      : 'https://nexaai-b751.onrender.com/chatHub';

    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    // Set up listeners
    this.connection.on('ReceiveMessage', (payload) => {
      onReceiveMessage(payload);
    });

    this.connection.on('ReceiveMessageChunk', (payload) => {
      onReceiveMessageChunk(payload);
    });

    this.connection.on('TypingStarted', () => {
      onTypingStarted();
    });

    this.connection.on('TypingStopped', () => {
      onTypingStopped();
    });

    this.connection.on('ErrorMessage', (errorMsg) => {
      onErrorMessage(errorMsg);
    });

    this.connection.on('SearchStatus', (status) => {
      if (onSearchStatus) {
        onSearchStatus(status);
      }
    });

    this.connection.onreconnecting((error) => {
      console.warn('SignalR reconnecting due to error:', error);
      if (this.onConnectionChangeCallback) this.onConnectionChangeCallback(false);
    });

    this.connection.onreconnected(() => {
      console.log('SignalR reconnected successfully.');
      if (this.onConnectionChangeCallback) this.onConnectionChangeCallback(true);
    });

    this.connection.onclose((error) => {
      console.error('SignalR connection closed:', error);
      if (this.onConnectionChangeCallback) this.onConnectionChangeCallback(false);
    });

    try {
      await this.connection.start();
      console.log('SignalR connection established.');
      if (this.onConnectionChangeCallback) this.onConnectionChangeCallback(true);
    } catch (err) {
      console.error('Error establishing SignalR connection:', err);
      if (this.onConnectionChangeCallback) this.onConnectionChangeCallback(false);
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log('SignalR connection stopped.');
      } catch (err) {
        console.error('Error stopping SignalR connection:', err);
      } finally {
        this.connection = null;
        this.token = null;
        this.onConnectionChangeCallback = null;
      }
    }
  }

  public async sendMessage(conversationId: number, message: string, model: string): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error('Cannot send message. SignalR is not connected.');
    }
    await this.connection.invoke('SendMessage', conversationId, message, model);
  }

  public isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }
}

const signalrService = new SignalrService();
export default signalrService;
export { signalrService as socketService };
