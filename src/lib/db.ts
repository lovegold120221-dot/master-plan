import Dexie, { Table } from 'dexie';
import { Message } from '../types';

export class NexusDatabase extends Dexie {
  messages!: Table<Message>;

  constructor() {
    super('NexusDB');
    this.version(1).stores({
      messages: 'id, timestamp, type, agentId'
    });
  }

  async saveMessage(message: Message) {
    await this.messages.put(message);
  }

  async getRecentMessages(limit = 20): Promise<Message[]> {
    return await this.messages
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray()
      .then(msgs => msgs.reverse());
  }

  async clearHistory() {
    await this.messages.clear();
  }
}

export const db = new NexusDatabase();
